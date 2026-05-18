/**
 * /api/payments/[id] — Payment detail (Task 6.2, Requirements 13.1, 13.2, 13.3, 13.4, 18.3).
 *
 * GET returns the canonical snake_case payment row plus the full breakdown
 * (services_amount, products_amount, subtotal, discount_amount, discount_code,
 * gift_card_amount, tip_amount, amount, refunded_amount, stripe_payment_intent_id)
 * computed identically to `calculateBookingTotal()` in `src/lib/checkout.js`.
 *
 * Additionally includes `line_items: { services: [...], products: [...] }` with
 * individual booking_services and booking_products rows shaped as
 * `{ name, quantity, unit_price, line_total }` for the receipt drill-down (Req 18.3).
 *
 * PUT changes the payment status, restricted to the canonical 4-value enum.
 *
 * Authorisation:
 *   GET → `assertSalonAccess({ perm: 'sales' })`
 *   PUT → `assertSalonAccess({ perm: 'sales_manage' })`
 *
 * Cross-salon target → 404 with the same `{ code: 'NOT_FOUND' }` body shape as
 * a genuinely-missing resource (Requirement 1.3, 4.6, design Property 4).
 */

import { decodeId } from '@/lib/id';
import { query, transaction } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { assertSalonAccess } from '@/lib/permissions-server';
import { success, error, unauthorized, forbidden } from '@/lib/response';
import { calculateBookingTotal } from '@/lib/checkout';

// Canonical 4-value enum for `payments.status` (Requirements 12.1, 12.10).
const CANONICAL_PAYMENT_STATUS = new Set([
  'pending',
  'paid',
  'refunded',
  'partially_refunded',
]);

const NOT_FOUND_BODY = { code: 'NOT_FOUND', message: 'Payment not found' };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isPositiveInteger(v) {
  return typeof v === 'number' && Number.isInteger(v) && v > 0;
}

/**
 * Round to 2 decimal places, matching `calculateBookingTotal`'s `round2`.
 */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Coalesce a possibly-null DB numeric to `0` and round.
 * Numeric fields default to `0` when DB is `NULL` (Requirement 13.1).
 */
function num(value) {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? round2(n) : 0;
}

/**
 * Walk-in / orphan client mapping (Requirement 13.5):
 * when the joined `users` row is missing or soft-deleted, the row stays but
 * `client_id` becomes null and `client_name` becomes "Walk-in Guest".
 */
function mapClient(row) {
  const hasUser = row.user_id != null && row.user_deleted_at == null;
  if (!hasUser) {
    return { client_id: null, client_name: 'Walk-in Guest', client_email: null };
  }
  const first = (row.first_name || '').trim();
  const last = (row.last_name || '').trim();
  const fullName = [first, last].filter(Boolean).join(' ').trim();
  return {
    client_id: row.user_id,
    client_name: fullName || 'Walk-in Guest',
    client_email: row.email || null,
  };
}

/**
 * Convert a MySQL DATETIME (server tz) to ISO 8601 UTC string, or null.
 */
