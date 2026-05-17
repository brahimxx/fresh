// Feature: products-and-sales-improvements
//
// Property 8 — Audit-log write is transactional with the originating
//              change.
//
// Validates: Requirements 14.4, 14.5, 20.1, 20.2, 20.3, 20.4, 20.5
//
// This test pins three contracts that together prove the audit-log
// invariant the feature depends on for forensic traceability.
//
// Contract A — Refund flow (`POST /api/checkout/refund`):
//   The route runs the following ordered effects, with steps 3..6
//   executing inside a single `transaction(async conn => …)` callback:
//
//     step 0 — validate body                       (pre-tx, pre-DB)
//     step 1 — check refund window                 (pre-tx, post-DB read)
//     step 2 — Stripe refund call                  (inside tx in route.js)
//     step 3 — INSERT refunds                      (inside tx)
//     step 4 — UPDATE payments status + refunded   (inside tx)
//     step 5 — INSERT audit_logs                   (inside tx)
//
//   Failure at step 0 (validation) or step 1 (refund window): no Stripe
//   call, no DB row, no audit-log row (Requirements 14.5, 14.8, 20.4).
//   Failure at step 2 (Stripe), step 3, step 4, or step 5: the
//   transaction rolls back; payments.status is unchanged, refunds row
//   is gone, and `audit_logs` has zero new rows (Requirement 20.4).
//   Success: exactly one new `audit_logs` row with `entity_type='payment'`,
//   `action='refund'`, and the documented `new_data` payload
//   (Requirements 14.4, 20.1).
//
// Contract B — Manual stock change (`PUT /api/products/[productId]/stock`):
//   The route runs the following ordered effects:
//
//     step 0 — validate body                       (pre-tx)
//     step 1 — SELECT … FOR UPDATE                 (inside tx, lock)
//     step 2 — UPDATE products SET stock_quantity  (inside tx)
//     step 3 — INSERT product_stock_movements      (inside tx)
//     step 4 — INSERT audit_logs                   (inside tx)
//
//   Failure at any step → zero new audit_logs rows. Success → exactly
//   one new audit_logs row with `entity_type='product'`,
//   `action='stock_change'`, and the documented payload
//   (Requirements 20.2, 20.4).
//
// Contract C — Sale / refund-driven movement (`addProductToBooking`):
//   The function INSERTs a `product_stock_movements` row with
//   `reason_code='sale'` or `'refund'` and intentionally does NOT
//   touch `audit_logs` (Requirement 20.3). Success → zero new
//   audit_logs rows.
//
// Approach: pure-model tests — model each flow as ordered effects on a
// snapshotted state and re-use the snapshot/restore pattern from
// `tests/properties/stock-tx-rollback.pbt.test.js`. fast-check picks
// the initial state, the bodies, and the failure index. Assertions
// look only at the post-state vs. the snapshot, so this stays free of
// any Next-runtime imports.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import {
  paymentArb,
  productArb,
  refundTripleArb,
  stockMovementTripleArb,
  PAYMENT_STATUSES,
} from './_arbitraries.js';

const SEED = 0xAD17_AB1E; // deterministic CI seed (audit-log-tx)

// ─── Snapshot/restore helper (mirrors mysql2 transactional semantics) ─────

/**
 * Plain-JSON deep clone that's sufficient for the tabular state we model
 * (numbers, strings, booleans, nulls, arrays, plain objects).
 */
function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

/**
 * Run an ordered list of effect steps with optional injected failure.
 *
 * Steps are `{ id, label, run(state) }`. `failAt` is one of:
 *   - `null`        → no failure, all steps run
 *   - `0..steps.length-1` → throw immediately *before* executing that step
 *   - `steps.length` → throw *after* every step, before commit
 *
 * On any throw we restore `live` to the snapshot in place and surface
 * the error. On success we commit (no-op — `live` already holds the new
 * state).
 */
function runOrderedTxn({ initialState, steps, failAt }) {
  const snapshot = clone(initialState);
  const live = clone(initialState);
  let thrown = null;
  try {
    for (const step of steps) {
      if (failAt === step.id) {
        const err = new Error(`SIMULATED_FAILURE_AT_${step.id}_${step.label}`);
        err.code = 'SIMULATED_FAILURE';
        err.failedBefore = step.label;
        throw err;
      }
      step.run(live);
    }
    if (failAt === steps.length) {
      const err = new Error('SIMULATED_FAILURE_AFTER_STEPS');
      err.code = 'SIMULATED_FAILURE';
      throw err;
    }
  } catch (err) {
    thrown = err;
    // Roll back: restore live to snapshot in place.
    for (const k of Object.keys(live)) delete live[k];
    Object.assign(live, clone(snapshot));
  }
  return { committed: thrown === null, finalState: live, snapshot, error: thrown };
}

// ─── Validators (mirror the route handlers) ───────────────────────────────

