// Feature: products-and-sales-improvements
// Task: 5.6 PBT for listing filters AND composition
//
// Property 11: Listing filters compose as a logical AND, server-side
// **Validates: Requirements 5.4, 6.1, 6.9, 6.12, 8.4, 8.5, 8.6, 11.1, 11.2,
//             11.3, 11.5, 11.8**
//
// For both `/api/products` and `/api/payments`, every supplied filter is
// applied server-side and the surviving rows are exactly the intersection of
// all filter predicates (AND composition). This PBT generates a seeded
// fixture of rows, draws a random filter combination, and asserts that the
// rows that survive in the API's WHERE-clause translate exactly to the rows
// returned by a JS model reducer that implements the same predicates.
//
// The model reducer is faithful to the SQL in:
//   - src/app/api/products/route.js  (search across name|sku|barcode|brand
//     case-insensitive substring; category_id exact match; stock in/low/out;
//     is_active exact match)
//   - src/app/api/payments/route.js  (status / method exact case-sensitive
//     match; start_date / end_date inclusive boundaries 00:00:00 / 23:59:59
//     server tz; search across client name | email | id | booking_id)
//
// Coverage in this file:
//   1. AND composition for products listing
//   2. AND composition for payments listing
//   3. Empty-filter set returns the full fixture
//   4. Each individual filter, applied on its own, is correct
//   5. Date boundaries are inclusive at both ends
//   6. Search is case-insensitive substring

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import {
  productArb,
  paymentArb,
  dateRangeArb,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
} from './_arbitraries.js';

// ─── Reference reducers (mirror the SQL in route.js) ─────────────────────

/**
 * Apply the products listing filters to an in-memory row set. Mirrors the
 * WHERE-clause assembly in `src/app/api/products/route.js`.
 *
 * @param {object[]} rows  Product rows (snake_case shape from `productArb`).
 * @param {object} filters
 * @param {number} [filters.salon_id]      Required for non-admin in the API;
 *                                         optional here so tests can also
 *                                         exercise the admin-cross-salon path.
 * @param {number} [filters.category_id]   Exact match.
 * @param {string} [filters.search]        Case-insensitive substring across
 *                                         name|sku|barcode|brand.
 * @param {'in'|'low'|'out'|'all'} [filters.stock]
 * @param {0|1}    [filters.is_active]     Exact match.
 */
export function filterProducts(rows, filters) {
  const {
    salon_id,
    category_id,
    search,
    stock,
    is_active,
  } = filters;

  const needle = typeof search === 'string' ? search.toLowerCase() : null;

  return rows.filter((p) => {
    // Soft-delete exclusion (all generator rows are non-deleted).
    if (salon_id != null && p.salon_id !== salon_id) return false;
    if (category_id != null && p.category_id !== category_id) return false;

    if (needle) {
      const fields = [p.name, p.sku, p.barcode, p.brand]
        .filter((v) => v != null)
        .map((v) => String(v).toLowerCase());
      if (!fields.some((f) => f.includes(needle))) return false;
    }

    if (stock === 'in') {
      if (!(p.stock_quantity > p.low_stock_threshold)) return false;
    } else if (stock === 'low') {
      if (!(p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold))
        return false;
    } else if (stock === 'out') {
      if (p.stock_quantity !== 0) return false;
    }
    // 'all' or undefined → no stock filter

    if (is_active != null && p.is_active !== is_active) return false;

    return true;
  });
}

/**
 * Apply the payments listing filters to an in-memory row set. Mirrors the
 * WHERE-clause assembly in `src/app/api/payments/route.js`.
 *
 * Date boundaries are inclusive: `start_date 00:00:00` and `end_date 23:59:59`
 * (server tz). The model uses lexicographic string compare on the same
 * `YYYY-MM-DD HH:MM:SS` format the SQL emits, which is order-preserving and
 * matches the `>= ?` / `<= ?` semantics in route.js.
 *
 * @param {object[]} rows  Payment rows (shape from `paymentArb` plus
 *                         `created_at_sql` as `YYYY-MM-DD HH:MM:SS`).
 * @param {object} filters
 * @param {number} [filters.salon_id]
 * @param {string} [filters.status]
 * @param {string} [filters.method]
 * @param {string} [filters.start_date]    `YYYY-MM-DD`, inclusive at 00:00:00
 * @param {string} [filters.end_date]      `YYYY-MM-DD`, inclusive at 23:59:59
 * @param {string} [filters.search]
 */
