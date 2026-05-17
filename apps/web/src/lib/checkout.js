/**
 * checkout.js — Core money flow logic for booking checkout.
 *
 * All monetary calculations happen server-side from DB rows.
 * Never trust frontend totals.
 *
 * Functions:
 *   calculateBookingTotal(bookingId, conn)
 *   addProductToBooking(bookingId, productId, quantity, conn, options?)
 *   processCheckout(bookingId, { method, tipAmount, promoCode, performedBy }, conn)
 *
 * Stock movement integration (Task 3.2 — Requirements 4.5, 20.3, 22.1, 22.2):
 *   `addProductToBooking` writes a `product_stock_movements` row in the same
 *   `conn` as the `booking_products` INSERT and `products.stock_quantity`
 *   UPDATE. A positive `quantity` (sale) records `reason_code='sale'` with
 *   `change_type='subtract'` and a negative signed `delta`. A negative
 *   `quantity` (refund reversal) records `reason_code='refund'` with
 *   `change_type='add'` and a positive `delta`.
 *
 *   The movement INSERT is part of the surrounding transaction: any failure
 *   rolls back the booking-product line, the stock update, AND the payment
 *   write that `processCheckout` would otherwise commit. Sale and refund
 *   paths intentionally do NOT touch `audit_logs` — booking and payment
 *   activity is audited at a higher level.
 */

// ---------------------------------------------------------------------------
// CheckoutError — typed error for checkout failures
// ---------------------------------------------------------------------------