function toIso(dt) {
  if (!dt) return null;
  const d = dt instanceof Date ? dt : new Date(dt);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Fetch the payment + booking + (optional) user row. Returns `null` when the
 * payment doesn't exist OR the joined booking has been hard-deleted.
 *
 * The user join is intentionally LEFT so walk-in / soft-deleted clients still
 * surface the payment row (Requirement 13.5).
 */
async function fetchPayment(paymentId) {
  const rows = await query(
    `SELECT p.id, p.booking_id, p.amount, p.method, p.status,
            p.refunded_amount, p.tip_amount, p.stripe_payment_id,
            p.notes, p.created_at,
            b.salon_id, b.client_id, b.start_datetime,
            u.id           AS user_id,
            u.first_name   AS first_name,
            u.last_name    AS last_name,
            u.email        AS email,
            u.deleted_at   AS user_deleted_at
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       LEFT JOIN users u ON u.id = b.client_id
      WHERE p.id = ?
      LIMIT 1`,
    [paymentId],
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// GET /api/payments/[id]
// ---------------------------------------------------------------------------

export async function GET(_request, { params }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) return unauthorized();

    const resolved = await params;
    const id = decodeId(resolved.id);
    if (!isPositiveInteger(id)) {
      // A malformed id can't refer to a real payment — match the cross-salon
      // 404 body shape so existence cannot be inferred from the response.
      return error(NOT_FOUND_BODY, 404);
    }

    const row = await fetchPayment(id);
    if (!row) return error(NOT_FOUND_BODY, 404);

    // Authorisation. Cross-salon staff (or any caller without `sales` on this
    // salon) gets the same NOT_FOUND body as a genuinely-missing payment.
    const access = await assertSalonAccess({
      session,
      salonId: row.salon_id,
      perm: 'sales',
    });
    if (!access.ok) {
      if (access.status === 401) return unauthorized();
      if (access.status === 403) return error(NOT_FOUND_BODY, 404);
      // 400 (malformed salon id from DB shouldn't normally happen here) →
      // surface as the documented validation code.
      return error({ code: access.code, message: access.code }, access.status);
    }

    // Compute the full breakdown using the shared checkout helper so the
    // numbers are byte-equal to `calculateBookingTotal()` (Requirement 13.2).
    const breakdown = await transaction(async (conn) =>
      calculateBookingTotal(row.booking_id, conn),
    );

    const tipAmount = num(row.tip_amount);
    const subtotal = round2(breakdown.servicesTotal + breakdown.productsTotal);

    // Pull the discount code (if any). A booking may carry multiple discount
    // rows in the schema; the documented field is the single applied code, so
    // we surface the first row deterministically and fall back to `null`
    // (Requirement 13.2).
    const [discountRow] = await query(
      'SELECT discount_code FROM booking_discounts WHERE booking_id = ? ORDER BY id ASC LIMIT 1',
      [row.booking_id],
    );
    const discountCode = discountRow?.discount_code || null;

    // Fetch individual line items for the receipt drill-down (Req 18.3).
    // Services: join `services` for the name.
    const serviceItems = await query(
      `SELECT s.name, bs.price AS unit_price, 1 AS quantity, bs.price AS line_total
         FROM booking_services bs
         JOIN services s ON s.id = bs.service_id
        WHERE bs.booking_id = ?
        ORDER BY bs.start_datetime ASC`,
      [row.booking_id],
    );

    // Products: join `products` for the name. Exclude refund-reversal rows
    // (negative quantity) from the line-item display — they are reflected in
    // the refunded_amount aggregate instead.
    const productItems = await query(
      `SELECT p.name, bp.unit_price, bp.quantity, bp.total_price AS line_total
         FROM booking_products bp
         JOIN products p ON p.id = bp.product_id
        WHERE bp.booking_id = ? AND bp.quantity > 0
        ORDER BY bp.created_at ASC`,
      [row.booking_id],
    );

    const client = mapClient(row);

    const body = {
      // Listing-shape keys (Req 13.1) ------------------------------------
      id: row.id,
      booking_id: row.booking_id,
      client_id: client.client_id,
      client_name: client.client_name,
      client_email: client.client_email,
      booking_datetime: toIso(row.start_datetime),
      amount: num(row.amount),
      method: row.method,
      status: row.status,
      refunded_amount: num(row.refunded_amount),
      tip_amount: tipAmount,
      stripe_payment_id: row.stripe_payment_id || null,
      notes: row.notes || null,
      created_at: toIso(row.created_at),
      // Detail breakdown (Req 13.2, 13.3) --------------------------------
      services_amount: breakdown.servicesTotal,
      products_amount: breakdown.productsTotal,
      subtotal,
      discount_amount: breakdown.discountsTotal,
      discount_code: discountCode,
      gift_card_amount: breakdown.giftCardsTotal,
      stripe_payment_intent_id: row.stripe_payment_id || null,
      // Individual line items (Req 18.3) ----------------------------------
      line_items: {
        services: serviceItems.map(function (r) {
          return {
            name: r.name,
            quantity: Number(r.quantity),
            unit_price: num(r.unit_price),
            line_total: num(r.line_total),
          };
        }),
        products: productItems.map(function (r) {
          return {
            name: r.name,
            quantity: Number(r.quantity),
            unit_price: num(r.unit_price),
            line_total: num(r.line_total),
          };
        }),
      },
    };

    return success(body);
  } catch (err) {
    console.error('GET /api/payments/[id] error:', err);
    return error({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to load payment' }, 500);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/payments/[id] — status update, canonical enum only (Req 13.4)
// ---------------------------------------------------------------------------

export async function PUT(request, { params }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) return unauthorized();

    const resolved = await params;
    const id = decodeId(resolved.id);
    if (!isPositiveInteger(id)) {
      return error(NOT_FOUND_BODY, 404);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return error({ code: 'ERROR_400', message: 'Invalid JSON body' }, 400);
    }
    const status = body && typeof body === 'object' ? body.status : undefined;

    if (typeof status !== 'string' || !CANONICAL_PAYMENT_STATUS.has(status)) {
      return error(
        {
          code: 'INVALID_STATUS',
          message: `status must be one of ${[...CANONICAL_PAYMENT_STATUS].join(', ')}`,
          parameter: 'status',
        },
        400,
      );
    }

    const row = await fetchPayment(id);
    if (!row) return error(NOT_FOUND_BODY, 404);

    const access = await assertSalonAccess({
      session,
      salonId: row.salon_id,
      perm: 'sales_manage',
    });
    if (!access.ok) {
      if (access.status === 401) return unauthorized();
      // Cross-salon (FORBIDDEN) collapses to NOT_FOUND with the same body
      // shape the GET handler returns, so existence cannot be inferred from
      // 403 vs 404 differentiation (Requirements 1.3, 4.6, 6.3, design
      // Property 4). Other denial codes surface verbatim.
      if (access.status === 403) return error(NOT_FOUND_BODY, 404);
      return error({ code: access.code, message: access.code }, access.status);
    }

    await query('UPDATE payments SET status = ? WHERE id = ?', [status, id]);

    return success({
      id: row.id,
      booking_id: row.booking_id,
      amount: num(row.amount),
      method: row.method,
      status,
    });
  } catch (err) {
    console.error('PUT /api/payments/[id] error:', err);
    return error({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update payment' }, 500);
  }
}