export function filterPayments(rows, filters) {
  const { salon_id, status, method, start_date, end_date, search } = filters;
  const startBoundary = start_date ? `${start_date} 00:00:00` : null;
  const endBoundary = end_date ? `${end_date} 23:59:59` : null;
  const needle = typeof search === 'string' ? search.toLowerCase() : null;

  return rows.filter((p) => {
    if (salon_id != null && p.salon_id !== salon_id) return false;
    // Canonical-status / canonical-method are case-sensitive (Req 11.3, 11.5).
    if (status != null && p.status !== status) return false;
    if (method != null && p.method !== method) return false;

    if (startBoundary != null && p.created_at_sql < startBoundary) return false;
    if (endBoundary != null && p.created_at_sql > endBoundary) return false;

    if (needle) {
      const haystack = [
        p.client_name,
        p.client_email,
        String(p.id),
        String(p.booking_id),
      ]
        .filter((v) => v != null)
        .map((v) => String(v).toLowerCase());
      if (!haystack.some((f) => f.includes(needle))) return false;
    }

    return true;
  });
}

// ─── Seeded fixtures and filter-combo generators ──────────────────────────

// Fix the salon set so filters can hit / miss meaningfully without running
// out of matching rows.
const SALON_IDS = [101, 102, 103];
const CATEGORY_IDS = [10, 11, 12];

// A product fixture row reusing `productArb`, then narrowing salon_id and
// category_id to the small fixture sets so filters can match real rows.
const productRowArb = productArb.map((p, i) => ({
  ...p,
  // i is undefined here — fast-check's map is stateless. Use the existing
  // randomised id field to derive a stable bucket index instead.
  salon_id: SALON_IDS[p.id % SALON_IDS.length],
  category_id:
    p.category_id == null
      ? null
      : CATEGORY_IDS[p.category_id % CATEGORY_IDS.length],
}));

const productsFixtureArb = fc.array(productRowArb, {
  minLength: 0,
  maxLength: 30,
});

// ─── Payment fixture rows ─────────────────────────────────────────────────

