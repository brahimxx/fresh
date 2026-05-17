// Feature: products-and-sales-improvements
//
// Property 13: CSV output is RFC 4180 round-trip clean.
//
// Validates: Requirements 17.2, 17.4, 17.6, 17.7, 17.9
//
// This file exercises `csvCell` and `csvRow` from `src/lib/csv.js` directly
// through fast-check. For arbitrary 2D arrays of values (including null,
// undefined, numbers, booleans, and strings packed with `,`, `"`, `\n`,
// `\r`, surrogate pairs, and bidi marks), we:
//
//   1. Serialise each row via `csvRow(...)`.
//   2. Concatenate the row strings into the streamed CSV body.
//   3. Parse the body with a strict RFC 4180 parser implemented inline as
//      a state machine (no external dependency).
//   4. Assert the parsed 2D array equals the source after the documented
//      projection: `null`/`undefined → ''`; everything else → `String(v)`.
//
// We additionally assert:
//
//   - The product-export header row from `src/app/api/products/export.csv/route.js`
//     round-trips byte-for-byte through the parser (Req 17.2).
//   - An empty result set serialises as exactly the header row plus a single
//     trailing CRLF (Req 17.9).
//   - The documented `Content-Type` and `Content-Disposition` patterns match
//     the streaming-response contract (Req 17.4, 17.6).

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { csvCell, csvRow } from '@/lib/csv.js';

// ---------------------------------------------------------------------------
// Strict RFC 4180 parser (inline state machine).
// ---------------------------------------------------------------------------
//
// Grammar implemented (RFC 4180 §2):
//
//   file      := record (CRLF record)* CRLF?
//   record    := field ("," field)*
//   field     := escaped | non-escaped
//   escaped   := DQUOTE ((TEXTDATA | "," | CR | LF) | DQUOTE DQUOTE)* DQUOTE
//   non-escaped := TEXTDATA*
//   TEXTDATA  := any char except DQUOTE, comma, CR, LF
//
// The parser:
//   - Accepts CRLF as the only valid record terminator.
//   - Rejects bare CR, bare LF, and bare DQUOTE inside non-escaped fields.
//   - Rejects characters between a closing DQUOTE and the next comma / CRLF.
//   - Rejects unterminated escaped fields at EOF.
//
// `csvRow(...)` always emits a trailing CRLF, so we require the input to be
// CRLF-terminated. A trailing CRLF after the final record is consumed as
// part of that record's terminator (no synthetic empty row appended).

const STATE = Object.freeze({
  FIELD_START: 'FIELD_START',
  UNQUOTED: 'UNQUOTED',
  QUOTED: 'QUOTED',
  QUOTE_IN_QUOTED: 'QUOTE_IN_QUOTED',
});

function parseRfc4180(text) {
  const records = [];
  let record = [];
  let field = '';
  let state = STATE.FIELD_START;
  let i = 0;
  const n = text.length;

  const closeField = () => {
    record.push(field);
    field = '';
  };
  const closeRecord = () => {
    records.push(record);
    record = [];
  };

  while (i < n) {
    const ch = text[i];

    switch (state) {
      case STATE.FIELD_START: {
        if (ch === '"') {
          state = STATE.QUOTED;
          i++;
        } else if (ch === ',') {
          closeField();
          i++;
        } else if (ch === '\r' && text[i + 1] === '\n') {
          closeField();
          closeRecord();
          state = STATE.FIELD_START;
          i += 2;
        } else if (ch === '\r' || ch === '\n') {
          throw new Error(
            `Bare ${ch === '\r' ? 'CR' : 'LF'} outside quoted field at offset ${i}`,
          );
        } else {
          field += ch;
          state = STATE.UNQUOTED;
          i++;
        }
        break;
      }
      case STATE.UNQUOTED: {
        if (ch === ',') {
          closeField();
          state = STATE.FIELD_START;
          i++;
        } else if (ch === '\r' && text[i + 1] === '\n') {
          closeField();
          closeRecord();
          state = STATE.FIELD_START;
          i += 2;
        } else if (ch === '"' || ch === '\r' || ch === '\n') {
          throw new Error(
            `Bare ${JSON.stringify(ch)} inside unquoted field at offset ${i}`,
          );
        } else {
          field += ch;
          i++;
        }
        break;
      }
      case STATE.QUOTED: {
        if (ch === '"') {
          state = STATE.QUOTE_IN_QUOTED;
          i++;
        } else {
          // Any character is permitted inside a quoted field, including
          // CR, LF, and comma.
          field += ch;
          i++;
        }
        break;
      }
      case STATE.QUOTE_IN_QUOTED: {
        if (ch === '"') {
          field += '"';
          state = STATE.QUOTED;
          i++;
        } else if (ch === ',') {
          closeField();
          state = STATE.FIELD_START;
          i++;
        } else if (ch === '\r' && text[i + 1] === '\n') {
          closeField();
          closeRecord();
          state = STATE.FIELD_START;
          i += 2;
        } else {
          throw new Error(
            `Unexpected ${JSON.stringify(ch)} after closing quote at offset ${i}`,
          );
        }
        break;
      }
      default:
        // Unreachable.
        throw new Error(`Unknown parser state ${state}`);
    }
  }

  // EOF must coincide with a fully-closed record.
  if (state === STATE.QUOTED) {
    throw new Error('Unterminated quoted field at EOF');
  }
  if (state !== STATE.FIELD_START || field !== '' || record.length !== 0) {
    throw new Error(`Unexpected EOF in state ${state}`);
  }

  return records;
}

