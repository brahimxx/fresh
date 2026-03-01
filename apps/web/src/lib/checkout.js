/**
 * checkout.js — Core money flow logic for booking checkout.
 *
 * All monetary calculations happen server-side from DB rows.
 * Never trust frontend totals.
 *
 * Functions:
 *   calculateBookingTotal(bookingId, conn)
 *   addProductToBooking(bookingId, productId, quantity, conn)
 *   processCheckout(bookingId, { method, tipAmount }, conn)
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
 * Total = SUM(services) + SUM(products) - SUM(discounts) - SUM(gift_cards)
 *
 * @param {number} bookingId
 * @param {import('mysql2/promise').PoolConnection} conn  Active DB connection
 * @returns {Promise<{servicesTotal, productsTotal, discountsTotal, giftCardsTotal, finalTotal}>}
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

  const servicesTotal = parseFloat(servicesRow.total);
  const productsTotal = parseFloat(productsRow.total);
  const discountsTotal = parseFloat(discountsRow.total);
  const giftCardsTotal = parseFloat(giftCardsRow.total);

  const finalTotal = Math.max(
    0,
    servicesTotal + productsTotal - discountsTotal - giftCardsTotal
  );

  return {
    servicesTotal: round2(servicesTotal),
    productsTotal: round2(productsTotal),
    discountsTotal: round2(discountsTotal),
    giftCardsTotal: round2(giftCardsTotal),
    finalTotal: round2(finalTotal),
  };
}

// ---------------------------------------------------------------------------
// addProductToBooking
// ---------------------------------------------------------------------------

/**
 * Add a product line-item to a booking.
 * Validates the product exists, is active, belongs to the same salon,
 * and the booking is in a valid state for modifications.
 *
 * @param {number} bookingId
 * @param {number} productId
 * @param {number} quantity
 * @param {import('mysql2/promise').PoolConnection} conn
 * @returns {Promise<{productRow, updatedTotal}>}
 */
export async function addProductToBooking(bookingId, productId, quantity, conn) {
  // 1. Lock the booking row and validate status
  const [[booking]] = await conn.query(
    "SELECT id, salon_id, status FROM bookings WHERE id = ? FOR UPDATE",
    [bookingId]
  );

  if (!booking) {
    throw new CheckoutError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }

  if (booking.status !== "confirmed") {
    throw new CheckoutError(
      "INVALID_STATUS",
      `Cannot add products to a booking with status: ${booking.status}. Must be 'confirmed'.`
    );
  }

  // 2. Validate the product
  const [[product]] = await conn.query(
    "SELECT id, salon_id, name, price, stock_quantity, is_active FROM products WHERE id = ? AND deleted_at IS NULL",
    [productId]
  );

  if (!product) {
    throw new CheckoutError("PRODUCT_NOT_FOUND", "Product not found", 404);
  }

  if (!product.is_active) {
    throw new CheckoutError("PRODUCT_INACTIVE", "Product is not available");
  }

  if (product.salon_id !== booking.salon_id) {
    throw new CheckoutError(
      "PRODUCT_WRONG_SALON",
      "Product does not belong to this salon"
    );
  }

  if (product.stock_quantity < quantity) {
    throw new CheckoutError(
      "INSUFFICIENT_STOCK",
      `Only ${product.stock_quantity} units available`
    );
  }

  // 3. Insert into booking_products using the DB price (never frontend price)
  const unitPrice = parseFloat(product.price);
  const totalPrice = round2(unitPrice * quantity);

  await conn.query(
    `INSERT INTO booking_products (booking_id, product_id, quantity, unit_price, total_price)
     VALUES (?, ?, ?, ?, ?)`,
    [bookingId, productId, quantity, unitPrice, totalPrice]
  );

  // 4. Decrement stock
  await conn.query(
    "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
    [quantity, productId]
  );

  // 5. Return updated total
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
    "SELECT id FROM payments WHERE booking_id = ?",
    [bookingId]
  );

  if (existingPayment) {
    throw new CheckoutError(
      "ALREADY_PAID",
      "This booking already has a payment recorded",
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
     VALUES (?, ?, ?, 'paid', ?, NOW())`,
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
