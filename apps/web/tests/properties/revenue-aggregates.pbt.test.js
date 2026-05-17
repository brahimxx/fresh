// Feature: products-and-sales-improvements
// Task: 6.5 PBT for revenue / transactions / refunded / average / daily totals
//
// Property 9: Revenue, transaction count, refund total, average ticket, and
// daily-totals match a model implementation
//
// **Validates: Requirements 9.1, 12.4, 12.5, 12.6, 12.7, 16.1**
//
// Both the Sales_Page KPI cards and the `/api/payments/daily-totals` endpoint
// agree to the formulas pinned in design.md (§ "Net-revenue formula"):
//
//     revenue(W)      = SUM(amount - COALESCE(refunded_amount, 0))
//                         over rows where status IN ('paid','partially_refunded')
//     transactions(W) = COUNT(*)        over the same rows
//     refunded(W)     = SUM(COALESCE(refunded_amount, 0))   over all rows in W
//     average(W)      = transactions == 0 ? 0 : revenue / transactions
//
// And the product-stats endpoint (`/api/products/stats`, design § 2):
//
//     totalProducts        = COUNT(*)                                 over active, non-deleted P
//     lowStockCount        = COUNT(stock_quantity ∈ (0, low_stock_threshold])
//     outOfStockCount      = COUNT(stock_quantity = 0)
//     totalInventoryValue  = SUM(price * stock_quantity)
//
// Daily-totals (Req 16.1) is the per-day version of the revenue formula
// LEFT JOINed against a date spine so every inclusive day appears with
// zero-fill when no transactions exist for that day.
//
// This test pins those formulas as a **pure JavaScript reference reducer**
// and asserts that any generated set of payments W produces results
// satisfying the documented invariants. Direct round-trip against the SQL
// route handler requires a live MySQL fixture and is exercised by the
// integration smoke (task 1.2). Here we focus on the algebraic contract
// the SQL must implement byte-equally.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { paymentArb, dateRangeArb, productArb } from './_arbitraries.js';

const SEED = 0xDA17707A; // deterministic CI seed

// ---------------------------------------------------------------------------
// Reference reducer (executable spec)
// ---------------------------------------------------------------------------

const REVENUE_STATUSES = Object.freeze(['paid', 'partially_refunded']);

/** Two-decimal rounding to mirror the route's monetary contract. */
function round2(x) {
  return Math.round(x * 100) / 100;
}

/** Return `YYYY-MM-DD` for the UTC day that `dateOrIso` falls into. */
function isoDay(dateOrIso) {
  const d = dateOrIso instanceof Date ? dateOrIso : new Date(dateOrIso);
  return d.toISOString().slice(0, 10);
}

/** Coerce a possibly-null monetary value to a non-negative number. */
function money(v) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Reduce a payment set W to the four headline KPIs.
 *
 * Mirrors design.md "Net-revenue formula" verbatim, including the
 * `transactions === 0 ? 0 : revenue/transactions` short-circuit so no
 * division is performed for an empty set (Req 12.7).
 */
export function reduceRevenueKpis(payments) {
  const counted = payments.filter((p) => REVENUE_STATUSES.includes(p.status));

  const revenue = round2(
    counted.reduce((sum, p) => sum + (money(p.amount) - money(p.refunded_amount)), 0),
  );
  const transactions = counted.length;
  const refunded = round2(
    payments.reduce((sum, p) => sum + money(p.refunded_amount), 0),
  );
  const average = transactions === 0 ? 0 : round2(revenue / transactions);

  return { revenue, transactions, refunded, average };
}

/**
 * Build the inclusive date spine `[start_date .. end_date]` as `YYYY-MM-DD`
 * strings in ascending UTC order (mirrors the recursive CTE in
 * `/api/payments/daily-totals`).
 */