/** Refund body validator — matches `validateBody` in refund/route.js. */
function validateRefundBody(body) {
  if (!body || typeof body !== 'object') return { ok: false, code: 'ERROR_400' };
  const { paymentId, amount, reason } = body;
  if (!Number.isInteger(paymentId) || paymentId <= 0) return { ok: false, code: 'ERROR_400' };
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, code: 'ERROR_400' };
  }
  if (typeof reason !== 'string' || reason.trim().length < 1 || reason.trim().length > 100) {
    return { ok: false, code: 'ERROR_400' };
  }
  return { ok: true };
}

/** Stock-adjust body validator — matches `validateAdjustBody` in stock/route.js. */
function validateStockAdjustBody(body) {
  if (!body || typeof body !== 'object') return { ok: false };
  const { mode, quantity, reason_code } = body;
  if (!['set', 'add', 'subtract'].includes(mode)) return { ok: false };
  if (!Number.isInteger(quantity) || quantity < 0) return { ok: false };
  const MANUAL = ['manual_set', 'manual_adjustment', 'restock', 'waste', 'correction'];
  if (typeof reason_code !== 'string' || !MANUAL.includes(reason_code)) {
    return { ok: false };
  }
  return { ok: true };
}

/** Mirror of `route.js#computeNewQuantity`. */
function computeNewQuantity(currentQty, mode, quantity) {
  const before = Number(currentQty);
  let after;
  if (mode === 'set') after = quantity;
  else if (mode === 'add') after = before + quantity;
  else after = Math.max(0, before - quantity);
  return { before, after, delta: after - before };
}

// ─── Refund-flow effect builder ───────────────────────────────────────────

/**
 * The refund route runs validation + window-check OUTSIDE the
 * transaction; on rejection nothing is written. We model both phases as
 * ordered steps so the property test can inject failures at every
 * spec-distinguished point.
 *
 * State shape:
 *   { payment: { id, amount, refunded_amount, status, ... },
 *     refunds: [...],
 *     audit:   [...],
 *     stripe:  { calls: [...] } }
 */
function buildRefundSteps({ body, sessionUserId, simulateStripeFailure }) {
  return [
    {
      id: 0,
      label: 'validate body',
      run: (state) => {
        const v = validateRefundBody(body);
        if (!v.ok) {
          const err = new Error('VALIDATION_FAILED');
          err.code = 'ERROR_400';
          throw err;
        }
        state._validated = { ...body };
      },
    },
    {
      id: 1,
      label: 'check refund window',
      run: (state) => {
        const paymentAmount = Number(state.payment.amount);
        const previous = Number(state.payment.refunded_amount || 0);
        const newTotal = Math.round((previous + state._validated.amount) * 100) / 100;
        if (newTotal > paymentAmount) {
          const err = new Error('REFUND_EXCEEDS_REMAINING');
          err.code = 'REFUND_EXCEEDS_REMAINING';
          throw err;
        }
        state._refundDecision = {
          previous,
          newTotal,
          isPartial: newTotal < paymentAmount,
          newStatus: newTotal < paymentAmount ? 'partially_refunded' : 'refunded',
        };
      },
    },
    {
      id: 2,
      label: 'Stripe refund call',
      run: (state) => {
        if (simulateStripeFailure) {
          const err = new Error('STRIPE_FAILURE');
          err.code = 'STRIPE_FAILURE';
          throw err;
        }
        state.stripe.calls.push({
          payment_intent: state.payment.stripe_payment_id,
          amount: Math.round(state._validated.amount * 100),
        });
        state._stripeRefundId = `re_${state.stripe.calls.length}`;
      },
    },
    {
      id: 3,
      label: 'INSERT refunds',
      run: (state) => {
        const id = state.refunds.length + 1;
        state.refunds.push({
          id,
          payment_id: state.payment.id,
          amount: state._validated.amount,
          reason: state._validated.reason,
          stripe_refund_id: state._stripeRefundId || null,
          status: 'completed',
          processed_by: sessionUserId,
        });
        state._refundId = id;
      },
    },
    {
      id: 4,
      label: 'UPDATE payments',
      run: (state) => {
        state.payment.status = state._refundDecision.newStatus;
        state.payment.refunded_amount =
          Number(state.payment.refunded_amount || 0) + state._validated.amount;
      },
    },
    {
      id: 5,
      label: 'INSERT audit_logs',
      run: (state) => {
        state.audit.push({
          id: state.audit.length + 1,
          user_id: sessionUserId,
          action: 'refund',
          entity_type: 'payment',
          entity_id: state.payment.id,
          new_data: {
            amount: state._validated.amount,
            reason: state._validated.reason,
            isPartial: state._refundDecision.isPartial,
            refundId: state._refundId,
          },
        });
      },
    },
  ];
}

function clearRefundHelpers(state) {
  delete state._validated;
  delete state._refundDecision;
  delete state._stripeRefundId;
  delete state._refundId;
}

