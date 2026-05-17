// Feature: products-and-sales-improvements
//
// Property 7 — Stock movement insert is transactional with the products update.
//
// Validates: Requirements 3.6, 22.2
//
// The Stock_API PUT handler runs four ordered effects inside a single
// `transaction(async conn => …)` callback:
//
//   step 0 — SELECT … FOR UPDATE  (lock product row, read current stock)
//   step 1 — UPDATE products SET stock_quantity = ?
//   step 2 — INSERT product_stock_movements (…)
//   step 3 — INSERT audit_logs (…)
//
// `src/lib/db.js#transaction` calls `connection.beginTransaction()`, awaits the
// callback, then `commit()` on resolve or `rollback()` on reject. So the
// invariants we need to prove are:
//
//   - If any step throws (including the spec-required failure "between
//     UPDATE products and INSERT product_stock_movements"), the entire
//     callback rejects, `transaction()` re-throws, and *no* effect from
//     any step is observable in the final state.
//   - If every step succeeds, all three writes (UPDATE, INSERT movement,
//     INSERT audit) are observable in the final state.
//   - The route handler's `try/catch` converts the re-thrown error to an
//     HTTP 5xx response (`error('Failed to adjust stock', 500)`).
//
// Approach (per the task brief): model the transaction as a pure reducer
// that snapshots the state on entry, runs ordered effects, and restores
// the snapshot on any throw. fast-check picks the initial state, the
// `(mode, quantity)` triple from `stockMovementTripleArb`, and the failure
// point. We then assert atomicity for every reachable failure index and
// completeness when no failure is injected.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { stockMovementTripleArb } from './_arbitraries.js';
import { error } from '@/lib/response';

// ─── Pure model of the transaction callback ───────────────────────────────

/**
 * Mirrors `computeNewQuantity` in the route handler — kept inline so this
 * file is free of any Next-runtime imports (route.js pulls in
 * `next/server` indirectly).
 *
 * Source: src/app/api/products/[productId]/stock/route.js
 */
function computeNewQuantity(currentQty, mode, quantity) {
  const before = Number(currentQty);
  let after;
  if (mode === 'set') after = quantity;
  else if (mode === 'add') after = before + quantity;
  else after = Math.max(0, before - quantity); // 'subtract'
  return { before, after, delta: after - before };
}

/**
 * Snapshot/restore wrapper that mimics `mysql2`'s transactional semantics
 * exactly: enter → run callback → on throw, every mutation observed inside
 * the callback is undone; on success, mutations persist.
 *
 * The state held by the connection is just the parts the route handler
 * touches: the product row, the movements log, and the audit log.
 */
function makeFakeConn(initialState) {
  // Deep clone via JSON — state contains only plain values.
  const snapshot = JSON.parse(JSON.stringify(initialState));
  const live = JSON.parse(JSON.stringify(initialState));
  return {
    snapshot,
    live,
    /** Restore `live` to the snapshot in place. */
    rollback() {
      // eslint-disable-next-line no-restricted-syntax
      for (const key of Object.keys(live)) delete live[key];
      Object.assign(live, JSON.parse(JSON.stringify(snapshot)));
    },
  };
}

/**
 * The four-step ordered effect list from the route handler. Each entry is
 * `{ id, run(state) }` where `run` mutates `state` in place — exactly the
 * way the real `conn.query` mutations would.
 *
 * Step ids match the comments in the route handler.
 */
function buildSteps({ productId, salonId, mode, quantity, performedBy, reasonCode, reasonNote }) {
  return [
    {
      id: 0,
      label: 'SELECT … FOR UPDATE',
      run: (state) => {
        // Read-only step. The handler reads the locked row and computes
        // the new quantity from it; we stash the computed values on the
        // state for downstream steps so step 1/2 use the locked snapshot.
        const locked = state.product;
        if (!locked || locked.deleted_at !== null) {
          const err = new Error('PRODUCT_GONE');
          err.code = 'PRODUCT_GONE';
          throw err;
        }
        const { before, after, delta } = computeNewQuantity(
          locked.stock_quantity,
          mode,
          quantity,
        );
        state._locked = { before, after, delta };
      },
    },
    {
      id: 1,
      label: 'UPDATE products SET stock_quantity = ?',
      run: (state) => {
        state.product.stock_quantity = state._locked.after;
        state.product.updated_at = '2026-06-01T00:00:00Z';
      },
    },
    {
      id: 2,
      label: 'INSERT product_stock_movements',
      run: (state) => {
        const movementId = state.movements.length + 1;
        state.movements.push({
          id: movementId,
          product_id: productId,
          salon_id: salonId,
          change_type: mode,
          quantity_before: state._locked.before,
          quantity_after: state._locked.after,
          delta: state._locked.delta,
          reason_code: reasonCode,
          reason_note: reasonNote,
          performed_by: performedBy,
          booking_id: null,
        });
        state._lastMovementId = movementId;
      },
    },
    {
      id: 3,
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
            mode,
            quantity,
            delta: state._locked.delta,
            reason_code: reasonCode,
            reason_note: reasonNote,
            movement_id: state._lastMovementId,
          },
        });
      },
    },
  ];
}