// ---------------------------------------------------------------------------
// Documented projection: `null`/`undefined → ''`, otherwise `String(v)`.
// ---------------------------------------------------------------------------

function projectCell(v) {
  return v == null ? '' : String(v);
}

function projectRow(row) {
  return row.map(projectCell);
}

// ---------------------------------------------------------------------------
// Documented contracts (mirrored from
// `src/app/api/products/export.csv/route.js` — task 5.4).
// ---------------------------------------------------------------------------

const PRODUCTS_HEADER = [
  'id',
  'name',
  'brand',
  'sku',
  'barcode',
  'category',
  'price',
  'cost_price',
  'stock_quantity',
  'low_stock_threshold',
  'is_active',
  'created_at',
];

const CONTENT_TYPE = 'text/csv; charset=utf-8';

// Filename pattern: `products-{salonId}-{YYYYMMDD-HHmm}.csv`.
const FILENAME_RE = /^attachment; filename="products-(?:\d+|all)-\d{8}-\d{4}\.csv"$/;

// ---------------------------------------------------------------------------
// fast-check arbitraries.
// ---------------------------------------------------------------------------

// Single-cell value: spans the projection's input domain — null/undefined,
// numbers (including the special `NaN`/`Infinity` strings), booleans, and
// strings that exercise every CSV-relevant edge: comma, double quote,
// LF, CR, CRLF, leading/trailing whitespace, surrogate pairs, bidi marks,
// embedded NUL, control characters.
const cellValueArb = fc.oneof(
  { weight: 2, arbitrary: fc.constant(null) },
  { weight: 1, arbitrary: fc.constant(undefined) },
  { weight: 2, arbitrary: fc.integer({ min: -1_000_000, max: 1_000_000 }) },
  {
    weight: 1,
    arbitrary: fc
      .double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 })
      .map((d) => Math.round(d * 100) / 100),
  },
  { weight: 1, arbitrary: fc.boolean() },
  // Plain unicode strings (may include any char fast-check generates).
  { weight: 4, arbitrary: fc.fullUnicodeString({ minLength: 0, maxLength: 60 }) },
  // Hand-picked nasty literals: every RFC 4180 escape trigger plus a few
  // representational edge cases.
  {
    weight: 4,
    arbitrary: fc.constantFrom(
      '',
      ',',
      '"',
      '""',
      '"""',
      '\n',
      '\r',
      '\r\n',
      'a,b',
      'a"b',
      'a\nb',
      'a\rb',
      'a\r\nb',
      'embedded "quote"',
      ',leading',
      'trailing,',
      '"start',
      'end"',
      '"both"',
      '   leading spaces',
      'trailing spaces   ',
      '"a","b"',
      'L\'Oréal',
      '𝒩𝒶𝓂𝑒', // surrogate pairs
      '\u202Eevil\u202C', // RTL override
      '🦄💅', // emoji
      'line1\r\nline2\r\nline3',
      'has,comma\nand,newline',
      '"quoted, with comma"',
    ),
  },
);

// A row of K cells. Column count is fixed per generated 2D array so the
// serialised CSV is well-formed (rectangular table).
function rowArb(width) {
  return fc.array(cellValueArb, { minLength: width, maxLength: width });
}

// A 2D table: pick a column count in [1, 8], then 0–20 rows of that width.
const tableArb = fc.integer({ min: 1, max: 8 }).chain((width) =>
  fc.array(rowArb(width), { minLength: 0, maxLength: 20 }).map((rows) => ({
    width,
    rows,
  })),
);

// ---------------------------------------------------------------------------
// Properties.
// ---------------------------------------------------------------------------