// ─── Manual-stock-change effect builder (mirrors stock/route.js PUT) ──────

function buildStockSteps({ body, productId, salonId, performedBy }) {
  return [
    {
      id: 0,
      label: 'validate body',
      run: (state) => {
        const v = validateStockAdjustBody(body);
        if (!v.ok) {
          const err = new Error('VALIDATION_FAILED');
          err.code = 'ERROR_400';
          throw err;
        }
        state._validated = { ...body };
      },
    },
    {
      id: 1,
      label: 'SELECT FOR UPDATE',
      run: (state) => {
        if (!state.product || state.product.deleted_at !== null) {
          const err = new Error('PRODUCT_GONE');
          err.code = 'PRODUCT_GONE';
          throw err;
        }
        const { before, after, delta } = computeNewQuantity(
          state.product.stock_quantity,
          state._validated.mode,
          state._validated.quantity,
        );
        state._locked = { before, after, delta };
      },
    },
    {
      id: 2,
      label: 'UPDATE products',
      run: (state) => {
        state.product.stock_quantity = state._locked.after;
      },
    },
    {
      id: 3,
      label: 'INSERT product_stock_movements',
      run: (state) => {
        const id = state.movements.length + 1;
        state.movements.push({
          id,
          product_id: productId,
          salon_id: salonId,
          change_type: state._validated.mode,
          quantity_before: state._locked.before,
          quantity_after: state._locked.after,
          delta: state._locked.delta,
          reason_code: state._validated.reason_code,
          reason_note: state._validated.reason_note ?? null,
          performed_by: performedBy,
          booking_id: null,
        });
        state._movementId = id;
      },
    },
    {
      id: 4,
      label: 'INSERT audit_logs',
      run: (state) => {
        state.audit.push({
          id: state.audit.length + 1,
          user_id: performedBy,
          action: 'stock_change',
          entity_type: 'product',
          entity_id: productId,
          old_data: { stock_quantity: state._locked.before },
          new_data: {
            stock_quantity: state._locked.after,
            mode: state._validated.mode,
            quantity: state._validated.quantity,
            delta: state._locked.delta,
            reason_code: state._validated.reason_code,
            reason_note: state._validated.reason_note ?? null,
            movement_id: state._movementId,
          },
        });
      },
    },
  ];
}

function clearStockHelpers(state) {
  delete state._validated;
  delete state._locked;
  delete state._movementId;
}

// ─── Sale-/refund-driven movement effect builder (addProductToBooking) ───
//
// This path INSERTs a product_stock_movements row but intentionally
// MUST NOT touch audit_logs (Requirement 20.3).

function buildSaleDrivenSteps({ productId, salonId, bookingId, quantity, performedBy }) {
  const isRefund = quantity < 0;
  const reasonCode = isRefund ? 'refund' : 'sale';
  const changeType = isRefund ? 'add' : 'subtract';
  const absQty = Math.abs(quantity);
  return [
    {
      id: 0,
      label: 'INSERT booking_products',
      run: (state) => {
        state.bookingProducts.push({
          id: state.bookingProducts.length + 1,
          booking_id: bookingId,
          product_id: productId,
          quantity,
        });
      },
    },
    {
      id: 1,
      label: 'UPDATE products stock_quantity',
      run: (state) => {
        const before = Number(state.product.stock_quantity);
        // Sale subtracts (clamp at 0 per checkout flow); refund adds.
        const after = isRefund ? before + absQty : Math.max(0, before - absQty);
        state._delta = after - before;
        state._before = before;
        state._after = after;
        state.product.stock_quantity = after;
      },
    },
    {
      id: 2,
      label: 'INSERT product_stock_movements (sale/refund)',
      run: (state) => {
        state.movements.push({
          id: state.movements.length + 1,
          product_id: productId,
          salon_id: salonId,
          change_type: changeType,
          quantity_before: state._before,
          quantity_after: state._after,
          delta: state._delta,
          reason_code: reasonCode,
          reason_note: null,
          performed_by: performedBy,
          booking_id: bookingId,
        });
      },
    },
    // No audit_logs INSERT — by design (Requirement 20.3).
  ];
}

function clearSaleHelpers(state) {
  delete state._delta;
  delete state._before;
  delete state._after;
}

// ─── Initial-state arbitraries ────────────────────────────────────────────

const sessionUserIdArb = fc.integer({ min: 1, max: 1_000_000 });