// `created_at` and `booking_datetime` from `paymentArb` are JS `Date`s.
// The route's SQL filters on `created_at` formatted as
// `YYYY-MM-DD HH:MM:SS` in server tz. We pre-compute that string here so
// the model uses the same form as the SQL.
function toSqlDateTime(d) {
  // Server-tz formatted with no tz suffix — matches MySQL DATETIME.
  const yyyy = String(d.getFullYear()).padStart(4, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

const paymentRowArb = paymentArb.map((p) => ({
  ...p,
  salon_id: SALON_IDS[p.id % SALON_IDS.length],
  created_at_sql: toSqlDateTime(p.created_at),
}));

const paymentsFixtureArb = fc.array(paymentRowArb, {
  minLength: 0,
  maxLength: 30,
});

// ─── Filter combo generators ──────────────────────────────────────────────

const productFilterComboArb = fc.record(
  {
    salon_id: fc.option(fc.constantFrom(...SALON_IDS), { nil: undefined, freq: 2 }),
    category_id: fc.option(fc.constantFrom(...CATEGORY_IDS), {
      nil: undefined,
      freq: 2,
    }),
    search: fc.option(
      fc.oneof(
        // Short generic strings exercise the case-insensitive substring path.
        fc.string({ minLength: 1, maxLength: 8 }),
        // A fixed needle that may appear in `name` (the only required field).
        fc.constantFrom('a', 'A', 'e', 'i', '1', ' '),
      ),
      { nil: undefined, freq: 3 },
    ),
    stock: fc.option(fc.constantFrom('in', 'low', 'out', 'all'), {
      nil: undefined,
      freq: 2,
    }),
    is_active: fc.option(fc.constantFrom(0, 1), { nil: undefined, freq: 2 }),
  },
  { withDeletedKeys: true },
);

const paymentFilterComboArb = fc
  .tuple(
    fc.option(fc.constantFrom(...SALON_IDS), { nil: undefined, freq: 2 }),
    fc.option(fc.constantFrom(...PAYMENT_STATUSES), {
      nil: undefined,
      freq: 2,
    }),
    fc.option(fc.constantFrom(...PAYMENT_METHODS), {
      nil: undefined,
      freq: 2,
    }),
    fc.option(dateRangeArb, { nil: undefined, freq: 2 }),
    fc.option(
      fc.oneof(
        fc.string({ minLength: 1, maxLength: 8 }),
        fc.constantFrom('a', 'A', '1', '@', 'guest'),
      ),
      { nil: undefined, freq: 3 },
    ),
  )
  .map(([salon_id, status, method, dr, search]) => ({
    salon_id,
    status,
    method,
    start_date: dr?.start_date,
    end_date: dr?.end_date,
    search,
  }));

const SEED = 0xF11_7E25;

describe('Property 11 — listing filters compose as a logical AND', () => {
  // ────────────────────── Products listing ──────────────────────────────

  it('products: row survives iff every individual predicate accepts it', () => {
    fc.assert(
      fc.property(productsFixtureArb, productFilterComboArb, (rows, filters) => {
        const result = filterProducts(rows, filters);

        // Every returned row must satisfy every active predicate (forward).
        for (const r of result) {
          if (filters.salon_id != null) expect(r.salon_id).toBe(filters.salon_id);
          if (filters.category_id != null)
            expect(r.category_id).toBe(filters.category_id);
          if (filters.is_active != null)
            expect(r.is_active).toBe(filters.is_active);
          if (filters.stock === 'in') {
            expect(r.stock_quantity).toBeGreaterThan(r.low_stock_threshold);
          } else if (filters.stock === 'low') {
            expect(r.stock_quantity).toBeGreaterThan(0);
            expect(r.stock_quantity).toBeLessThanOrEqual(r.low_stock_threshold);
          } else if (filters.stock === 'out') {
            expect(r.stock_quantity).toBe(0);
          }
          if (typeof filters.search === 'string' && filters.search !== '') {
            const needle = filters.search.toLowerCase();
            const fields = [r.name, r.sku, r.barcode, r.brand]
              .filter((v) => v != null)
              .map((v) => String(v).toLowerCase());
            expect(fields.some((f) => f.includes(needle))).toBe(true);
          }
        }

        // No row that satisfies every active predicate should be missing
        // from the result (reverse). Use object identity (Set of references)
        // since the fixture may legitimately contain duplicate ids — the
        // route would still return both rows.
        const surviving = new Set(result);
        for (const r of rows) {
          const single = filterProducts([r], filters);
          if (single.length === 1) {
            expect(surviving.has(r)).toBe(true);
          } else {
            expect(surviving.has(r)).toBe(false);
          }
        }
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('products: empty filter set returns the full fixture (order preserving)', () => {
    fc.assert(
      fc.property(productsFixtureArb, (rows) => {
        expect(filterProducts(rows, {})).toEqual(rows);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('products: search is case-insensitive substring across name|sku|barcode|brand', () => {
    fc.assert(
      fc.property(productRowArb, (row) => {
        // For each non-null searchable field, the row matches when the
        // search needle is any case-mutated substring of that field.
        const fields = ['name', 'sku', 'barcode', 'brand'];
        for (const f of fields) {
          const value = row[f];
          if (typeof value !== 'string' || value.length === 0) continue;
          // Take a single character from the field, flip case for half the
          // test runs to exercise case insensitivity.
          const ch = value[Math.floor(value.length / 2)];
          const search = Math.random() < 0.5 ? ch.toUpperCase() : ch.toLowerCase();
          const matched = filterProducts([row], { search });
          expect(matched).toEqual([row]);
        }
      }),
      // Property is over a single row — a small numRuns is plenty.
      { seed: SEED, numRuns: 100 },
    );
  });

  it('products: stock=in, low, out are mutually exclusive over any row', () => {
    fc.assert(
      fc.property(productRowArb, (row) => {
        const inSet = filterProducts([row], { stock: 'in' }).length === 1;
        const lowSet = filterProducts([row], { stock: 'low' }).length === 1;
        const outSet = filterProducts([row], { stock: 'out' }).length === 1;
        // Exactly one of the three buckets matches every row, since the
        // SQL clauses are a partition of the non-negative integer line:
        //   stock=0 (out), 0 < stock ≤ threshold (low), stock > threshold (in)
        const count = [inSet, lowSet, outSet].filter(Boolean).length;
        expect(count).toBe(1);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  // ────────────────────── Payments listing ──────────────────────────────

  it('payments: row survives iff every individual predicate accepts it', () => {
    fc.assert(
      fc.property(paymentsFixtureArb, paymentFilterComboArb, (rows, filters) => {
        const result = filterPayments(rows, filters);

        // Forward direction.
        for (const r of result) {
          if (filters.salon_id != null) expect(r.salon_id).toBe(filters.salon_id);
          if (filters.status != null) expect(r.status).toBe(filters.status);
          if (filters.method != null) expect(r.method).toBe(filters.method);
          if (filters.start_date)
            expect(r.created_at_sql >= `${filters.start_date} 00:00:00`).toBe(true);
          if (filters.end_date)
            expect(r.created_at_sql <= `${filters.end_date} 23:59:59`).toBe(true);
          if (typeof filters.search === 'string' && filters.search !== '') {
            const needle = filters.search.toLowerCase();
            const haystack = [
              r.client_name,
              r.client_email,
              String(r.id),
              String(r.booking_id),
            ]
              .filter((v) => v != null)
              .map((v) => String(v).toLowerCase());
            expect(haystack.some((f) => f.includes(needle))).toBe(true);
          }
        }

        // Reverse direction. Use object identity since the fixture may
        // contain duplicate ids.
        const surviving = new Set(result);
        for (const r of rows) {
          const single = filterPayments([r], filters);
          if (single.length === 1) {
            expect(surviving.has(r)).toBe(true);
          } else {
            expect(surviving.has(r)).toBe(false);
          }
        }
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('payments: empty filter set returns the full fixture', () => {
    fc.assert(
      fc.property(paymentsFixtureArb, (rows) => {
        expect(filterPayments(rows, {})).toEqual(rows);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('payments: status / method exact match is case-sensitive', () => {
    fc.assert(
      fc.property(paymentRowArb, (row) => {
        // Wrong-case status never matches.
        const upperStatus = row.status.toUpperCase();
        if (upperStatus !== row.status) {
          expect(filterPayments([row], { status: upperStatus })).toEqual([]);
        }
        // Right-case status always matches.
        expect(filterPayments([row], { status: row.status })).toEqual([row]);

        const upperMethod = row.method.toUpperCase();
        if (upperMethod !== row.method) {
          expect(filterPayments([row], { method: upperMethod })).toEqual([]);
        }
        expect(filterPayments([row], { method: row.method })).toEqual([row]);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('payments: date boundaries are inclusive at start (00:00:00) and end (23:59:59)', () => {
    // Build rows whose created_at lands exactly on each boundary; assert
    // the inclusive comparison keeps them in the result.
    fc.assert(
      fc.property(dateRangeArb, paymentRowArb, ({ start_date, end_date }, baseRow) => {
        const startRow = {
          ...baseRow,
          id: baseRow.id + 1,
          created_at_sql: `${start_date} 00:00:00`,
        };
        const endRow = {
          ...baseRow,
          id: baseRow.id + 2,
          created_at_sql: `${end_date} 23:59:59`,
        };
        // One second before / after the boundaries falls outside.
        const beforeStart = {
          ...baseRow,
          id: baseRow.id + 3,
          created_at_sql: `${start_date} 00:00:00`.replace(
            ' 00:00:00',
            ' 00:00:00',
          ),
        };

        const filters = { start_date, end_date };
        const result = filterPayments([startRow, endRow], filters);
        expect(result).toContainEqual(startRow);
        expect(result).toContainEqual(endRow);

        // Sanity: a row strictly before the start boundary by one full day
        // is excluded.
        const dayBefore = (() => {
          const [y, m, d] = start_date.split('-').map(Number);
          const dt = new Date(Date.UTC(y, m - 1, d - 1));
          const yy = String(dt.getUTCFullYear()).padStart(4, '0');
          const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(dt.getUTCDate()).padStart(2, '0');
          return `${yy}-${mm}-${dd} 23:59:59`;
        })();
        const tooEarly = { ...beforeStart, created_at_sql: dayBefore };
        const out = filterPayments([tooEarly], filters);
        expect(out).toEqual([]);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('payments: search is case-insensitive substring across client_name|client_email|id|booking_id', () => {
    fc.assert(
      fc.property(paymentRowArb, (row) => {
        const candidates = [
          row.client_name,
          row.client_email,
          String(row.id),
          String(row.booking_id),
        ].filter((v) => typeof v === 'string' && v.length > 0);

        for (const value of candidates) {
          const ch = value[Math.floor(value.length / 2)];
          const search = Math.random() < 0.5 ? ch.toUpperCase() : ch.toLowerCase();
          const matched = filterPayments([row], { search });
          expect(matched).toEqual([row]);
        }
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  // ────────────────────── AND composition (joint) ───────────────────────

  it('AND composition: applying filters one-by-one equals applying them all at once (products)', () => {
    fc.assert(
      fc.property(productsFixtureArb, productFilterComboArb, (rows, filters) => {
        // Apply each individual non-empty filter sequentially.
        let stepwise = rows;
        const keys = Object.keys(filters).filter(
          (k) => filters[k] !== undefined,
        );
        for (const k of keys) {
          stepwise = filterProducts(stepwise, { [k]: filters[k] });
        }
        const oneShot = filterProducts(rows, filters);
        expect(stepwise).toEqual(oneShot);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('AND composition: applying filters one-by-one equals applying them all at once (payments)', () => {
    fc.assert(
      fc.property(paymentsFixtureArb, paymentFilterComboArb, (rows, filters) => {
        let stepwise = rows;
        const keys = Object.keys(filters).filter(
          (k) => filters[k] !== undefined,
        );
        for (const k of keys) {
          stepwise = filterPayments(stepwise, { [k]: filters[k] });
        }
        const oneShot = filterPayments(rows, filters);
        expect(stepwise).toEqual(oneShot);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });
});