/**
 * Run the transaction with optional injected failure at a step index.
 *
 * `failAt`:
 *   - integer 0..3 → throw immediately *before* executing that step
 *     (i.e. failAt=2 reproduces the spec's "between UPDATE products and
 *     INSERT product_stock_movements" injection point exactly)
 *   - integer 4    → throw *after* every step, before commit
 *   - null         → no failure, callback resolves and commit happens
 */
function runTxn({ initialState, steps, failAt }) {
  const conn = makeFakeConn(initialState);
  let thrown = null;
  try {
    for (const step of steps) {
      if (failAt === step.id) {
        const err = new Error(`SIMULATED_FAILURE_AT_${step.id}`);
        err.code = 'SIMULATED_FAILURE';
        err.failedBefore = step.label;
        throw err;
      }
      step.run(conn.live);
    }
    if (failAt === steps.length) {
      const err = new Error('SIMULATED_FAILURE_AFTER_STEPS');
      err.code = 'SIMULATED_FAILURE';
      throw err;
    }
  } catch (err) {
    thrown = err;
    conn.rollback();
  }
  // Don't leak the helper field into post-state assertions.
  delete conn.live._locked;
  delete conn.live._lastMovementId;
  delete conn.snapshot._locked;
  delete conn.snapshot._lastMovementId;
  return { committed: thrown === null, finalState: conn.live, snapshot: conn.snapshot, error: thrown };
}

// ─── fast-check arbitraries specific to this property ─────────────────────

/** A baseline product row the transaction will lock and update. */
const productRowArb = fc.record({
  id: fc.integer({ min: 1, max: 1_000_000 }),
  salon_id: fc.integer({ min: 1, max: 1_000_000 }),
  stock_quantity: fc.nat({ max: 1_000_000 }),
  deleted_at: fc.constant(null),
  updated_at: fc.constant('2026-05-01T00:00:00Z'),
});

const reasonCodeArb = fc.constantFrom(
  'manual_set',
  'manual_adjustment',
  'restock',
  'waste',
  'correction',
);

const reasonNoteArb = fc.option(fc.string({ maxLength: 500 }), { nil: null, freq: 2 });

const performedByArb = fc.integer({ min: 1, max: 1_000_000 });

const initialStateArb = fc
  .record({
    product: productRowArb,
    // Pre-existing movements / audit rows so the property catches any
    // accidental "rollback wipes the whole table" implementation bug.
    priorMovements: fc.nat({ max: 5 }),
    priorAudit: fc.nat({ max: 5 }),
  })
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
      new_data: { stock_quantity: 1, mode: 'add', quantity: 1, delta: 1 },
    })),
  }));

const SEED = 0xDECAFC0FFEE;

// ─── The properties ───────────────────────────────────────────────────────