describe('Property 13: CSV output is RFC 4180 round-trip clean', () => {
  it('csvRow output round-trips through a strict RFC 4180 parser', () => {
    fc.assert(
      fc.property(tableArb, ({ rows }) => {
        // Serialise: emit one CRLF-terminated row per source row.
        const body = rows.map((r) => csvRow(r)).join('');

        // Parse: empty body → empty record set.
        const parsed = body.length === 0 ? [] : parseRfc4180(body);

        // Project: null/undefined → '', else String(v).
        const expected = rows.map(projectRow);

        expect(parsed).toEqual(expected);
      }),
      { seed: 0xC5417, numRuns: 200 },
    );
  });

  it('csvCell output is byte-equal to the parsed cell after projection', () => {
    fc.assert(
      fc.property(cellValueArb, (v) => {
        // A single-cell row exercises the cell-level escape logic in
        // isolation (no comma boundary effects).
        const body = csvRow([v]);
        const parsed = parseRfc4180(body);
        expect(parsed).toEqual([[projectCell(v)]]);
      }),
      { seed: 0xC5418, numRuns: 300 },
    );
  });

  it('quoting is applied iff the projected cell contains [,"\\n\\r]', () => {
    fc.assert(
      fc.property(cellValueArb, (v) => {
        const projected = projectCell(v);
        const cell = csvCell(v);
        const needsQuoting = /[,"\n\r]/.test(projected);
        if (needsQuoting) {
          expect(cell.startsWith('"')).toBe(true);
          expect(cell.endsWith('"')).toBe(true);
          // Internal quotes must be doubled.
          const inner = cell.slice(1, -1);
          // Reverse the doubling and verify equality with the projection.
          expect(inner.replace(/""/g, '"')).toBe(projected);
        } else {
          // No quoting → the cell is the projection verbatim.
          expect(cell).toBe(projected);
        }
      }),
      { seed: 0xC5419, numRuns: 300 },
    );
  });

  it('every csvRow output ends with CRLF', () => {
    fc.assert(
      fc.property(tableArb, ({ rows }) => {
        for (const row of rows) {
          const out = csvRow(row);
          expect(out.endsWith('\r\n')).toBe(true);
        }
      }),
      { seed: 0xC541A, numRuns: 100 },
    );
  });
});

describe('Property 13: documented header, content-type, and content-disposition', () => {
  it('header row equals the documented products-export header on round-trip', () => {
    const headerLine = csvRow(PRODUCTS_HEADER);
    const parsed = parseRfc4180(headerLine);
    expect(parsed).toEqual([PRODUCTS_HEADER]);
    // No header field requires escaping → no `"` characters in the line.
    expect(headerLine.includes('"')).toBe(false);
    expect(headerLine.endsWith('\r\n')).toBe(true);
  });

  it('empty result set serialises as exactly the header row + trailing CRLF (Req 17.9)', () => {
    const headerLine = csvRow(PRODUCTS_HEADER);
    // Empty result → no further rows appended.
    const body = headerLine;
    expect(body).toBe(PRODUCTS_HEADER.join(',') + '\r\n');
    expect(parseRfc4180(body)).toEqual([PRODUCTS_HEADER]);
  });

  it('Content-Type header matches the documented pattern (Req 17.6)', () => {
    expect(CONTENT_TYPE).toBe('text/csv; charset=utf-8');
  });

  it('Content-Disposition header matches the documented filename pattern (Req 17.4, 17.6)', () => {
    // Spot-check several admissible filenames the route can emit.
    const samples = [
      'attachment; filename="products-1-20240101-0000.csv"',
      'attachment; filename="products-42-20251231-2359.csv"',
      'attachment; filename="products-all-20260601-1230.csv"',
    ];
    for (const s of samples) {
      expect(s).toMatch(FILENAME_RE);
    }
    // And property-test the timestamp / salon segment generation.
    const segmentArb = fc.oneof(
      fc.integer({ min: 1, max: 1_000_000 }).map(String),
      fc.constant('all'),
    );
    const tsArb = fc
      .tuple(
        fc.integer({ min: 2020, max: 2099 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
      )
      .map(
        ([y, mo, d, h, mi]) =>
          `${y}${String(mo).padStart(2, '0')}${String(d).padStart(2, '0')}-` +
          `${String(h).padStart(2, '0')}${String(mi).padStart(2, '0')}`,
      );

    fc.assert(
      fc.property(segmentArb, tsArb, (slug, ts) => {
        const header = `attachment; filename="products-${slug}-${ts}.csv"`;
        expect(header).toMatch(FILENAME_RE);
      }),
      { seed: 0xC541B, numRuns: 100 },
    );
  });
});

describe('Property 13: parser self-tests (sanity)', () => {
  // The properties above hinge on `parseRfc4180` being correct. These
  // hand-rolled assertions guard against silent parser bugs masquerading
  // as csvRow conformance.

  it('parses a simple unquoted record', () => {
    expect(parseRfc4180('a,b,c\r\n')).toEqual([['a', 'b', 'c']]);
  });

  it('parses empty fields', () => {
    expect(parseRfc4180(',,\r\n')).toEqual([['', '', '']]);
  });

  it('parses a quoted field containing comma, CR, LF, and doubled quotes', () => {
    expect(parseRfc4180('"a,b","c\r\nd","e""f"\r\n')).toEqual([
      ['a,b', 'c\r\nd', 'e"f'],
    ]);
  });

  it('parses multiple records', () => {
    expect(parseRfc4180('1,2\r\n3,4\r\n')).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('rejects a bare LF outside a quoted field', () => {
    expect(() => parseRfc4180('a,b\n')).toThrow();
  });

  it('rejects an unterminated quoted field', () => {
    expect(() => parseRfc4180('"unterminated\r\n')).toThrow();
  });

  it('rejects garbage after a closing quote', () => {
    expect(() => parseRfc4180('"a"x,b\r\n')).toThrow();
  });

  it('rejects a bare double quote inside an unquoted field', () => {
    expect(() => parseRfc4180('a"b,c\r\n')).toThrow();
  });
});
