/**
 * Unit tests for `src/lib/checkout.js` stock-movement integration
 * (Task 3.2 — Requirements 4.5, 20.3, 22.1, 22.2).
 *
 * These tests exercise `addProductToBooking` against a fake `conn` that
 * captures every SQL statement and lets us inject failures at any step.
 * The fake conn intentionally mirrors mysql2's `[rows, fields] = conn.query`
 * tuple shape so the production code can be reused unchanged.
 */

import { describe, it, expect } from 'vitest';
import { addProductToBooking, CheckoutError } from '@/lib/checkout';

// ---------------------------------------------------------------------------
// Fake mysql2 connection
// ---------------------------------------------------------------------------

/**
 * @param {Array<{ match: RegExp, rows: any[] | ((sql: string, params: any[]) => any[]), insertId?: number, throws?: Error }>} script
 *   Ordered list of expected queries. Each entry matches the next query in
 *   sequence by SQL regex; `rows` is what the query returns. `throws` lets
 *   us simulate a failure on a specific INSERT/UPDATE statement.
 */
function makeConn(script) {
  const calls = [];
  let cursor = 0;
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      // Find the next matching script entry
      const entry = script[cursor++];
      if (!entry) {
        throw new Error(`Unexpected query (no script entry): ${sql}`);
      }
      if (!entry.match.test(sql)) {
        throw new Error(
          `Query #${cursor} did not match expected pattern.\n` +
            `Expected: ${entry.match}\nGot SQL: ${sql}`
        );
      }
      if (entry.throws) {
        throw entry.throws;
      }
      const rows =
        typeof entry.rows === 'function' ? entry.rows(sql, params) : entry.rows;
      // Mirror mysql2's [rows, fields] tuple shape; tests destructure as
      // `const [[row]] = await conn.query(...)` so wrap rows once.
      const meta = entry.insertId != null ? { insertId: entry.insertId } : undefined;
      return [rows, meta];
    },
  };
}

// Common script fragments
const lockBooking = (status = 'confirmed', salonId = 100) => ({
  match: /SELECT id, salon_id, status FROM bookings WHERE id = \? FOR UPDATE/,
  rows: [{ id: 7, salon_id: salonId, status }],
});

const lockProduct = (overrides = {}) => ({
  match: /SELECT id, salon_id, name, price, stock_quantity, is_active FROM products/,
  rows: [
    {
      id: 42,
      salon_id: 100,
      name: 'Shampoo',
      price: '10.00',
      stock_quantity: 20,
      is_active: 1,
      ...overrides,
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

// `calculateBookingTotal` issues 5 SELECTs at the end of addProductToBooking.
const calculateTotalScript = () => [
  { match: /booking_services/, rows: [{ total: 0 }] },
  { match: /booking_products/, rows: [{ total: 0 }] },
  { match: /booking_travel_fees/, rows: [{ total: 0 }] },
  { match: /booking_discounts/, rows: [{ total: 0 }] },
  { match: /booking_gift_cards/, rows: [{ total: 0 }] },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('addProductToBooking — sale path writes a stock movement', () => {
  it('inserts a product_stock_movements row with reason_code=sale and signed delta', async () => {
    const conn = makeConn([
      lockBooking('confirmed'),
      lockProduct({ stock_quantity: 20 }),
      insertBookingProduct(),
      updateProductStock(),
      insertStockMovement(),
      ...calculateTotalScript(),
    ]);

    const result = await addProductToBooking(7, 42, 3, conn, { performedBy: 11 });

    expect(result.product.quantity).toBe(3);

    const movementCall = conn.calls.find((c) =>
      /INSERT INTO product_stock_movements/.test(c.sql)
    );
    expect(movementCall).toBeDefined();
    // Params order in the route:
    // product_id, salon_id, change_type, quantity_before, quantity_after,
    // delta, reason_code, performed_by, booking_id
    expect(movementCall.params).toEqual([
      42,            // product_id
      100,           // salon_id
      'subtract',    // change_type
      20,            // quantity_before
      17,            // quantity_after  (20 - 3)
      -3,            // delta           (17 - 20)
      'sale',        // reason_code
      11,            // performed_by
      7,             // booking_id
    ]);
  });

  it('does NOT issue any audit_logs INSERT on the sale path', async () => {
    const conn = makeConn([
      lockBooking('confirmed'),
      lockProduct(),
      insertBookingProduct(),
      updateProductStock(),
      insertStockMovement(),
      ...calculateTotalScript(),
    ]);

    await addProductToBooking(7, 42, 1, conn);

    const auditCalls = conn.calls.filter((c) => /audit_logs/i.test(c.sql));
    expect(auditCalls).toHaveLength(0);
  });
});

describe('addProductToBooking — refund path (negative quantity)', () => {
  it('inserts a movement with reason_code=refund, change_type=add, positive delta', async () => {
    const conn = makeConn([
      lockBooking('completed'),                // refund happens after checkout
      lockProduct({ stock_quantity: 17 }),
      insertBookingProduct(),
      updateProductStock(),
      insertStockMovement(),
      ...calculateTotalScript(),
    ]);

    await addProductToBooking(7, 42, -2, conn, { performedBy: 88 });

    const movementCall = conn.calls.find((c) =>
      /INSERT INTO product_stock_movements/.test(c.sql)
    );
    expect(movementCall.params).toEqual([
      42,           // product_id
      100,          // salon_id
      'add',        // change_type
      17,           // quantity_before
      19,           // quantity_after  (17 - (-2))
      2,            // delta           (positive on refund)
      'refund',     // reason_code
      88,           // performed_by
      7,            // booking_id
    ]);
  });

  it('rejects quantity = 0 with INVALID_QUANTITY before touching the DB', async () => {
    const conn = makeConn([]);
    await expect(addProductToBooking(7, 42, 0, conn)).rejects.toMatchObject({
      name: 'CheckoutError',
      code: 'INVALID_QUANTITY',
    });
    expect(conn.calls).toHaveLength(0);
  });
});

describe('addProductToBooking — transactional rollback semantics', () => {
  it('propagates a movement INSERT failure so the surrounding transaction can roll back', async () => {
    const boom = new Error('movement insert failed');
    const conn = makeConn([
      lockBooking('confirmed'),
      lockProduct(),
      insertBookingProduct(),
      updateProductStock(),
      { ...insertStockMovement(), throws: boom },
    ]);

    await expect(addProductToBooking(7, 42, 1, conn)).rejects.toBe(boom);

    // calculateBookingTotal must NOT have been reached — the throw aborts
    // the function before the totals are recomputed, which proves the
    // surrounding transaction sees the failure and can roll back the
    // booking_products + products UPDATE we already issued.
    const totalCalls = conn.calls.filter((c) =>
      /booking_(services|travel_fees|discounts|gift_cards)/.test(c.sql)
    );
    expect(totalCalls).toHaveLength(0);
  });

  it('rejects sale on insufficient stock before any write occurs', async () => {
    const conn = makeConn([
      lockBooking('confirmed'),
      lockProduct({ stock_quantity: 1 }),
    ]);

    await expect(addProductToBooking(7, 42, 5, conn)).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
    });
    expect(conn.calls).toHaveLength(2);
    expect(conn.calls.some((c) => /^\s*(INSERT|UPDATE)\b/i.test(c.sql))).toBe(false);
  });
});
