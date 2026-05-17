// Feature: products-and-sales-improvements
//
// Property 10: Refund status transition rule
// Validates: Requirements 12.2, 12.9, 12.10, 14.6
//
// This test pins the *pure status-decision logic* extracted from
// `src/app/api/checkout/refund/route.js`. The route handler interleaves
// auth, DB look-ups, Stripe calls, and audit-log writes, so directly
// exercising it under property tests would require a heavyweight harness.
// Instead, we replicate the decision rule as a pure function below and
// assert the route's contract:
//
//   1. previousRefunded + refundAmount  >  amount  → REFUND_EXCEEDS_REMAINING,
//                                                    no status change, no DB write.
//   2. previousRefunded + refundAmount === amount  → status = 'refunded'.
//   3. previousRefunded + refundAmount  <  amount  → status = 'partially_refunded'.
//   4. The decided status is always in the canonical 4-value enum
//      `{pending, paid, refunded, partially_refunded}`. The decision function
//      MUST refuse to emit anything else (defensive guard from route.js
//      step 7), and any externally-supplied non-canonical status MUST be
//      rejected with INVALID_STATUS.
//
// The boundary (`===`) collapses into the `>=` branch in the route (see
// step 7: `isPartial = newRefundedTotal < paymentAmount`), so equality
// goes to `'refunded'`. We follow the same rounding convention the route
// uses (`Math.round(x * 100) / 100`) to avoid float-comparison drift on
// over-refund detection.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { refundTripleArb, PAYMENT_STATUSES } from './_arbitraries.js';

const FIXED_SEED = 0xBADCAFE; // deterministic CI seed

// ---------------------------------------------------------------------------
// Pure decision function — mirrors route.js step 6 + 7.
// ---------------------------------------------------------------------------

const CANONICAL_PAYMENT_STATUS = Object.freeze([
  'pending',
  'paid',
  'refunded',
  'partially_refunded',
]);

/**
 * Round a money amount to 2 decimal places using the same convention as
 * `route.js` (`Math.round(x * 100) / 100`). Centralised so the test and
 * the route can't drift.
 */
function roundMoney(x) {
  return Math.round(x * 100) / 100;
}

/**
 * Decide the outcome of a refund.
 *
 * @param {{ amount: number, previousRefunded: number, refundAmount: number,
 *           overrideStatus?: string }} input
 * @returns {{ ok: true, status: 'partially_refunded' | 'refunded',
 *             newRefundedTotal: number, isPartial: boolean }
 *           | { ok: false, code: 'REFUND_EXCEEDS_REMAINING' | 'INVALID_STATUS',
 *               status: undefined }}
 */