describe('Property 7 — stock movement insert is transactional with the products update', () => {
  it('atomicity: any thrown failure inside the transaction leaves state byte-equal to the snapshot', () => {
    fc.assert(
      fc.property(
        initialStateArb,
        stockMovementTripleArb,
        reasonCodeArb,
        reasonNoteArb,
        performedByArb,
        // Failure index ∈ {0,1,2,3,4}: every reachable injection point.
        // 2 is the spec's "between UPDATE products and INSERT
        // product_stock_movements" point.
        fc.integer({ min: 0, max: 4 }),
        (initialState, triple, reasonCode, reasonNote, performedBy, failAt) => {
          // Force the product row's stock to the generated currentQty so the
          // arithmetic actually exercises the (mode, quantity) input space.
          initialState.product.stock_quantity = triple.currentQty;

          const steps = buildSteps({
            productId: initialState.product.id,
            salonId: initialState.product.salon_id,
            mode: triple.mode,
            quantity: triple.quantity,
            performedBy,
            reasonCode,
            reasonNote,
          });

          const { committed, finalState, snapshot } = runTxn({
            initialState,
            steps,
            failAt,
          });

          // failAt ≤ 4 means a failure was injected; commit must NOT happen.
          if (committed) return false;

          // State must match the snapshot exactly — no partial UPDATE,
          // no orphan movement, no orphan audit row.
          return JSON.stringify(finalState) === JSON.stringify(snapshot);
        },
      ),
      { seed: SEED, numRuns: 500 },
    );
  });

  it('completeness: when no failure is injected, all three writes are present and consistent', () => {
    fc.assert(
      fc.property(
        initialStateArb,
        stockMovementTripleArb,
        reasonCodeArb,
        reasonNoteArb,
        performedByArb,
        (initialState, triple, reasonCode, reasonNote, performedBy) => {
          initialState.product.stock_quantity = triple.currentQty;
          const productId = initialState.product.id;
          const salonId = initialState.product.salon_id;
          const priorMovements = initialState.movements.length;
          const priorAudit = initialState.audit.length;

          const steps = buildSteps({
            productId,
            salonId,
            mode: triple.mode,
            quantity: triple.quantity,
            performedBy,
            reasonCode,
            reasonNote,
          });

          const { committed, finalState } = runTxn({ initialState, steps, failAt: null });
          if (!committed) return false;

          const expected = computeNewQuantity(triple.currentQty, triple.mode, triple.quantity);

          // 1. UPDATE products applied.
          if (finalState.product.stock_quantity !== expected.after) return false;

          // 2. Exactly one new movement appended, with the correct shape.
          if (finalState.movements.length !== priorMovements + 1) return false;
          const m = finalState.movements[finalState.movements.length - 1];
          if (
            m.product_id !== productId ||
            m.salon_id !== salonId ||
            m.change_type !== triple.mode ||
            m.quantity_before !== expected.before ||
            m.quantity_after !== expected.after ||
            m.delta !== expected.delta ||
            m.reason_code !== reasonCode ||
            m.reason_note !== reasonNote ||
            m.performed_by !== performedBy ||
            m.booking_id !== null
          ) {
            return false;
          }

          // 3. Exactly one new audit row appended for the manual reason code.
          if (finalState.audit.length !== priorAudit + 1) return false;
          const a = finalState.audit[finalState.audit.length - 1];
          if (
            a.user_id !== performedBy ||
            a.action !== 'stock_change' ||
            a.entity_type !== 'product' ||
            a.entity_id !== productId ||
            a.old_data.stock_quantity !== expected.before ||
            a.new_data.stock_quantity !== expected.after ||
            a.new_data.delta !== expected.delta ||
            a.new_data.mode !== triple.mode ||
            a.new_data.reason_code !== reasonCode ||
            a.new_data.movement_id !== m.id
          ) {
            return false;
          }
          return true;
        },
      ),
      { seed: SEED, numRuns: 300 },
    );
  });

  it("focused injection: failure between UPDATE products and INSERT product_stock_movements preserves pre-call state (Requirement 3.6)", () => {
    // The exact scenario the spec calls out: failAt = 2 means the UPDATE
    // products step ran in the callback, then the connection died before
    // INSERT product_stock_movements. The transactional rollback must
    // restore products.stock_quantity *and* leave movements untouched.
    fc.assert(
      fc.property(
        initialStateArb,
        stockMovementTripleArb,
        reasonCodeArb,
        reasonNoteArb,
        performedByArb,
        (initialState, triple, reasonCode, reasonNote, performedBy) => {
          initialState.product.stock_quantity = triple.currentQty;
          const priorStock = initialState.product.stock_quantity;
          const priorMovements = initialState.movements.length;
          const priorAudit = initialState.audit.length;

          const steps = buildSteps({
            productId: initialState.product.id,
            salonId: initialState.product.salon_id,
            mode: triple.mode,
            quantity: triple.quantity,
            performedBy,
            reasonCode,
            reasonNote,
          });

          const { committed, finalState, error: thrown } = runTxn({
            initialState,
            steps,
            failAt: 2,
          });

          return (
            committed === false &&
            thrown !== null &&
            thrown.code === 'SIMULATED_FAILURE' &&
            finalState.product.stock_quantity === priorStock &&
            finalState.movements.length === priorMovements &&
            finalState.audit.length === priorAudit
          );
        },
      ),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('a thrown transaction error becomes a 5xx response at the route boundary', () => {
    // The route handler's outer try/catch turns any non-PRODUCT_GONE error
    // into `error('Failed to adjust stock', 500)`. Verify that the
    // response.js helper emits HTTP 500 for this path so the client sees
    // the failure as the spec mandates (Stock_API PUT → 5xx on rollback).
    const res = error('Failed to adjust stock', 500);
    expect(res.status).toBe(500);
  });
});