export function buildDateSpine(startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const days = [];
  for (let t = start; t <= end; t += 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Reduce a payment set to the per-day shape returned by
 * `/api/payments/daily-totals`. Days outside W contribute nothing; days
 * inside W with no payments are zero-filled.
 */
export function reduceDailyTotals(payments, { start_date, end_date }) {
  const spine = buildDateSpine(start_date, end_date);
  const buckets = new Map(spine.map((d) => [d, []]));

  for (const p of payments) {
    const d = isoDay(p.created_at);
    if (buckets.has(d)) {
      buckets.get(d).push(p);
    }
  }

  return spine.map((date) => {
    const dayPayments = buckets.get(date);
    const counted = dayPayments.filter((p) => REVENUE_STATUSES.includes(p.status));
    return {
      date,
      revenue: round2(
        counted.reduce(
          (sum, p) => sum + (money(p.amount) - money(p.refunded_amount)),
          0,
        ),
      ),
      transactions: counted.length,
      refunded: round2(
        dayPayments.reduce((sum, p) => sum + money(p.refunded_amount), 0),
      ),
    };
  });
}

/**
 * Product stats reducer. Mirrors the conditional aggregates over the
 * active, non-deleted product set (design § 2, Req 9.1).
 */
export function reduceProductStats(products) {
  const active = products.filter((p) => p.is_active === 1 || p.is_active === true);
  const totalProducts = active.length;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalInventoryValue = 0;
  for (const p of active) {
    const qty = Number(p.stock_quantity) || 0;
    const threshold = Number(p.low_stock_threshold) || 0;
    const price = Number(p.price) || 0;
    if (qty === 0) outOfStockCount++;
    else if (qty <= threshold) lowStockCount++;
    totalInventoryValue += price * qty;
  }
  return {
    totalProducts,
    lowStockCount,
    outOfStockCount,
    totalInventoryValue: round2(totalInventoryValue),
  };
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const paymentSetArb = fc.array(paymentArb, { minLength: 0, maxLength: 40 });

/**
 * A `(payments, dateRange)` tuple where every payment's `created_at` lands
 * inside the inclusive window. Used for tests that need the full set to
 * fall under the daily-totals spine without filtering rows out.
 */
const paymentsInWindowArb = dateRangeArb.chain(({ start_date, end_date }) => {
  const startMs = Date.parse(`${start_date}T00:00:00Z`);
  const endMs = Date.parse(`${end_date}T00:00:00Z`);
  const dayCount = Math.floor((endMs - startMs) / 86_400_000) + 1;

  const inWindowPayment = paymentArb.chain((p) =>
    fc
      .tuple(
        fc.integer({ min: 0, max: dayCount - 1 }),
        fc.integer({ min: 0, max: 86_399_999 }),
      )
      .map(([dayOffset, msInDay]) => ({
        ...p,
        created_at: new Date(startMs + dayOffset * 86_400_000 + msInDay),
      })),
  );

  return fc
    .array(inWindowPayment, { minLength: 0, maxLength: 30 })
    .map((payments) => ({ payments, range: { start_date, end_date } }));
});

// ---------------------------------------------------------------------------
// Properties — KPI reducer
// ---------------------------------------------------------------------------

describe('Property 9 — revenue / transactions / refunded / average reducer', () => {
  it('all aggregates are non-negative numbers (Req 9.1, 12.4, 12.5, 12.6)', () => {
    fc.assert(
      fc.property(paymentSetArb, (payments) => {
        const { revenue, transactions, refunded, average } = reduceRevenueKpis(payments);
        expect(Number.isFinite(revenue)).toBe(true);
        expect(Number.isFinite(refunded)).toBe(true);
        expect(Number.isFinite(average)).toBe(true);
        expect(revenue).toBeGreaterThanOrEqual(0);
        expect(transactions).toBeGreaterThanOrEqual(0);
        expect(refunded).toBeGreaterThanOrEqual(0);
        expect(average).toBeGreaterThanOrEqual(0);
        // transactions is always an exact integer (count).
        expect(Number.isInteger(transactions)).toBe(true);
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('average is 0 iff transactions = 0; otherwise average = round2(revenue / transactions) (Req 12.7)', () => {
    fc.assert(
      fc.property(paymentSetArb, (payments) => {
        const kpis = reduceRevenueKpis(payments);
        if (kpis.transactions === 0) {
          // Critical: no division performed when count is zero.
          expect(kpis.average).toBe(0);
          // Revenue must also be 0 — if no row is counted, no row contributes.
          expect(kpis.revenue).toBe(0);
        } else {
          expect(kpis.average).toBe(round2(kpis.revenue / kpis.transactions));
        }
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('transactions = COUNT over rows with status ∈ {paid, partially_refunded} (Req 12.5)', () => {
    fc.assert(
      fc.property(paymentSetArb, (payments) => {
        const expected = payments.filter((p) =>
          REVENUE_STATUSES.includes(p.status),
        ).length;
        expect(reduceRevenueKpis(payments).transactions).toBe(expected);
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('refunded = SUM(COALESCE(refunded_amount, 0)) over ALL rows in W (Req 12.6)', () => {
    // Note: refunded counts every row regardless of status (a fully
    // 'refunded' payment still contributes its refunded_amount, and a
    // 'pending' row with refunded_amount = 0 contributes 0).
    fc.assert(
      fc.property(paymentSetArb, (payments) => {
        const expected = round2(
          payments.reduce((s, p) => s + money(p.refunded_amount), 0),
        );
        expect(reduceRevenueKpis(payments).refunded).toBe(expected);
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('pending and (fully) refunded rows do not contribute to revenue or transactions', () => {
    // Restrict the generator to non-counted statuses; revenue and
    // transactions must collapse to zero regardless of amount.
    const nonCountedArb = paymentArb.map((p) => ({
      ...p,
      status: p.id % 2 === 0 ? 'pending' : 'refunded',
    }));
    fc.assert(
      fc.property(
        fc.array(nonCountedArb, { minLength: 0, maxLength: 30 }),
        (payments) => {
          const { revenue, transactions } = reduceRevenueKpis(payments);
          expect(revenue).toBe(0);
          expect(transactions).toBe(0);
        },
      ),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('adding a pending row leaves revenue/transactions unchanged (refunded only changes by its refund)', () => {
    fc.assert(
      fc.property(paymentSetArb, paymentArb, (payments, extra) => {
        const pending = { ...extra, status: 'pending' };
        const before = reduceRevenueKpis(payments);
        const after = reduceRevenueKpis([...payments, pending]);

        expect(after.revenue).toBe(before.revenue);
        expect(after.transactions).toBe(before.transactions);
        expect(after.refunded).toBe(round2(before.refunded + money(pending.refunded_amount)));
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('a fully-refunded row (refunded_amount = amount) contributes 0 to revenue, 1 to transactions when partially_refunded; nothing to revenue/transactions when status="refunded"', () => {
    fc.assert(
      fc.property(paymentArb, (p) => {
        const fullyRefunded = {
          ...p,
          status: 'refunded',
          refunded_amount: p.amount,
        };
        const partiallyAtBoundary = {
          ...p,
          status: 'partially_refunded',
          refunded_amount: p.amount,
        };

        const a = reduceRevenueKpis([fullyRefunded]);
        expect(a.revenue).toBe(0);
        expect(a.transactions).toBe(0);
        expect(a.refunded).toBe(round2(p.amount));

        const b = reduceRevenueKpis([partiallyAtBoundary]);
        // Per Req 12.4 the row is counted, contributes amount - refunded = 0.
        expect(b.revenue).toBe(0);
        expect(b.transactions).toBe(1);
        expect(b.refunded).toBe(round2(p.amount));
        expect(b.average).toBe(0);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Properties — daily-totals reducer
// ---------------------------------------------------------------------------

describe('Property 9 — daily-totals reducer (Req 16.1)', () => {
  it('returns exactly one entry per inclusive day in ascending order with no duplicates', () => {
    fc.assert(
      fc.property(
        paymentSetArb,
        dateRangeArb,
        (payments, range) => {
          const series = reduceDailyTotals(payments, range);
          const expectedDays = buildDateSpine(range.start_date, range.end_date);

          expect(series).toHaveLength(expectedDays.length);
          // Strictly ascending, no gaps, no duplicates.
          for (let i = 0; i < series.length; i++) {
            expect(series[i].date).toBe(expectedDays[i]);
            if (i > 0) {
              expect(series[i].date > series[i - 1].date).toBe(true);
            }
          }
        },
      ),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('every day has revenue, transactions, refunded ≥ 0 (and transactions integer)', () => {
    fc.assert(
      fc.property(paymentSetArb, dateRangeArb, (payments, range) => {
        const series = reduceDailyTotals(payments, range);
        for (const row of series) {
          expect(row.revenue).toBeGreaterThanOrEqual(0);
          expect(row.refunded).toBeGreaterThanOrEqual(0);
          expect(row.transactions).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(row.transactions)).toBe(true);
        }
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('days with no payments are zero-filled (revenue=0, transactions=0, refunded=0)', () => {
    // Empty payment set ⇒ every day in the spine zero-filled.
    fc.assert(
      fc.property(dateRangeArb, (range) => {
        const series = reduceDailyTotals([], range);
        for (const row of series) {
          expect(row).toEqual({
            date: row.date,
            revenue: 0,
            transactions: 0,
            refunded: 0,
          });
        }
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('decomposition: SUM(daily.revenue) === KPI.revenue when every payment lies in the window', () => {
    fc.assert(
      fc.property(paymentsInWindowArb, ({ payments, range }) => {
        const series = reduceDailyTotals(payments, range);
        const kpis = reduceRevenueKpis(payments);

        const sumRevenue = round2(series.reduce((s, r) => s + r.revenue, 0));
        const sumTransactions = series.reduce((s, r) => s + r.transactions, 0);
        const sumRefunded = round2(series.reduce((s, r) => s + r.refunded, 0));

        expect(sumRevenue).toBe(kpis.revenue);
        expect(sumTransactions).toBe(kpis.transactions);
        expect(sumRefunded).toBe(kpis.refunded);
      }),
      { seed: SEED, numRuns: 80 },
    );
  });

  it('payments outside the window do not influence any daily row', () => {
    // Take a window, then assert that adding a payment whose created_at
    // falls clearly outside (one day after end_date) leaves the series
    // byte-equal to the in-window series.
    fc.assert(
      fc.property(paymentsInWindowArb, paymentArb, ({ payments, range }, extra) => {
        const afterMs =
          Date.parse(`${range.end_date}T00:00:00Z`) + 2 * 86_400_000;
        const outside = { ...extra, created_at: new Date(afterMs) };

        const baseline = reduceDailyTotals(payments, range);
        const augmented = reduceDailyTotals([...payments, outside], range);
        expect(augmented).toEqual(baseline);
      }),
      { seed: SEED, numRuns: 80 },
    );
  });

  it('per-day formula matches the global formula applied to that day only', () => {
    fc.assert(
      fc.property(paymentsInWindowArb, ({ payments, range }) => {
        const series = reduceDailyTotals(payments, range);
        for (const row of series) {
          const sameDay = payments.filter((p) => isoDay(p.created_at) === row.date);
          const expected = reduceRevenueKpis(sameDay);
          expect(row.revenue).toBe(expected.revenue);
          expect(row.transactions).toBe(expected.transactions);
          expect(row.refunded).toBe(expected.refunded);
        }
      }),
      { seed: SEED, numRuns: 80 },
    );
  });
});

// ---------------------------------------------------------------------------
// Properties — product stats reducer (Req 9.1)
// ---------------------------------------------------------------------------

describe('Property 9 — product stats reducer (Req 9.1)', () => {
  const productSetArb = fc.array(productArb, { minLength: 0, maxLength: 30 });

  it('all stats are non-negative; counts are integers', () => {
    fc.assert(
      fc.property(productSetArb, (products) => {
        const s = reduceProductStats(products);
        expect(s.totalProducts).toBeGreaterThanOrEqual(0);
        expect(s.lowStockCount).toBeGreaterThanOrEqual(0);
        expect(s.outOfStockCount).toBeGreaterThanOrEqual(0);
        expect(s.totalInventoryValue).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(s.totalProducts)).toBe(true);
        expect(Number.isInteger(s.lowStockCount)).toBe(true);
        expect(Number.isInteger(s.outOfStockCount)).toBe(true);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('lowStockCount and outOfStockCount are disjoint and bounded by totalProducts', () => {
    fc.assert(
      fc.property(productSetArb, (products) => {
        const s = reduceProductStats(products);
        // qty=0 ⇒ outOfStock; qty>0 && qty<=threshold ⇒ low.
        // The two buckets are disjoint by construction.
        expect(s.lowStockCount + s.outOfStockCount).toBeLessThanOrEqual(s.totalProducts);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('inactive products do not contribute to any aggregate', () => {
    fc.assert(
      fc.property(productSetArb, (products) => {
        const inactive = products.map((p) => ({ ...p, is_active: 0 }));
        const s = reduceProductStats(inactive);
        expect(s).toEqual({
          totalProducts: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          totalInventoryValue: 0,
        });
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('totalInventoryValue = round2(SUM(price * stock_quantity)) over active rows', () => {
    fc.assert(
      fc.property(productSetArb, (products) => {
        const expected = round2(
          products
            .filter((p) => p.is_active === 1 || p.is_active === true)
            .reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.stock_quantity) || 0), 0),
        );
        expect(reduceProductStats(products).totalInventoryValue).toBe(expected);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Pinned tables — drift detection
// ---------------------------------------------------------------------------

describe('Property 9 — pinned KPI table', () => {
  const cases = [
    {
      label: 'empty set ⇒ all zeros, average = 0 (no division)',
      payments: [],
      expected: { revenue: 0, transactions: 0, refunded: 0, average: 0 },
    },
    {
      label: 'single paid row with no refund',
      payments: [{ status: 'paid', amount: 100, refunded_amount: 0 }],
      expected: { revenue: 100, transactions: 1, refunded: 0, average: 100 },
    },
    {
      label: 'partially_refunded contributes net to revenue',
      payments: [{ status: 'partially_refunded', amount: 100, refunded_amount: 30 }],
      expected: { revenue: 70, transactions: 1, refunded: 30, average: 70 },
    },
    {
      label: 'pending excluded from revenue/transactions (refunded col still 0)',
      payments: [
        { status: 'paid', amount: 50, refunded_amount: 0 },
        { status: 'pending', amount: 999, refunded_amount: 0 },
      ],
      expected: { revenue: 50, transactions: 1, refunded: 0, average: 50 },
    },
    {
      label: 'fully refunded contributes nothing to revenue/transactions, full to refunded',
      payments: [
        { status: 'paid', amount: 100, refunded_amount: 0 },
        { status: 'refunded', amount: 50, refunded_amount: 50 },
      ],
      expected: { revenue: 100, transactions: 1, refunded: 50, average: 100 },
    },
    {
      label: 'NULL refunded_amount coerced to 0',
      payments: [{ status: 'paid', amount: 80, refunded_amount: null }],
      expected: { revenue: 80, transactions: 1, refunded: 0, average: 80 },
    },
    {
      label: 'two paid rows ⇒ average is mean',
      payments: [
        { status: 'paid', amount: 100, refunded_amount: 0 },
        { status: 'paid', amount: 50, refunded_amount: 0 },
      ],
      expected: { revenue: 150, transactions: 2, refunded: 0, average: 75 },
    },
  ];

  it.each(cases)('$label', ({ payments, expected }) => {
    expect(reduceRevenueKpis(payments)).toEqual(expected);
  });
});

describe('Property 9 — pinned daily-totals table', () => {
  it('zero-fills a 3-day window with no payments', () => {
    const series = reduceDailyTotals([], { start_date: '2025-03-09', end_date: '2025-03-11' });
    expect(series).toEqual([
      { date: '2025-03-09', revenue: 0, transactions: 0, refunded: 0 },
      { date: '2025-03-10', revenue: 0, transactions: 0, refunded: 0 },
      { date: '2025-03-11', revenue: 0, transactions: 0, refunded: 0 },
    ]);
  });

  it('aggregates a mix of paid and partially-refunded rows on the same day', () => {
    const range = { start_date: '2025-03-09', end_date: '2025-03-10' };
    const series = reduceDailyTotals(
      [
        { status: 'paid', amount: 60, refunded_amount: 0, created_at: '2025-03-09T10:00:00Z' },
        {
          status: 'partially_refunded',
          amount: 100,
          refunded_amount: 25,
          created_at: '2025-03-09T22:30:00Z',
        },
        { status: 'pending', amount: 999, refunded_amount: 0, created_at: '2025-03-10T05:00:00Z' },
      ],
      range,
    );
    expect(series).toEqual([
      { date: '2025-03-09', revenue: 135, transactions: 2, refunded: 25 },
      { date: '2025-03-10', revenue: 0, transactions: 0, refunded: 0 },
    ]);
  });
});