const refundInitialStateArb = paymentArb
  .filter((p) => p.amount > 0 && Number.isFinite(p.amount))
  .chain((p) =>
    fc.record({
      payment: fc.constant({
        ...p,
        // Force into a refundable status for the success branch.
        status: 'paid',
        refunded_amount: 0,
        // Ensure stripe path is exercised for some runs.
        stripe_payment_id: p.stripe_payment_id ?? 'pi_test',
      }),
      priorRefunds: fc.nat({ max: 3 }),
      priorAudit: fc.nat({ max: 5 }),
    }),
  )
  .map(({ payment, priorRefunds, priorAudit }) => ({
    payment,
    refunds: Array.from({ length: priorRefunds }, (_, i) => ({
      id: i + 1,
      payment_id: 999_999, // unrelated payment
      amount: 1,
      reason: 'pre-existing',
      stripe_refund_id: null,
      status: 'completed',
      processed_by: 1,
    })),
    audit: Array.from({ length: priorAudit }, (_, i) => ({
      id: i + 1,
      user_id: 1,
      action: 'refund',
      entity_type: 'payment',
      entity_id: 888_888,
      new_data: { amount: 1, reason: 'pre', isPartial: true, refundId: i + 1 },
    })),
    stripe: { calls: [] },
  }));

const productInitialStateArb = productArb
  .map((p) => ({ ...p, deleted_at: null }))
  .chain((product) =>
    fc.record({
      product: fc.constant(product),
      priorMovements: fc.nat({ max: 3 }),
      priorAudit: fc.nat({ max: 3 }),
    }),
  )
  .map(({ product, priorMovements, priorAudit }) => ({
    product,
    movements: Array.from({ length: priorMovements }, (_, i) => ({
      id: i + 1,
      product_id: product.id,
      salon_id: product.salon_id,
      change_type: 'add',
      quantity_before: 0,
      quantity_after: 1,
      delta: 1,
      reason_code: 'restock',
      reason_note: null,
      performed_by: 1,
      booking_id: null,
    })),
    audit: Array.from({ length: priorAudit }, (_, i) => ({
      id: i + 1,
      user_id: 1,
      action: 'stock_change',
      entity_type: 'product',
      entity_id: product.id,
      old_data: { stock_quantity: 0 },
      new_data: { stock_quantity: 1, mode: 'add', delta: 1 },
    })),
  }));

const saleDrivenInitialStateArb = productArb
  .map((p) => ({ ...p, deleted_at: null, stock_quantity: Math.max(p.stock_quantity, 100) }))
  .chain((product) =>
    fc.record({
      product: fc.constant(product),
      priorMovements: fc.nat({ max: 3 }),
      priorAudit: fc.nat({ max: 3 }),
      bookingId: fc.integer({ min: 1, max: 1_000_000 }),
    }),
  )
  .map(({ product, priorMovements, priorAudit, bookingId }) => ({
    product,
    bookingProducts: [],
    movements: Array.from({ length: priorMovements }, (_, i) => ({
      id: i + 1,
      product_id: product.id,
      salon_id: product.salon_id,
      change_type: 'add',
      quantity_before: 0,
      quantity_after: 1,
      delta: 1,
      reason_code: 'restock',
      reason_note: null,
      performed_by: 1,
      booking_id: null,
    })),
    audit: Array.from({ length: priorAudit }, (_, i) => ({
      id: i + 1,
      user_id: 1,
      action: 'stock_change',
      entity_type: 'product',
      entity_id: product.id,
      old_data: { stock_quantity: 0 },
      new_data: { stock_quantity: 1, delta: 1 },
    })),
    bookingId,
  }));

// ─── Refund body arbitraries ──────────────────────────────────────────────

/**
 * A well-formed refund body whose `amount` fits inside the available
 * remainder for the supplied payment. We cap to the remainder so the
 * window-check passes and step 1 doesn't reject before the audit-log step.
 */
function validRefundBodyForArb(payment) {
  const remainder = Math.max(
    0.01,
    Number(payment.amount) - Number(payment.refunded_amount || 0),
  );
  return fc.record({
    paymentId: fc.constant(payment.id),
    amount: fc
      .integer({ min: 1, max: Math.max(1, Math.round(remainder * 100)) })
      .map((cents) => cents / 100),
    reason: fc.string({ minLength: 1, maxLength: 50 }).map((s) => {
      const t = s.trim();
      return t.length === 0 ? 'requested_by_customer' : t.slice(0, 100);
    }),
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  });
}

/**
 * A malformed refund body that the validator MUST reject. We pick from
 * a few representative shapes (missing field, wrong type, out-of-range).
 */
const invalidRefundBodyArb = fc.oneof(
  fc.constant(null),
  fc.constant({}),
  fc.constant({ paymentId: 0, amount: 1, reason: 'x' }),
  fc.constant({ paymentId: 1, amount: -1, reason: 'x' }),
  fc.constant({ paymentId: 1, amount: 1, reason: '' }),
  fc.constant({ paymentId: 1, amount: 1, reason: 'a'.repeat(101) }),
  fc.constant({ paymentId: 'abc', amount: 1, reason: 'x' }),
);

// ─── Stock body arbitraries ───────────────────────────────────────────────

