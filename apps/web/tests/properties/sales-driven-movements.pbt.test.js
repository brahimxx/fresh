// Feature: products-and-sales-improvements
//
// Property 14 — Sales-driven and refund-driven stock movements are
//               exclusive and exhaustive.
//
// Validates: Requirements 4.5, 14.7, 20.3, 22.1
//
// Contract under test (the booking → stock pipeline in `src/lib/checkout.js`):
//
//   For every call to `addProductToBooking(bookingId, productId, quantity, conn)`
//   the function MUST insert exactly one row into `product_stock_movements`
//   with:
//     - reason_code   = 'sale'    when quantity > 0
//                       'refund'  when quantity < 0
//     - change_type   = 'subtract' for sale, 'add' for refund
//     - delta         = -|quantity| for sale, +|quantity| for refund
//                       (always equals quantity_after - quantity_before)
//     - booking_id    = the bookingId argument (never NULL on this path)
//     - product_id, salon_id, performed_by recorded correctly
//
//   The reason_code domain on this path is exactly {sale, refund} —
//   mutually exclusive (sign of `quantity` decides) and exhaustive
//   (no other code is ever emitted from this path; quantity = 0 is
//   rejected with INVALID_QUANTITY before any DB call).
//
//   `processCheckout` MUST NOT itself INSERT into `product_stock_movements`
//   (Requirement 20.3 + design § Stock movement integration). Sale-driven
//   movements come exclusively through the line-item path of
//   `addProductToBooking`.
//
// Strategy
//
// The function under test reads/writes through a `mysql2`-shaped `conn`.
// We reuse the lightweight scripted fake from
// `tests/unit/checkout-stock-movements.test.js` so the property test stays
// pure (no DB, no Next runtime) while exercising the production code path
// byte-for-byte. fast-check generates whole call sets (lists of
// `(productId, quantity)` tuples on a shared booking) and we re-assemble a
// fresh script for each call.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { addProductToBooking, processCheckout } from '@/lib/checkout';

const SEED = 0xA11CE;

// ---------------------------------------------------------------------------
// Fake mysql2 connection — script-driven so we can both supply rows and
// capture every issued query for post-hoc assertions.
// ---------------------------------------------------------------------------

/**
 * Build a fake `mysql2` connection from an ordered script.
 *
 * Each script entry is `{ match, rows, insertId? }`:
 *   - `match`   regex the issued SQL must satisfy (in order)
 *   - `rows`    rows or result-meta to return
 *   - `insertId` optional second-tuple meta for INSERT statements
 */
function makeConn(script) {
  const calls = [];
  let cursor = 0;
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      const entry = script[cursor++];
      if (!entry) {
        throw new Error(`Unexpected query (no script entry): ${sql}`);
      }
      if (!entry.match.test(sql)) {
        throw new Error(
          `Query #${cursor} did not match expected pattern.\n` +
            `Expected: ${entry.match}\nGot SQL: ${sql}`,
        );
      }
      const rows = typeof entry.rows === 'function' ? entry.rows(sql, params) : entry.rows;
      const meta = entry.insertId != null ? { insertId: entry.insertId } : undefined;
      return [rows, meta];
    },
    // execute() is used by `processCheckout` (well, the refund route — kept
    // here for symmetry with the unit-test fake).
    async execute(sql, params = []) {
      return this.query(sql, params);
    },
  };
}

// ---------------------------------------------------------------------------
// Script fragments (mirror `tests/unit/checkout-stock-movements.test.js`)
// ---------------------------------------------------------------------------

const lockBooking = (status, salonId) => ({
  match: /SELECT id, salon_id, status FROM bookings WHERE id = \? FOR UPDATE/,
  rows: [{ id: 7, salon_id: salonId, status }],
});

