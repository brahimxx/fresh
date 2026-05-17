/**
 * Unit tests for `src/lib/csv.js` (RFC 4180 helpers).
 *
 * Covers the cases enumerated in task 2.4:
 *   - null/undefined values
 *   - plain strings (no special characters)
 *   - strings containing comma
 *   - strings containing newline (LF and CR)
 *   - strings with embedded double quotes
 *
 * Validates: Requirements 17.7
 */

import { describe, it, expect } from 'vitest';
import { csvCell, csvRow } from '@/lib/csv';

describe('csvCell', () => {
  describe('null and undefined', () => {
    it('returns empty string for null', () => {
      expect(csvCell(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(csvCell(undefined)).toBe('');
    });

    it('returns empty string when called with no arguments', () => {
      expect(csvCell()).toBe('');
    });
  });

  describe('plain strings (no special characters)', () => {
    it('passes through ASCII letters and digits unquoted', () => {
      expect(csvCell('hello')).toBe('hello');
      expect(csvCell('Product 123')).toBe('Product 123');
      expect(csvCell('SKU-ABC_001')).toBe('SKU-ABC_001');
    });

    it('passes through the empty string unchanged', () => {
      expect(csvCell('')).toBe('');
    });

    it('passes through unicode characters unquoted when no special chars', () => {
      expect(csvCell('café')).toBe('café');
      expect(csvCell('日本語')).toBe('日本語');
    });
  });

  describe('non-string scalars', () => {
    it('coerces numbers to their string form unquoted', () => {
      expect(csvCell(42)).toBe('42');
      expect(csvCell(3.14)).toBe('3.14');
      expect(csvCell(0)).toBe('0');
    });

    it('coerces booleans to their string form unquoted', () => {
      expect(csvCell(true)).toBe('true');
      expect(csvCell(false)).toBe('false');
    });
  });

  describe('strings containing a comma', () => {
    it('wraps the value in double quotes', () => {
      expect(csvCell('a,b')).toBe('"a,b"');
    });

    it('wraps a comma-only string in quotes', () => {
      expect(csvCell(',')).toBe('","');
    });

    it('wraps a string with multiple commas in quotes', () => {
      expect(csvCell('one, two, three')).toBe('"one, two, three"');
    });
  });

  describe('strings containing a newline', () => {
    it('wraps a value containing LF in double quotes', () => {
      expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    });

    it('wraps a value containing CR in double quotes', () => {
      expect(csvCell('line1\rline2')).toBe('"line1\rline2"');
    });

    it('wraps a value containing CRLF in double quotes', () => {
      expect(csvCell('line1\r\nline2')).toBe('"line1\r\nline2"');
    });
  });

  describe('strings with embedded double quotes', () => {
    it('doubles a single embedded quote and wraps in quotes', () => {
      expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    });

    it('doubles every embedded quote', () => {
      expect(csvCell('""')).toBe('""""""');
    });

    it('doubles a leading quote', () => {
      expect(csvCell('"leading')).toBe('"""leading"');
    });

    it('doubles a trailing quote', () => {
      expect(csvCell('trailing"')).toBe('"trailing"""');
    });
  });

  describe('combinations of special characters', () => {
    it('handles a value containing comma, newline, and quote together', () => {
      expect(csvCell('a, "b"\nc')).toBe('"a, ""b""\nc"');
    });
  });
});

describe('csvRow', () => {
  it('joins plain values with commas and terminates with CRLF', () => {
    expect(csvRow(['a', 'b', 'c'])).toBe('a,b,c\r\n');
  });

  it('serialises null and undefined as empty cells', () => {
    expect(csvRow([null, 'x', undefined])).toBe(',x,\r\n');
  });

  it('quotes only the cells that need quoting', () => {
    expect(csvRow(['plain', 'has,comma', 'has"quote'])).toBe(
      'plain,"has,comma","has""quote"\r\n'
    );
  });

  it('returns just CRLF for an empty row', () => {
    expect(csvRow([])).toBe('\r\n');
  });

  it('preserves value order', () => {
    expect(csvRow([1, 2, 3])).toBe('1,2,3\r\n');
  });

  it('handles mixed types and special characters in one row', () => {
    const row = csvRow([
      1,
      'name, with comma',
      null,
      'line1\nline2',
      'has "quote"',
    ]);
    expect(row).toBe('1,"name, with comma",,"line1\nline2","has ""quote"""\r\n');
  });
});
