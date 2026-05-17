// Smoke test (Task 17.2): the Sales page and Sales components must read
// canonical snake_case keys only. Legacy camelCase identifiers from the
// pre-overhaul payment shape have no place in this surface anymore.
//
// Forbidden identifiers (Requirement 13.4):
//   clientName, bookingId, bookingDatetime, createdAt, stripePaymentId
//
// Scope:
//   - src/app/dashboard/salon/[salonId]/sales/page.js
//   - src/components/sales/*.jsx
//
// Strategy: read each file with `fs.readFile`, scan with a word-boundary
// regex, fail with file-and-line context. This is a grep step rather than
// a full ESLint rule because it runs in the same Vitest harness as the
// rest of the suite and stays trivially understandable.
//
// Validates: Requirements 13.4

import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const FORBIDDEN = [
  'clientName',
  'bookingId',
  'bookingDatetime',
  'createdAt',
  'stripePaymentId',
];

// Word-boundary alternation. \b in JS regex treats letters/digits/underscore
// as word chars, so `created_at` will NOT match `createdAt` and vice versa
// — exactly what we want.
const FORBIDDEN_RE = new RegExp('\\b(' + FORBIDDEN.join('|') + ')\\b', 'g');

const SALES_PAGE = path.resolve(
  'src/app/dashboard/salon/[salonId]/sales/page.js',
);
const SALES_COMPONENTS_DIR = path.resolve('src/components/sales');

async function listSalesComponentFiles() {
  const entries = await fs.readdir(SALES_COMPONENTS_DIR, {
    withFileTypes: true,
  });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.jsx'))
    .map((e) => path.join(SALES_COMPONENTS_DIR, e.name))
    .sort();
}

/**
 * Scan a file's text for forbidden identifiers and return a list of
 * `{ identifier, line, snippet }` hits. Empty array means clean.
 */
function findHits(text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Reset lastIndex per line (regex has /g flag).
    FORBIDDEN_RE.lastIndex = 0;
    let m;
    while ((m = FORBIDDEN_RE.exec(line)) !== null) {
      hits.push({
        identifier: m[1],
        line: i + 1,
        snippet: line.trim(),
      });
    }
  }
  return hits;
}

function formatHits(filePath, hits) {
  return hits
    .map(
      (h) =>
        `  ${path.relative(process.cwd(), filePath)}:${h.line}  [${h.identifier}]  ${h.snippet}`,
    )
    .join('\n');
}

describe('sales surface camelCase guard', () => {
  it('Sales_Page does not reference legacy camelCase payment keys', async () => {
    const text = await fs.readFile(SALES_PAGE, 'utf8');
    const hits = findHits(text);
    expect(
      hits,
      'Forbidden legacy camelCase identifiers found in sales/page.js. ' +
        'Read canonical snake_case keys (client_name, booking_id, booking_datetime, created_at, stripe_payment_intent_id) instead.\n' +
        formatHits(SALES_PAGE, hits),
    ).toEqual([]);
  });

  it('Sales components do not reference legacy camelCase payment keys', async () => {
    const files = await listSalesComponentFiles();
    expect(files.length).toBeGreaterThan(0);

    const offenders = [];
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      const hits = findHits(text);
      if (hits.length > 0) {
        offenders.push({ file, hits });
      }
    }

    const message =
      offenders.length === 0
        ? ''
        : 'Forbidden legacy camelCase identifiers found in sales components. ' +
          'Read canonical snake_case keys (client_name, booking_id, booking_datetime, created_at, stripe_payment_intent_id) instead.\n' +
          offenders
            .map((o) => formatHits(o.file, o.hits))
            .join('\n');

    expect(offenders, message).toEqual([]);
  });
});