const lockProduct = ({ productId, salonId, stock, price = '10.00', isActive = 1 }) => ({
  match: /SELECT id, salon_id, name, price, stock_quantity, is_active FROM products/,
  rows: [
    {
      id: productId,
      salon_id: salonId,
      name: `Product ${productId}`,
      price,
      stock_quantity: stock,
      is_active: isActive,
    },
  ],
});

const insertBookingProduct = () => ({
  match: /INSERT INTO booking_products/,
  rows: { insertId: 555 },
  insertId: 555,
});

const updateProductStock = () => ({
  match: /UPDATE products SET stock_quantity/,
  rows: { affectedRows: 1 },
});

const insertStockMovement = () => ({
  match: /INSERT INTO product_stock_movements/,
  rows: { insertId: 999 },
  insertId: 999,
});

// `calculateBookingTotal` runs at the tail of `addProductToBooking`
// (5 SELECTs in fixed order — see `src/lib/checkout.js`).
const calculateTotalScript = () => [
  { match: /booking_services/, rows: [{ total: 0 }] },
  { match: /booking_products/, rows: [{ total: 0 }] },
  { match: /booking_travel_fees/, rows: [{ total: 0 }] },
  { match: /booking_discounts/, rows: [{ total: 0 }] },
  { match: /booking_gift_cards/, rows: [{ total: 0 }] },
];

/**
 * Compose the full happy-path script for one `addProductToBooking` call.
 * Sale path uses `'confirmed'`; refund (negative quantity) is allowed on
 * `'completed'` per the function contract.
 */
function happyScript({ bookingStatus, productId, salonId, stock }) {
  return [
    lockBooking(bookingStatus, salonId),
    lockProduct({ productId, salonId, stock }),
    insertBookingProduct(),
    updateProductStock(),
    insertStockMovement(),
    ...calculateTotalScript(),
  ];
}

// Indices into the movement INSERT params array (mirrors the route source).
const MOVEMENT_PARAM_INDEX = Object.freeze({
  product_id: 0,
  salon_id: 1,
  change_type: 2,
  quantity_before: 3,
  quantity_after: 4,
  delta: 5,
  reason_code: 6,
  performed_by: 7,
  booking_id: 8,
});

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * One booking-product call: a non-zero signed quantity plus enough stock to
 * satisfy a sale (refunds don't need stock, but we keep the same generator
 * for symmetry).
 */
const callArb = fc.record({
  productId: fc.integer({ min: 1, max: 100_000 }),
  salonId: fc.integer({ min: 1, max: 100_000 }),
  // Signed, non-zero. Sales restricted to ≤ stock; we generate stock first
  // and clamp the magnitude so generated cases are always feasible.
  quantitySign: fc.constantFrom(1, -1),
  quantityMag: fc.integer({ min: 1, max: 50 }),
  stock: fc.integer({ min: 50, max: 1_000 }),
  performedBy: fc.option(fc.integer({ min: 1, max: 100_000 }), { nil: null, freq: 3 }),
});

/** A small batch of independent calls for the per-call uniqueness assertions. */
const callBatchArb = fc.array(callArb, { minLength: 1, maxLength: 8 });

// ---------------------------------------------------------------------------
// Property 14 — per-call shape: exactly one movement, correct fields.
// ---------------------------------------------------------------------------