export class CheckoutError extends Error {
  constructor(code, message, httpStatus = 400) {
    super(message);
    this.name = "CheckoutError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// ---------------------------------------------------------------------------
// calculateBookingTotal
// ---------------------------------------------------------------------------

/**
 * Compute the final booking total strictly from DB rows.
 *
 * Total = SUM(services) + SUM(products) + SUM(travel_fees)
 *       - SUM(discounts) - SUM(gift_cards)
 *
 * Travel fees are stored in booking_travel_fees (inserted by createSafeBooking
 * for mobile bookings). They are NEVER trusted from the frontend payload.
 *
 * @param {number} bookingId
 * @param {import('mysql2/promise').PoolConnection} conn  Active DB connection
 * @returns {Promise<{servicesTotal, productsTotal, travelTotal, discountsTotal, giftCardsTotal, finalTotal}>}
 */
export async function calculateBookingTotal(bookingId, conn) {
  // Services
  const [[servicesRow]] = await conn.query(
    "SELECT COALESCE(SUM(price), 0) AS total FROM booking_services WHERE booking_id = ?",
    [bookingId]
  );

  // Products
  const [[productsRow]] = await conn.query(
    "SELECT COALESCE(SUM(total_price), 0) AS total FROM booking_products WHERE booking_id = ?",
    [bookingId]
  );

  // Travel fees (mobile bookings only — zero for physical/virtual)
  const [[travelRow]] = await conn.query(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM booking_travel_fees WHERE booking_id = ?",
    [bookingId]
  );

  // Discounts
  const [[discountsRow]] = await conn.query(
    "SELECT COALESCE(SUM(amount_saved), 0) AS total FROM booking_discounts WHERE booking_id = ?",
    [bookingId]
  );

  // Gift cards
  const [[giftCardsRow]] = await conn.query(
    "SELECT COALESCE(SUM(amount_used), 0) AS total FROM booking_gift_cards WHERE booking_id = ?",
    [bookingId]
  );

  const servicesTotal  = parseFloat(servicesRow.total);
  const productsTotal  = parseFloat(productsRow.total);
  const travelTotal    = parseFloat(travelRow.total);
  const discountsTotal = parseFloat(discountsRow.total);
  const giftCardsTotal = parseFloat(giftCardsRow.total);

  const finalTotal = Math.max(
    0,
    servicesTotal + productsTotal + travelTotal - discountsTotal - giftCardsTotal
  );

  return {
    servicesTotal:  round2(servicesTotal),
    productsTotal:  round2(productsTotal),
    travelTotal:    round2(travelTotal),
    discountsTotal: round2(discountsTotal),
    giftCardsTotal: round2(giftCardsTotal),
    finalTotal:     round2(finalTotal),
  };
}

// ---------------------------------------------------------------------------
// addProductToBooking
// ---------------------------------------------------------------------------

/**
 * Add (or reverse) a product line-item on a booking.
 *
 * Positive `quantity` is the standard "add product at checkout" path:
 *   - INSERT booking_products
 *   - UPDATE products SET stock_quantity = stock_quantity - quantity
 *   - INSERT product_stock_movements with reason_code='sale',
 *     change_type='subtract', delta = -quantity
 *
 * Negative `quantity` is the refund-reversal path used by
 * `/api/checkout/refund`. It restores stock and records a sale-driven movement
 * so the history captures the reversal:
 *   - INSERT booking_products row with the negative quantity (negative
 *     total_price too) so the booking ledger reflects the reversal
 *   - UPDATE products SET stock_quantity = stock_quantity + |quantity|
 *   - INSERT product_stock_movements with reason_code='refund',
 *     change_type='add', delta = +|quantity|
 *
 * The stock movement INSERT runs on the same `conn`, so a failure rolls back
 * the surrounding transaction (booking_products, products, payments, …).
 * The sale/refund paths SHALL NOT call into `audit_logs` — the booking and
 * payment flow are audited at a higher level (Requirement 20.3).
 *
 * @param {number} bookingId
 * @param {number} productId
 * @param {number} quantity                 Signed; > 0 for sale, < 0 for refund
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {{ performedBy?: number|null }} [options]
 * @returns {Promise<{product, ...breakdown}>}
 */
export async function addProductToBooking(
  bookingId,
  productId,
  quantity,
  conn,
  options = {}
) {
  const { performedBy = null } = options;

  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new CheckoutError(
      "INVALID_QUANTITY",
      "Quantity must be a non-zero integer"
    );
  }

  const isRefund = quantity < 0;
  const absQuantity = Math.abs(quantity);

  // 1. Lock the booking row and validate status
  const [[booking]] = await conn.query(
    "SELECT id, salon_id, status FROM bookings WHERE id = ? FOR UPDATE",
    [bookingId]
  );

  if (!booking) {
    throw new CheckoutError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }

  // Sales must originate from a confirmed booking. Refund reversals can occur
  // on a completed booking (after processCheckout flipped status to
  // 'completed'), so we accept both for the negative-quantity path.
  const allowedStatuses = isRefund
    ? ["confirmed", "completed"]
    : ["confirmed"];
  if (!allowedStatuses.includes(booking.status)) {
    throw new CheckoutError(
      "INVALID_STATUS",
      `Cannot ${isRefund ? "refund" : "add"} products on a booking with status: ${booking.status}.`
    );
  }

  // 2. Lock the product row, validate, and capture quantity_before
  const [[product]] = await conn.query(
    "SELECT id, salon_id, name, price, stock_quantity, is_active FROM products WHERE id = ? AND deleted_at IS NULL FOR UPDATE",
    [productId]
  );

  if (!product) {
    throw new CheckoutError("PRODUCT_NOT_FOUND", "Product not found", 404);
  }

  if (!isRefund && !product.is_active) {
    throw new CheckoutError("PRODUCT_INACTIVE", "Product is not available");
  }

  if (product.salon_id !== booking.salon_id) {
    throw new CheckoutError(
      "PRODUCT_WRONG_SALON",
      "Product does not belong to this salon"
    );
  }

  if (!isRefund && product.stock_quantity < absQuantity) {
    throw new CheckoutError(
      "INSUFFICIENT_STOCK",
      `Only ${product.stock_quantity} units available`
    );
  }

  // 3. Insert into booking_products using the DB price (never frontend price).
  //    For refunds, we record a negative quantity and negative total so the
  //    booking ledger reflects the reversal.
  const unitPrice = parseFloat(product.price);
  const totalPrice = round2(unitPrice * quantity);

  await conn.query(
    `INSERT INTO booking_products (booking_id, product_id, quantity, unit_price, total_price)
     VALUES (?, ?, ?, ?, ?)`,
    [bookingId, productId, quantity, unitPrice, totalPrice]
  );

  // 4. Adjust stock. Sale subtracts; refund adds. Use a signed expression so
  //    the math is symmetric: `stock_quantity - quantity` (quantity already
  //    carries the sign).
  const quantityBefore = product.stock_quantity;
  const quantityAfter = quantityBefore - quantity; // sale: subtract; refund: add

  await conn.query(
    "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
    [quantity, productId]
  );

  // 5. Record the stock movement in the same transaction. INSERT failure
  //    rolls back the booking_products INSERT, the products UPDATE, and the
  //    surrounding payment write that `processCheckout` would otherwise
  //    commit (Requirements 22.1, 22.2). Sale/refund movements are NOT
  //    audit-logged — booking/payment flow is audited at a higher level
  //    (Requirement 20.3).
  const reasonCode = isRefund ? "refund" : "sale";
  const changeType = isRefund ? "add" : "subtract";
  const delta = quantityAfter - quantityBefore; // signed: -qty for sale, +qty for refund

  await conn.query(
    `INSERT INTO product_stock_movements
       (product_id, salon_id, change_type, quantity_before, quantity_after,
        delta, reason_code, reason_note, performed_by, booking_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NOW())`,
    [
      product.id,
      product.salon_id,
      changeType,
      quantityBefore,
      quantityAfter,
      delta,
      reasonCode,
      performedBy,
      bookingId,
    ]
  );

  // 6. Return updated total
  const updatedTotal = await calculateBookingTotal(bookingId, conn);

  return {
    product: {
      id: product.id,
      name: product.name,
      quantity,
      unitPrice,
      totalPrice,
    },
    ...updatedTotal,
  };
}

// ---------------------------------------------------------------------------
// processCheckout
// ---------------------------------------------------------------------------

/**
 * Full transactional checkout:
 *   1. Lock booking row FOR UPDATE
 *   2. Validate status = 'confirmed'
 *   3. Calculate total from DB
 *   4. Insert payment row
 *   5. Update booking status → 'completed'
 *   6. Return payment receipt
 *
 * Stock movements: this function does NOT INSERT into
 * `product_stock_movements` directly. Sale-driven stock changes are recorded
 * by `addProductToBooking` (the only path that mutates
 * `products.stock_quantity` for a booking) at the moment the line-item is
 * added. Because `processCheckout` runs inside the caller's transaction
 * alongside any `addProductToBooking` call, a failure in the movement INSERT
 * rolls back the entire checkout — no payment is marked paid, no stock
 * decrement persists (Requirements 22.1, 22.2). The sale path SHALL NOT
 * write to `audit_logs` (Requirement 20.3).
 *
 * Must be called inside db.transaction().
 *
 * @param {number} bookingId
 * @param {{ method: 'cash'|'card', tipAmount?: number }} options
 * @param {import('mysql2/promise').PoolConnection} conn
 * @returns {Promise<{payment, booking, breakdown}>}
 */
export async function processCheckout(bookingId, { method, tipAmount = 0, promoCode = null }, conn) {
  // 1. Lock booking row
  const [[booking]] = await conn.query(
    "SELECT id, salon_id, client_id, staff_id, status FROM bookings WHERE id = ? FOR UPDATE",
    [bookingId]
  );

  if (!booking) {
    throw new CheckoutError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }

  // 2. Validate status
  if (booking.status !== "confirmed") {
    throw new CheckoutError(
      "INVALID_STATUS",
      `Cannot checkout a booking with status '${booking.status}'. Must be 'confirmed'.`
    );
  }

  // 3. Check for existing payment (UNIQUE constraint backup)
  const [[existingPayment]] = await conn.query(
    "SELECT id, status FROM payments WHERE booking_id = ?",
    [bookingId]
  );

  if (existingPayment && existingPayment.status === 'paid') {
    throw new CheckoutError(
      "ALREADY_PAID",
      "This booking already has a paid payment recorded",
      409
    );
  }

  // 4. Calculate total from DB
  const breakdown = await calculateBookingTotal(bookingId, conn);

  if (breakdown.finalTotal <= 0 && breakdown.servicesTotal <= 0) {
    throw new CheckoutError(
      "ZERO_TOTAL",
      "Cannot process checkout with zero total and no services"
    );
  }

  // Handle Global Promo Code
  let amountSaved = 0;
  let appliedPromo = null;

  if (promoCode) {
    const [[promo]] = await conn.query(
      `SELECT id, type, value, min_purchase, max_uses, current_uses
         FROM global_discounts
        WHERE code = ?
          AND is_active = 1
          AND (start_date IS NULL OR start_date <= CURDATE())
          AND (end_date IS NULL OR end_date >= CURDATE())
        FOR UPDATE`,
      [promoCode]
    );

    if (!promo) {
      throw new CheckoutError("INVALID_PROMO", "The provided promo code is invalid or expired", 400);
    }

    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      throw new CheckoutError("PROMO_LIMIT_REACHED", "This promo code has reached its maximum usage limit", 400);
    }

    const minPurchase = parseFloat(promo.min_purchase || 0);
    if (minPurchase > 0 && breakdown.finalTotal < minPurchase) {
      throw new CheckoutError("PROMO_MIN_PURCHASE", `Minimum purchase of ${minPurchase} required to use this code`, 400);
    }

    if (promo.type === 'fixed') {
      amountSaved = Math.min(parseFloat(promo.value), breakdown.finalTotal);
    } else {
      amountSaved = round2(breakdown.finalTotal * (parseFloat(promo.value) / 100));
    }

    appliedPromo = promo;
  }

