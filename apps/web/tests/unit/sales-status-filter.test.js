/**
 * Unit test for the Sales page status filter dropdown.
 *
 * Verifies:
 *   - Exactly five status options are declared in the documented order.
 *   - Labels match the documented values: All, Pending, Paid, Refunded, Partially refunded.
 *   - The status filter state defaults to "all".
 *
 * Approach:
 *   The Sales page is a Next.js client component that pulls in heavy
 *   dependencies (TanStack Query, framer-motion, Recharts, etc.). Rather than
 *   import and render it, we parse the source file as text and extract the
 *   `STATUS_OPTIONS` array literal plus the `useState` initializer for the
 *   status filter. This keeps the test fast, deterministic, and free of the
 *   jsdom / provider boilerplate that a render-based test would require.
 *
 * Validates: Requirements 12.3, 12.8
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SALES_PAGE_PATH = resolve(
  __dirname,
  '..',
  '..',
  'src',
  'app',
  'dashboard',
  'salon',
  '[salonId]',
  'sales',
  'page.js',
);

const SOURCE = readFileSync(SALES_PAGE_PATH, 'utf8');

/**
 * Extract `{ value: '...', label: '...' }` pairs from the STATUS_OPTIONS
 * array literal. The regex accepts either single or double quotes for the
 * value/label strings and tolerates whitespace / trailing commas, so it stays
 * robust against minor formatting changes.
 */
function extractStatusOptions(source) {
  const arrayMatch = source.match(/STATUS_OPTIONS\s*=\s*\[([\s\S]*?)\]\s*;/);
  if (!arrayMatch) {
    throw new Error('STATUS_OPTIONS declaration not found in sales page source');
  }
  const body = arrayMatch[1];
  const entryRe =
    /\{\s*value\s*:\s*['"]([^'"]+)['"]\s*,\s*label\s*:\s*['"]([^'"]+)['"]\s*,?\s*\}/g;
  const out = [];
  let m;
  while ((m = entryRe.exec(body)) !== null) {
    out.push({ value: m[1], label: m[2] });
  }
  return out;
}

describe('Sales page status filter (Req 12.3, 12.8)', () => {
  const options = extractStatusOptions(SOURCE);

  it('declares exactly five status options', () => {
    expect(options).toHaveLength(5);
  });

  it('lists the documented labels in order: All, Pending, Paid, Refunded, Partially refunded', () => {
    const labels = options.map((o) => o.label);
    expect(labels).toEqual([
      'All',
      'Pending',
      'Paid',
      'Refunded',
      'Partially refunded',
    ]);
  });

  it('maps the four real-status options to the canonical server enum values', () => {
    const values = options.map((o) => o.value);
    expect(values).toEqual([
      'all',
      'pending',
      'paid',
      'refunded',
      'partially_refunded',
    ]);
  });

  it('initialises the statusFilter useState hook to "all"', () => {
    // Match either `var`, `let`, or `const` and either single or double quotes.
    const initRe =
      /(?:var|let|const)\s*\[\s*statusFilter\s*,\s*setStatusFilter\s*\]\s*=\s*useState\(\s*['"]([^'"]+)['"]\s*\)/;
    const m = SOURCE.match(initRe);
    expect(m, 'expected a useState initializer for statusFilter').not.toBeNull();
    expect(m[1]).toBe('all');
  });
});