describe('Property 14 — sales-driven and refund-driven movements are exclusive and exhaustive', () => {
  it('every addProductToBooking call inserts exactly one movement with the right reason_code, delta, change_type, and booking_id', async () => {
    await fc.assert(
      fc.asyncProperty(callArb, async (call) => {
        const isRefund = call.quantitySign < 0;
        const signedQty = call.quantitySign * call.quantityMag;

        const bookingId = 7;
        const conn = makeConn(
          happyScript({
            bookingStatus: isRefund ? 'completed' : 'confirmed',
            productId: call.productId,
            salonId: call.salonId,
            stock: call.stock,
          }),
        );

        await addProductToBooking(bookingId, call.productId, signedQty, conn, {
          performedBy: call.performedBy,
        });

        const movementCalls = conn.calls.filter((c) =>
          /INSERT INTO product_stock_movements/.test(c.sql),
        );

        // Exactly one movement per call (exhaustive).
        expect(movementCalls).toHaveLength(1);

        const params = movementCalls[0].params;
        const reasonCode = params[MOVEMENT_PARAM_INDEX.reason_code];
        const changeType = params[MOVEMENT_PARAM_INDEX.change_type];
        const before = params[MOVEMENT_PARAM_INDEX.quantity_before];
        const after = params[MOVEMENT_PARAM_INDEX.quantity_after];
        const delta = params[MOVEMENT_PARAM_INDEX.delta];

        // Sale ↔ refund are exclusive — the sign of `quantity` decides.
        if (isRefund) {
          expect(reasonCode).toBe('refund');
          expect(changeType).toBe('add');
          expect(delta).toBe(call.quantityMag); // positive
        } else {
          expect(reasonCode).toBe('sale');
          expect(changeType).toBe('subtract');
          expect(delta).toBe(-call.quantityMag); // negative
        }

        // delta consistency with before/after — independent of sign.
        expect(delta).toBe(after - before);
        // Magnitude matches the request quantity exactly (no clamping on
        // this path; `addProductToBooking` rejects insufficient stock
        // before it ever reaches the movement INSERT).
        expect(Math.abs(delta)).toBe(call.quantityMag);

        // booking_id is recorded on every movement (never NULL on this path).
        expect(params[MOVEMENT_PARAM_INDEX.booking_id]).toBe(bookingId);
        // product_id and salon_id flow through.
        expect(params[MOVEMENT_PARAM_INDEX.product_id]).toBe(call.productId);
        expect(params[MOVEMENT_PARAM_INDEX.salon_id]).toBe(call.salonId);
        // performed_by flows through unchanged (null is allowed).
        expect(params[MOVEMENT_PARAM_INDEX.performed_by]).toBe(call.performedBy);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('reason_code is always exactly one of {sale, refund} on this path', async () => {
    // Exhaustiveness: nothing else is ever emitted from `addProductToBooking`.
    // Exclusivity: a single call never emits both codes.
    await fc.assert(
      fc.asyncProperty(callArb, async (call) => {
        const isRefund = call.quantitySign < 0;
        const signedQty = call.quantitySign * call.quantityMag;

        const conn = makeConn(
          happyScript({
            bookingStatus: isRefund ? 'completed' : 'confirmed',
            productId: call.productId,
            salonId: call.salonId,
            stock: call.stock,
          }),
        );

        await addProductToBooking(7, call.productId, signedQty, conn, {
          performedBy: call.performedBy,
        });

        const codes = conn.calls
          .filter((c) => /INSERT INTO product_stock_movements/.test(c.sql))
          .map((c) => c.params[MOVEMENT_PARAM_INDEX.reason_code]);

        expect(codes).toHaveLength(1);
        expect(['sale', 'refund']).toContain(codes[0]);
        // The single emitted code lines up with the sign of `quantity`.
        expect(codes[0]).toBe(isRefund ? 'refund' : 'sale');
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('a batch of N independent calls produces exactly N movement INSERTs (one per call, none added or dropped)', async () => {
    await fc.assert(
      fc.asyncProperty(callBatchArb, async (batch) => {
        // Run each call against its own fake conn so the scripts stay simple
        // and isolated; sum the movement counts and per-call codes.
        const codes = [];
        for (const call of batch) {
          const isRefund = call.quantitySign < 0;
          const signedQty = call.quantitySign * call.quantityMag;
          const conn = makeConn(
            happyScript({
              bookingStatus: isRefund ? 'completed' : 'confirmed',
              productId: call.productId,
              salonId: call.salonId,
              stock: call.stock,
            }),
          );
          await addProductToBooking(7, call.productId, signedQty, conn, {
            performedBy: call.performedBy,
          });
          const movementCalls = conn.calls.filter((c) =>
            /INSERT INTO product_stock_movements/.test(c.sql),
          );
          // Exactly one per call.
          expect(movementCalls).toHaveLength(1);
          codes.push(movementCalls[0].params[MOVEMENT_PARAM_INDEX.reason_code]);
        }

        expect(codes).toHaveLength(batch.length);
        for (const c of codes) expect(['sale', 'refund']).toContain(c);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14 (continued) — `processCheckout` does NOT itself touch
// product_stock_movements. Sale-driven movements only come from the
// addProductToBooking line-item path.
// ---------------------------------------------------------------------------

describe('Property 14 — processCheckout never INSERTs into product_stock_movements directly', () => {
  /**
   * Build a script for one happy-path `processCheckout(bookingId, opts, conn)` run.
   *
   * Mirrors the SQL sequence in `src/lib/checkout.js#processCheckout` for
   * the no-promo, no-prior-payment, with-client branch — the same shape
   * a real "complete this booking with X tip" call follows.
   */
  function processCheckoutScript({ tipAmount, hasClient }) {
    const script = [
      // 1. Lock booking
      {
        match: /SELECT id, salon_id, client_id, staff_id, status FROM bookings WHERE id = \? FOR UPDATE/,
        rows: [
          {
            id: 7,
            salon_id: 100,
            client_id: hasClient ? 999 : null,
            staff_id: 1,
            status: 'confirmed',
          },
        ],
      },
      // 3. Existing-payment check
      {
        match: /SELECT id, status FROM payments WHERE booking_id = \?/,
        rows: [],
      },
      // 4. calculateBookingTotal — services has a non-zero amount so the
      //    ZERO_TOTAL guard doesn't fire.
      { match: /booking_services/, rows: [{ total: 50 }] },
      { match: /booking_products/, rows: [{ total: 0 }] },
      { match: /booking_travel_fees/, rows: [{ total: 0 }] },
      { match: /booking_discounts/, rows: [{ total: 0 }] },
      { match: /booking_gift_cards/, rows: [{ total: 0 }] },
      // 5. INSERT payments
      {
        match: /INSERT INTO payments/,
        rows: { insertId: 321 },
        insertId: 321,
      },
      // 6. UPDATE bookings → completed
      {
        match: /UPDATE bookings SET status = 'completed' WHERE id = \?/,
        rows: { affectedRows: 1 },
      },
    ];
    if (hasClient) {
      // 7. UPDATE salon_clients (visit stats)
      script.push({
        match: /UPDATE salon_clients/,
        rows: { affectedRows: 1 },
      });
    }
    // The optional tip is just a parameter — no extra SQL.
    void tipAmount;
    return script;
  }

  it('runs the full checkout pipeline with zero direct movement INSERTs', async () => {
    const checkoutOptsArb = fc.record({
      method: fc.constantFrom('cash', 'card'),
      tipAmount: fc.integer({ min: 0, max: 100 }),
      hasClient: fc.boolean(),
    });

    await fc.assert(
      fc.asyncProperty(checkoutOptsArb, async (opts) => {
        const conn = makeConn(processCheckoutScript(opts));

        await processCheckout(7, { method: opts.method, tipAmount: opts.tipAmount }, conn);

        // No path inside processCheckout itself writes to the movement table —
        // every sale/refund movement flows through addProductToBooking.
        const movementWrites = conn.calls.filter((c) =>
          /INSERT INTO product_stock_movements/.test(c.sql),
        );
        expect(movementWrites).toHaveLength(0);

        // Defensive: processCheckout also doesn't UPDATE products.stock_quantity
        // directly. The only legal mutators are addProductToBooking and the
        // manual stock route — both of which insert a movement alongside.
        const stockUpdates = conn.calls.filter((c) =>
          /UPDATE\s+products\s+SET\s+stock_quantity/i.test(c.sql),
        );
        expect(stockUpdates).toHaveLength(0);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });
});