  const finalAmountDue = Math.max(0, breakdown.finalTotal - amountSaved);
  const tip = round2(Math.max(0, tipAmount));

  // 5. Insert payment
  const [paymentResult] = await conn.query(
    `INSERT INTO payments (booking_id, amount, method, status, tip_amount, created_at)
     VALUES (?, ?, ?, 'paid', ?, NOW())
     ON DUPLICATE KEY UPDATE 
       amount = VALUES(amount), 
       method = VALUES(method), 
       status = VALUES(status), 
       tip_amount = VALUES(tip_amount)`,
    [bookingId, finalAmountDue, method, tip]
  );

  // 5.5 If promo applied, absorb cost via negative platform fee and increase usage
  if (appliedPromo && amountSaved > 0) {
    await conn.query(
      `INSERT INTO platform_fees (booking_id, salon_id, type, amount, is_paid)
       VALUES (?, ?, 'global_promo', ?, 0)`,
      [bookingId, booking.salon_id, -amountSaved]
    );

    await conn.query(
      `UPDATE global_discounts SET current_uses = current_uses + 1 WHERE id = ?`,
      [appliedPromo.id]
    );
  }

  // 6. Mark booking completed
  await conn.query(
    "UPDATE bookings SET status = 'completed' WHERE id = ?",
    [bookingId]
  );

  // 7. Update salon_clients visit statistics
  if (booking.client_id) {
    await conn.query(
      `UPDATE salon_clients 
       SET total_visits = total_visits + 1, 
           last_visit_date = NOW() 
       WHERE salon_id = ? AND client_id = ?`,
      [booking.salon_id, booking.client_id]
    );
  }

  return {
    payment: {
      id: paymentResult.insertId,
      bookingId,
      amount: finalAmountDue,
      method,
      tipAmount: tip,
      status: "paid",
      promoDiscount: amountSaved > 0 ? amountSaved : undefined,
    },
    booking: {
      id: booking.id,
      salonId: booking.salon_id,
      clientId: booking.client_id,
      staffId: booking.staff_id,
      status: "completed",
    },
    breakdown,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n) {
  return Math.round(n * 100) / 100;
}