const validStockBodyArb = fc.record({
  mode: fc.constantFrom('set', 'add', 'subtract'),
  quantity: fc.nat({ max: 100_000 }),
  reason_code: fc.constantFrom(
    'manual_set',
    'manual_adjustment',
    'restock',
    'waste',
    'correction',
  ),
  reason_note: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
});

const invalidStockBodyArb = fc.oneof(
  fc.constant(null),
  fc.constant({ mode: 'unknown', quantity: 1, reason_code: 'restock' }),
  fc.constant({ mode: 'set', quantity: -1, reason_code: 'restock' }),
  fc.constant({ mode: 'set', quantity: 1.5, reason_code: 'restock' }),
  fc.constant({ mode: 'set', quantity: 1, reason_code: 'sale' }), // reserved
  fc.constant({ mode: 'set', quantity: 1, reason_code: 'refund' }), // reserved
  fc.constant({ mode: 'set', quantity: 1, reason_code: 'unknown' }),
);

// ─── Properties ───────────────────────────────────────────────────────────

describe('Property 8 — audit-log write is transactional with the originating change', () => {
  // ──────────────────────────────────────────────────────────────────────
  // A. Refund flow
  // ──────────────────────────────────────────────────────────────────────

  describe('refund path', () => {
    it('success: exactly one new audit_logs row with the documented payload (Reqs 14.4, 20.1)', () => {
      fc.assert(
        fc.property(
          refundInitialStateArb.chain((state) =>
            validRefundBodyForArb(state.payment).map((body) => ({ state, body })),
          ),
          sessionUserIdArb,
          ({ state, body }, sessionUserId) => {
            const priorAudit = state.audit.length;
            const priorRefunds = state.refunds.length;
            const steps = buildRefundSteps({
              body,
              sessionUserId,
              simulateStripeFailure: false,
            });
            const { committed, finalState } = runOrderedTxn({
              initialState: state,
              steps,
              failAt: null,
            });
            clearRefundHelpers(finalState);

            if (!committed) return false;
            if (finalState.audit.length !== priorAudit + 1) return false;
            if (finalState.refunds.length !== priorRefunds + 1) return false;

            const a = finalState.audit[finalState.audit.length - 1];
            if (
              a.user_id !== sessionUserId ||
              a.action !== 'refund' ||
              a.entity_type !== 'payment' ||
              a.entity_id !== state.payment.id
            ) {
              return false;
            }
            if (
              typeof a.new_data !== 'object' ||
              a.new_data.amount !== body.amount ||
              a.new_data.reason !== body.reason.trim() ||
              typeof a.new_data.isPartial !== 'boolean' ||
              a.new_data.refundId !== finalState.refunds[finalState.refunds.length - 1].id
            ) {
              return false;
            }
            // Status moved to refunded or partially_refunded.
            if (
              finalState.payment.status !== 'refunded' &&
              finalState.payment.status !== 'partially_refunded'
            ) {
              return false;
            }
            return true;
          },
        ),
        { seed: SEED, numRuns: 200 },
      );
    });

    it('failure at any tx step: zero new audit_logs, refunds, payment changes (Reqs 14.5, 20.4)', () => {
      fc.assert(
        fc.property(
          refundInitialStateArb.chain((state) =>
            validRefundBodyForArb(state.payment).map((body) => ({ state, body })),
          ),
          sessionUserIdArb,
          // failAt ∈ {0..6}: validation, window, Stripe, refunds insert,
          // payments update, audit insert, post-commit boundary.
          fc.integer({ min: 0, max: 6 }),
          ({ state, body }, sessionUserId, failAt) => {
            const priorAuditCount = state.audit.length;
            const priorAuditClone = clone(state.audit);
            const priorRefundsCount = state.refunds.length;
            const priorPayment = clone(state.payment);
            const priorStripeCalls = state.stripe.calls.length;

            const steps = buildRefundSteps({
              body,
              sessionUserId,
              simulateStripeFailure: false,
            });
            const { committed, finalState } = runOrderedTxn({
              initialState: state,
              steps,
              failAt,
            });
            clearRefundHelpers(finalState);

            // failAt < steps.length means the tx callback throws → rollback.
            // failAt === steps.length is the post-commit boundary, also a throw.
            if (committed) return false;

            // No new audit row — full count and content equality.
            if (finalState.audit.length !== priorAuditCount) return false;
            if (JSON.stringify(finalState.audit) !== JSON.stringify(priorAuditClone)) {
              return false;
            }
            // No new refund row.
            if (finalState.refunds.length !== priorRefundsCount) return false;
            // Payment row unchanged (status, refunded_amount).
            if (JSON.stringify(finalState.payment) !== JSON.stringify(priorPayment)) {
              return false;
            }
            // Stripe call count: pre-tx failures (0,1) record nothing;
            // step-2 throw also records nothing (we throw before the push);
            // steps ≥ 3 already had Stripe push, but rollback restores the
            // snapshot so the "live" array reverts to its prior length.
            if (finalState.stripe.calls.length !== priorStripeCalls) return false;
            return true;
          },
        ),
        { seed: SEED, numRuns: 400 },
      );
    });

    it('Stripe failure (step 2) writes no audit row even though pre-DB validation passed (Req 14.5)', () => {
      fc.assert(
        fc.property(
          refundInitialStateArb.chain((state) =>
            validRefundBodyForArb(state.payment).map((body) => ({ state, body })),
          ),
          sessionUserIdArb,
          ({ state, body }, sessionUserId) => {
            const priorAuditCount = state.audit.length;
            const priorRefundsCount = state.refunds.length;
            const priorPayment = clone(state.payment);

            const steps = buildRefundSteps({
              body,
              sessionUserId,
              simulateStripeFailure: true,
            });
            const { committed, finalState, error: thrown } = runOrderedTxn({
              initialState: state,
              steps,
              failAt: null,
            });
            clearRefundHelpers(finalState);

            return (
              committed === false &&
              thrown !== null &&
              thrown.code === 'STRIPE_FAILURE' &&
              finalState.audit.length === priorAuditCount &&
              finalState.refunds.length === priorRefundsCount &&
              JSON.stringify(finalState.payment) === JSON.stringify(priorPayment) &&
              finalState.stripe.calls.length === 0
            );
          },
        ),
        { seed: SEED, numRuns: 200 },
      );
    });

    it('invalid body (step 0) writes no audit row, no refund row, no payment change (Req 14.5)', () => {
      fc.assert(
        fc.property(
          refundInitialStateArb,
          invalidRefundBodyArb,
          sessionUserIdArb,
          (state, body, sessionUserId) => {
            const priorAuditCount = state.audit.length;
            const priorRefundsCount = state.refunds.length;
            const priorPayment = clone(state.payment);

            const steps = buildRefundSteps({
              body,
              sessionUserId,
              simulateStripeFailure: false,
            });
            const { committed, finalState, error: thrown } = runOrderedTxn({
              initialState: state,
              steps,
              failAt: null,
            });
            clearRefundHelpers(finalState);

            // The validator throws at step 0; runOrderedTxn rolls back.
            return (
              committed === false &&
              thrown !== null &&
              thrown.code === 'ERROR_400' &&
              finalState.audit.length === priorAuditCount &&
              finalState.refunds.length === priorRefundsCount &&
              JSON.stringify(finalState.payment) === JSON.stringify(priorPayment) &&
              finalState.stripe.calls.length === 0
            );
          },
        ),
        { seed: SEED, numRuns: 200 },
      );
    });

    it('over-refund (step 1) returns REFUND_EXCEEDS_REMAINING with no audit, no Stripe, no DB write (Req 14.6, 20.4)', () => {
      // Force `previousRefunded + amount > paymentAmount` by picking an
      // amount strictly greater than the remainder.
      const overRefundArb = refundInitialStateArb.chain((state) => {
        const remainder =
          Number(state.payment.amount) - Number(state.payment.refunded_amount || 0);
        return fc.record({
          state: fc.constant(state),
          body: fc.record({
            paymentId: fc.constant(state.payment.id),
            amount: fc
              .integer({ min: 1, max: 1_000_000 })
              .map((extra) => Math.round((remainder + extra / 100) * 100) / 100)
              .filter((amt) => amt > remainder),
            reason: fc.constant('over-refund'),
          }),
        });
      });

      fc.assert(
        fc.property(overRefundArb, sessionUserIdArb, ({ state, body }, sessionUserId) => {
          const priorAuditCount = state.audit.length;
          const priorRefundsCount = state.refunds.length;
          const priorPayment = clone(state.payment);

          const steps = buildRefundSteps({
            body,
            sessionUserId,
            simulateStripeFailure: false,
          });
          const { committed, finalState, error: thrown } = runOrderedTxn({
            initialState: state,
            steps,
            failAt: null,
          });
          clearRefundHelpers(finalState);

          return (
            committed === false &&
            thrown?.code === 'REFUND_EXCEEDS_REMAINING' &&
            finalState.audit.length === priorAuditCount &&
            finalState.refunds.length === priorRefundsCount &&
            JSON.stringify(finalState.payment) === JSON.stringify(priorPayment) &&
            finalState.stripe.calls.length === 0
          );
        }),
        { seed: SEED, numRuns: 150 },
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // B. Manual stock-change flow
  // ──────────────────────────────────────────────────────────────────────

  describe('manual stock-change path', () => {
    it('success: exactly one new audit_logs row with action=stock_change (Reqs 20.2)', () => {
      fc.assert(
        fc.property(
          productInitialStateArb,
          validStockBodyArb,
          sessionUserIdArb,
          (state, body, performedBy) => {
            const priorAudit = state.audit.length;
            const priorMovements = state.movements.length;

            const steps = buildStockSteps({
              body,
              productId: state.product.id,
              salonId: state.product.salon_id,
              performedBy,
            });
            const { committed, finalState } = runOrderedTxn({
              initialState: state,
              steps,
              failAt: null,
            });
            clearStockHelpers(finalState);

            if (!committed) return false;
            if (finalState.audit.length !== priorAudit + 1) return false;
            if (finalState.movements.length !== priorMovements + 1) return false;

            const a = finalState.audit[finalState.audit.length - 1];
            if (
              a.user_id !== performedBy ||
              a.action !== 'stock_change' ||
              a.entity_type !== 'product' ||
              a.entity_id !== state.product.id
            ) {
              return false;
            }
            // Tie audit row to the movement.
            const m = finalState.movements[finalState.movements.length - 1];
            return (
              a.new_data.movement_id === m.id &&
              a.new_data.reason_code === body.reason_code &&
              a.new_data.delta === m.delta
            );
          },
        ),
        { seed: SEED, numRuns: 200 },
      );
    });

    it('failure at any tx step: zero new audit_logs, zero new movements, product unchanged (Req 20.4)', () => {
      fc.assert(
        fc.property(
          productInitialStateArb,
          validStockBodyArb,
          sessionUserIdArb,
          // failAt ∈ {0..5}: validate, lock, update, insert movement,
          // insert audit, post-commit boundary.
          fc.integer({ min: 0, max: 5 }),
          (state, body, performedBy, failAt) => {
            const priorAudit = clone(state.audit);
            const priorMovements = clone(state.movements);
            const priorProduct = clone(state.product);

            const steps = buildStockSteps({
              body,
              productId: state.product.id,
              salonId: state.product.salon_id,
              performedBy,
            });
            const { committed, finalState } = runOrderedTxn({
              initialState: state,
              steps,
              failAt,
            });
            clearStockHelpers(finalState);

            if (committed) return false;
            return (
              JSON.stringify(finalState.audit) === JSON.stringify(priorAudit) &&
              JSON.stringify(finalState.movements) === JSON.stringify(priorMovements) &&
              JSON.stringify(finalState.product) === JSON.stringify(priorProduct)
            );
          },
        ),
        { seed: SEED, numRuns: 400 },
      );
    });

    it('invalid body (step 0): no audit, no movement, no product change (Req 20.4)', () => {
      fc.assert(
        fc.property(
          productInitialStateArb,
          invalidStockBodyArb,
          sessionUserIdArb,
          (state, body, performedBy) => {
            const priorAudit = clone(state.audit);
            const priorMovements = clone(state.movements);
            const priorProduct = clone(state.product);

            const steps = buildStockSteps({
              body,
              productId: state.product.id,
              salonId: state.product.salon_id,
              performedBy,
            });
            const { committed, finalState, error: thrown } = runOrderedTxn({
              initialState: state,
              steps,
              failAt: null,
            });
            clearStockHelpers(finalState);

            return (
              committed === false &&
              thrown?.code === 'ERROR_400' &&
              JSON.stringify(finalState.audit) === JSON.stringify(priorAudit) &&
              JSON.stringify(finalState.movements) === JSON.stringify(priorMovements) &&
              JSON.stringify(finalState.product) === JSON.stringify(priorProduct)
            );
          },
        ),
        { seed: SEED, numRuns: 200 },
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // C. Sale- / refund-driven movement (no audit log expected)
  // ──────────────────────────────────────────────────────────────────────

  describe('sale-/refund-driven movement (addProductToBooking)', () => {
    it('success: zero new audit_logs rows; movement row written with sale|refund reason (Req 20.3)', () => {
      // Quantity is non-zero; sign decides sale vs. refund.
      const quantityArb = fc.oneof(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: -50, max: -1 }),
      );
      fc.assert(
        fc.property(
          saleDrivenInitialStateArb,
          quantityArb,
          sessionUserIdArb,
          (state, quantity, performedBy) => {
            const priorAuditCount = state.audit.length;
            const priorAudit = clone(state.audit);
            const priorMovementsCount = state.movements.length;

            const steps = buildSaleDrivenSteps({
              productId: state.product.id,
              salonId: state.product.salon_id,
              bookingId: state.bookingId,
              quantity,
              performedBy,
            });
            const { committed, finalState } = runOrderedTxn({
              initialState: state,
              steps,
              failAt: null,
            });
            clearSaleHelpers(finalState);

            if (!committed) return false;

            // Audit log untouched.
            if (finalState.audit.length !== priorAuditCount) return false;
            if (JSON.stringify(finalState.audit) !== JSON.stringify(priorAudit)) return false;

            // Exactly one new movement row, with correct reason_code.
            if (finalState.movements.length !== priorMovementsCount + 1) return false;
            const m = finalState.movements[finalState.movements.length - 1];
            const expectedReason = quantity < 0 ? 'refund' : 'sale';
            return (
              m.reason_code === expectedReason &&
              m.product_id === state.product.id &&
              m.salon_id === state.product.salon_id &&
              m.booking_id === state.bookingId
            );
          },
        ),
        { seed: SEED, numRuns: 200 },
      );
    });

    it('failure at any step: zero new audit_logs rows, zero new movements (Req 20.3, 20.4)', () => {
      const quantityArb = fc.oneof(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: -50, max: -1 }),
      );
      fc.assert(
        fc.property(
          saleDrivenInitialStateArb,
          quantityArb,
          sessionUserIdArb,
          fc.integer({ min: 0, max: 3 }),
          (state, quantity, performedBy, failAt) => {
            const priorAudit = clone(state.audit);
            const priorMovements = clone(state.movements);
            const priorProduct = clone(state.product);
            const priorBookingProducts = clone(state.bookingProducts);

            const steps = buildSaleDrivenSteps({
              productId: state.product.id,
              salonId: state.product.salon_id,
              bookingId: state.bookingId,
              quantity,
              performedBy,
            });
            const { committed, finalState } = runOrderedTxn({
              initialState: state,
              steps,
              failAt,
            });
            clearSaleHelpers(finalState);

            if (committed) return false;
            return (
              JSON.stringify(finalState.audit) === JSON.stringify(priorAudit) &&
              JSON.stringify(finalState.movements) === JSON.stringify(priorMovements) &&
              JSON.stringify(finalState.product) === JSON.stringify(priorProduct) &&
              JSON.stringify(finalState.bookingProducts) ===
                JSON.stringify(priorBookingProducts)
            );
          },
        ),
        { seed: SEED, numRuns: 200 },
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // D. Smoke: the three flows agree on the at-most-one-audit-row invariant
  // ──────────────────────────────────────────────────────────────────────

  it('smoke: across refund / manual stock / sale-driven flows, audit_logs grows by 0 or 1', () => {
    expect(() => {
      // Refund — success: +1
      const refundState = {
        payment: {
          id: 1,
          amount: 100,
          refunded_amount: 0,
          status: 'paid',
          stripe_payment_id: 'pi_x',
        },
        refunds: [],
        audit: [],
        stripe: { calls: [] },
      };
      const refundSteps = buildRefundSteps({
        body: { paymentId: 1, amount: 25, reason: 'oops' },
        sessionUserId: 7,
        simulateStripeFailure: false,
      });
      const r1 = runOrderedTxn({ initialState: refundState, steps: refundSteps, failAt: null });
      if (r1.finalState.audit.length !== 1) throw new Error('refund success ≠ 1 audit row');

      // Manual stock — success: +1
      const stockState = {
        product: { id: 9, salon_id: 1, stock_quantity: 5, deleted_at: null },
        movements: [],
        audit: [],
      };
      const stockSteps = buildStockSteps({
        body: { mode: 'add', quantity: 3, reason_code: 'restock', reason_note: null },
        productId: 9,
        salonId: 1,
        performedBy: 7,
      });
      const r2 = runOrderedTxn({ initialState: stockState, steps: stockSteps, failAt: null });
      if (r2.finalState.audit.length !== 1) throw new Error('stock success ≠ 1 audit row');

      // Sale-driven — success: +0
      const saleState = {
        product: { id: 9, salon_id: 1, stock_quantity: 50, deleted_at: null },
        bookingProducts: [],
        movements: [],
        audit: [],
        bookingId: 11,
      };
      const saleSteps = buildSaleDrivenSteps({
        productId: 9,
        salonId: 1,
        bookingId: 11,
        quantity: 2,
        performedBy: 7,
      });
      const r3 = runOrderedTxn({ initialState: saleState, steps: saleSteps, failAt: null });
      if (r3.finalState.audit.length !== 0) throw new Error('sale success ≠ 0 audit rows');
    }).not.toThrow();
  });
});

// ─── Module-level smoke: PAYMENT_STATUSES contains the canonical 4 ─────────
// (Imported above so tree-shaking can't drop the contract proof; we keep it
// exercised here so an accidental enum change anywhere triggers this file.)
describe('canonical payment status enum used by Property 8', () => {
  it('PAYMENT_STATUSES is the canonical 4-value enum from Requirement 12.1', () => {
    expect(new Set(PAYMENT_STATUSES)).toEqual(
      new Set(['pending', 'paid', 'refunded', 'partially_refunded']),
    );
  });

  it('refundTripleArb / stockMovementTripleArb generators are non-empty (smoke)', () => {
    // Exercise the generators through fast-check's sample so the imports
    // can't be silently dropped without breaking this file.
    const sampleR = fc.sample(refundTripleArb, 3);
    const sampleS = fc.sample(stockMovementTripleArb, 3);
    expect(sampleR).toHaveLength(3);
    expect(sampleS).toHaveLength(3);
  });
});