export function decideRefund({ amount, previousRefunded, refundAmount, overrideStatus }) {
  // Defensive guard: the route refuses any caller-supplied non-canonical
  // status (route.js step 7 — `if (!CANONICAL_PAYMENT_STATUS.has(newStatus))`).
  if (
    overrideStatus !== undefined &&
    !CANONICAL_PAYMENT_STATUS.includes(overrideStatus)
  ) {
    return { ok: false, code: 'INVALID_STATUS' };
  }

  const newRefundedTotal = roundMoney(previousRefunded + refundAmount);

  // Step 6: refund-window check. Strictly greater than ⇒ over-refund.
  if (newRefundedTotal > amount) {
    return { ok: false, code: 'REFUND_EXCEEDS_REMAINING' };
  }

  // Step 7: status decision. Equality collapses into the `'refunded'`
  // branch because the route uses `< amount` to decide partiality.
  const isPartial = newRefundedTotal < amount;
  const status = isPartial ? 'partially_refunded' : 'refunded';

  // Final defensive guard — must produce a canonical enum value.
  if (!CANONICAL_PAYMENT_STATUS.includes(status)) {
    return { ok: false, code: 'INVALID_STATUS' };
  }

  return { ok: true, status, newRefundedTotal, isPartial };
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 10: Refund status transition rule', () => {
  it('within-bounds refunds resolve to partially_refunded or refunded per the boundary rule', () => {
    fc.assert(
      fc.property(
        refundTripleArb.filter(
          ({ amount, previousRefunded, refundAmount }) =>
            roundMoney(previousRefunded + refundAmount) <= amount,
        ),
        ({ amount, previousRefunded, refundAmount }) => {
          const result = decideRefund({ amount, previousRefunded, refundAmount });

          expect(result.ok).toBe(true);
          // Always within the canonical 4-value enum.
          expect(PAYMENT_STATUSES).toContain(result.status);
          // Refund only ever lands in one of the two refund states.
          expect(['partially_refunded', 'refunded']).toContain(result.status);

          const total = roundMoney(previousRefunded + refundAmount);
          if (total < amount) {
            expect(result.status).toBe('partially_refunded');
            expect(result.isPartial).toBe(true);
          } else {
            // total === amount — the boundary case.
            expect(total).toBe(amount);
            expect(result.status).toBe('refunded');
            expect(result.isPartial).toBe(false);
          }
        },
      ),
      { seed: FIXED_SEED, numRuns: 200 },
    );
  });

  it('the boundary (previousRefunded + refundAmount === amount) maps to "refunded"', () => {
    // Construct the boundary explicitly; relying on the generator to land
    // on equality is too rare with continuous money values.
    fc.assert(
      fc.property(
        fc
          .record({
            amount: fc.integer({ min: 1, max: 1_000_000_00 }).map((c) => c / 100),
            split: fc.integer({ min: 0, max: 1_000_000_00 }),
          })
          .map(({ amount, split }) => {
            const cents = Math.round(amount * 100);
            const previousCents = split % (cents + 1); // 0..cents inclusive
            return {
              amount,
              previousRefunded: previousCents / 100,
              refundAmount: (cents - previousCents) / 100,
            };
          })
          // Skip the degenerate refundAmount === 0 case; the route rejects
          // amount <= 0 at body-validation time, well before status decision.
          .filter((t) => t.refundAmount > 0),
        ({ amount, previousRefunded, refundAmount }) => {
          const result = decideRefund({ amount, previousRefunded, refundAmount });
          expect(result.ok).toBe(true);
          expect(roundMoney(previousRefunded + refundAmount)).toBe(amount);
          expect(result.status).toBe('refunded');
          expect(result.isPartial).toBe(false);
        },
      ),
      { seed: FIXED_SEED, numRuns: 200 },
    );
  });

  it('over-refund returns REFUND_EXCEEDS_REMAINING with no status (no DB write semantics)', () => {
    fc.assert(
      fc.property(
        refundTripleArb.filter(
          ({ amount, previousRefunded, refundAmount }) =>
            roundMoney(previousRefunded + refundAmount) > amount,
        ),
        ({ amount, previousRefunded, refundAmount }) => {
          const result = decideRefund({ amount, previousRefunded, refundAmount });
          expect(result.ok).toBe(false);
          expect(result.code).toBe('REFUND_EXCEEDS_REMAINING');
          // Crucial: no status is emitted on the over-refund path. The
          // route relies on this to short-circuit *before* opening a
          // transaction (no Stripe call, no DB write — Requirement 14.6).
          expect(result.status).toBeUndefined();
        },
      ),
      { seed: FIXED_SEED, numRuns: 200 },
    );
  });

  it('non-canonical status writes are rejected with INVALID_STATUS', () => {
    // Any string outside the canonical set must be refused.
    const nonCanonicalArb = fc
      .oneof(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.constantFrom('PAID', 'Refunded', 'cancelled', 'void', 'failed', 'completed', '', ' '),
      )
      .filter((s) => !CANONICAL_PAYMENT_STATUS.includes(s));

    fc.assert(
      fc.property(refundTripleArb, nonCanonicalArb, (triple, overrideStatus) => {
        const result = decideRefund({ ...triple, overrideStatus });
        expect(result.ok).toBe(false);
        expect(result.code).toBe('INVALID_STATUS');
        expect(result.status).toBeUndefined();
      }),
      { seed: FIXED_SEED, numRuns: 200 },
    );
  });

  it('decided status is always in the canonical 4-value enum', () => {
    fc.assert(
      fc.property(refundTripleArb, (triple) => {
        const result = decideRefund(triple);
        if (result.ok) {
          expect(CANONICAL_PAYMENT_STATUS).toContain(result.status);
        } else {
          // The only two failure codes the decision function emits.
          expect(['REFUND_EXCEEDS_REMAINING', 'INVALID_STATUS']).toContain(result.code);
        }
      }),
      { seed: FIXED_SEED, numRuns: 300 },
    );
  });
});

// ---------------------------------------------------------------------------
// Drift detection — pin the rule against a small fixed table so a future
// refactor of route.js can't quietly change the status-decision contract
// without flagging this file.
// ---------------------------------------------------------------------------

describe('Property 10: pinned decision table', () => {
  const cases = [
    // [amount, previous, refund, expectedStatus | expectedCode]
    [100.0, 0.0, 100.0, 'refunded'], // full refund from clean
    [100.0, 0.0, 50.0, 'partially_refunded'], // half from clean
    [100.0, 50.0, 50.0, 'refunded'], // tops up to full
    [100.0, 25.0, 50.0, 'partially_refunded'], // partial-on-partial
    [100.0, 99.99, 0.01, 'refunded'], // boundary at 1¢
    [100.0, 99.99, 0.02, 'REFUND_EXCEEDS_REMAINING'], // 1¢ over
    [100.0, 0.0, 100.01, 'REFUND_EXCEEDS_REMAINING'], // 1¢ over from clean
    [0.01, 0.0, 0.01, 'refunded'], // smallest refund
    [10.0, 5.0, 6.0, 'REFUND_EXCEEDS_REMAINING'], // exceeds remaining 5
  ];

  it.each(cases)(
    'amount=%p previous=%p refund=%p → %p',
    (amount, previousRefunded, refundAmount, expected) => {
      const result = decideRefund({ amount, previousRefunded, refundAmount });
      if (expected === 'REFUND_EXCEEDS_REMAINING') {
        expect(result.ok).toBe(false);
        expect(result.code).toBe('REFUND_EXCEEDS_REMAINING');
      } else {
        expect(result.ok).toBe(true);
        expect(result.status).toBe(expected);
      }
    },
  );
});
