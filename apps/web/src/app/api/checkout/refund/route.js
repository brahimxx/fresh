import { getOne, transaction } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { assertSalonAccess } from '@/lib/permissions-server';
import { success, error, unauthorized, forbidden } from '@/lib/response';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Canonical 4-value enum for payments.status — Requirement 12.1, 12.10
const CANONICAL_PAYMENT_STATUS = new Set([
  'pending',
  'paid',
  'refunded',
  'partially_refunded',
]);

// ---------------------------------------------------------------------------
// Body validation helpers (Requirement 14.1, 14.8)
// ---------------------------------------------------------------------------

function isPositiveInteger(v) {
  return typeof v === 'number'
    ? Number.isInteger(v) && v > 0
    : typeof v === 'string' && /^[1-9]\d*$/.test(v);
}

/**
 * Validate `amount`: positive decimal with at most 2 decimal places.
 * Returns the numeric amount or `null` if invalid.
 */
function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const asNum = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(asNum) || asNum <= 0) return null;
  // Reject more than 2 decimal places (regardless of representation).
  // Use string form to avoid float artefacts on inputs like "1.005".
  const str = typeof raw === 'string' ? raw.trim() : String(asNum);
  if (!/^\d+(\.\d{1,2})?$/.test(str)) return null;
  return Math.round(asNum * 100) / 100;
}

function validateBody(body) {
  if (!body || typeof body !== 'object') {
    return { code: 'ERROR_400', message: 'Request body is required' };
  }
  const { paymentId, amount, reason, notes } = body;

  if (!isPositiveInteger(paymentId)) {
    return { code: 'ERROR_400', message: 'paymentId must be a positive integer', parameter: 'paymentId' };
  }
  const parsedAmount = parseAmount(amount);
  if (parsedAmount === null) {
    return { code: 'ERROR_400', message: 'amount must be a positive number with at most 2 decimal places', parameter: 'amount' };
  }
  if (typeof reason !== 'string') {
    return { code: 'ERROR_400', message: 'reason is required', parameter: 'reason' };
  }
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 1 || trimmedReason.length > 100) {
    return { code: 'ERROR_400', message: 'reason must be 1-100 characters after trim', parameter: 'reason' };
  }
  let normalisedNotes = '';
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string') {
      return { code: 'ERROR_400', message: 'notes must be a string', parameter: 'notes' };
    }
    if (notes.length > 2000) {
      return { code: 'ERROR_400', message: 'notes must be at most 2000 characters', parameter: 'notes' };
    }
    normalisedNotes = notes;
  }

  return {
    paymentId: typeof paymentId === 'number' ? paymentId : Number(paymentId),
    amount: parsedAmount,
    reason: trimmedReason,
    notes: normalisedNotes,
  };
}

// ---------------------------------------------------------------------------
// POST /api/checkout/refund — Process a refund
// ---------------------------------------------------------------------------

export async function POST(request) {
  try {
    // 1. Auth (Requirement 14.9, 15.3)
    const session = await getSession();
    if (!session || !session.userId) {
      return unauthorized();
    }

    // 2. Body validation (Requirement 14.1, 14.8) — before any DB or Stripe call.
    let body;
    try {
      body = await request.json();
    } catch {
      return error({ code: 'ERROR_400', message: 'Invalid JSON body' }, 400);
    }
    const parsed = validateBody(body);
    if (parsed.code) {
      return error(parsed, 400);
    }
    const { paymentId, amount: refundAmount, reason, notes } = parsed;

    // 3. Look up the payment with its owning salon (booking → salon_id).
    const payment = await getOne(
      `SELECT p.id, p.booking_id, p.amount, p.refunded_amount, p.status,
              p.stripe_payment_id, b.salon_id, b.client_id
         FROM payments p
         JOIN bookings b ON b.id = p.booking_id
        WHERE p.id = ?`,
      [paymentId]
    );
    if (!payment) {
      return error({ code: 'NOT_FOUND', message: 'Payment not found' }, 404);
    }

    // 4. Authorization via sales_manage (Requirement 15.1, 15.2).
    //    Owners and admins are always allowed by `assertSalonAccess`.
    const access = await assertSalonAccess({
      session,
      salonId: payment.salon_id,
      perm: 'sales_manage',
    });
    if (!access.ok) {
      if (access.status === 401) return unauthorized();
      if (access.status === 403) return forbidden();
      return error({ code: access.code, message: access.code }, access.status);
    }

    // 5. Only paid / partially_refunded payments are refundable. Any non-canonical
    //    status persisted historically is also rejected here (Req 12.10).
    if (!CANONICAL_PAYMENT_STATUS.has(payment.status)) {
      return error(
        { code: 'INVALID_STATUS', message: `Payment status '${payment.status}' is not in the canonical enum` },
        400
      );
    }
    if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
      return error(
        { code: 'ERROR_400', message: 'Only paid or partially refunded payments can be refunded' },
        400
      );
    }

    // 6. Refund-window check (Requirement 14.6) — no Stripe call, no DB write on overflow.
    const paymentAmount = parseFloat(payment.amount);
    const previousRefundedAmount = parseFloat(payment.refunded_amount || 0);
    const newRefundedTotal = Math.round((previousRefundedAmount + refundAmount) * 100) / 100;
    if (newRefundedTotal > paymentAmount) {
      return error(
        {
          code: 'REFUND_EXCEEDS_REMAINING',
          message: `Refund amount ${refundAmount.toFixed(2)} exceeds remaining refundable ${(paymentAmount - previousRefundedAmount).toFixed(2)}`,
        },
        400
      );
    }

    // 7. Decide final status (Requirements 12.2, 12.9).
    const isPartial = newRefundedTotal < paymentAmount;
    const newStatus = isPartial ? 'partially_refunded' : 'refunded';

    // Defensive: never write a status outside the canonical 4-value enum.
    if (!CANONICAL_PAYMENT_STATUS.has(newStatus)) {
      return error(
        { code: 'INVALID_STATUS', message: 'Computed status is not in the canonical enum' },
        400
      );
    }

    // Compose persisted reason (Requirement 14.2).
    const finalReason = reason + (notes ? '\n' + notes : '');

    // 8. Run Stripe + DB writes inside a single transaction. On Stripe failure,
    //    no DB row is written, no audit log row (Requirements 14.5, 14.8, 20.4).
    const result = await transaction(async (conn) => {
      // 8a. Stripe refund (when there is a payment intent on file).
      let stripeRefund = null;
      if (payment.stripe_payment_id) {
        stripeRefund = await stripe.refunds.create({
          payment_intent: payment.stripe_payment_id,
          amount: Math.round(refundAmount * 100), // cents
          reason:
            reason === 'duplicate' || reason === 'fraudulent'
              ? reason
              : 'requested_by_customer',
        });
      }

      // 8b. Insert refunds row (Requirement 14.3).
      const [refundResult] = await conn.execute(
        `INSERT INTO refunds (payment_id, amount, reason, stripe_refund_id, status, processed_by, created_at, processed_at)
         VALUES (?, ?, ?, ?, 'completed', ?, NOW(), NOW())`,
        [paymentId, refundAmount, finalReason, stripeRefund?.id || null, session.userId]
      );
      const refundId = refundResult.insertId;

      // 8c. Update payment status + refunded_amount.
      await conn.execute(
        `UPDATE payments
            SET status = ?,
                refunded_amount = COALESCE(refunded_amount, 0) + ?
          WHERE id = ?`,
        [newStatus, refundAmount, paymentId]
      );

      // 8d. Stock reversal for booking-products (Requirement 14.7).
      //     The current refund body does not include explicit product line items,
      //     and the spec allows skipping stock adjustment in that case (Req 14.7
      //     last sentence). When future revisions add line-item refunds, the
      //     reversal MUST go through `addProductToBooking(bookingId, productId,
      //     -quantity, conn)` so that task 3.2's `'refund'` stock movement is
      //     written by the same code path. Direct `products.stock_quantity`
      //     mutations are forbidden here.

      // 8e. Audit log (Requirements 14.4, 20.1) — same transaction; insert
      //     failure rolls back everything (Req 20.4).
      await conn.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data, created_at)
         VALUES (?, 'refund', 'payment', ?, ?, NOW())`,
        [
          session.userId,
          paymentId,
          JSON.stringify({ amount: refundAmount, reason, isPartial, refundId }),
        ]
      );

      // 8f. Best-effort notification to the client (no audit log impact).
      if (payment.client_id) {
        await conn.execute(
          `INSERT INTO notifications (user_id, type, title, message, data, created_at)
           VALUES (?, 'refund', 'Refund Processed', ?, ?, NOW())`,
          [
            payment.client_id,
            `A refund of ${refundAmount.toFixed(2)} has been processed`,
            JSON.stringify({ paymentId, refundAmount, refundId }),
          ]
        );
      }

      return {
        refundId,
        stripeRefundId: stripeRefund?.id || null,
      };
    });

    return success({
      message: 'Refund processed successfully',
      refund: {
        id: result.refundId,
        paymentId,
        amount: refundAmount,
        isPartial,
        status: newStatus,
        stripeRefundId: result.stripeRefundId,
      },
    });
  } catch (err) {
    if (err && err.message === 'Unauthorized') return unauthorized();
    console.error('Process refund error:', err);
    return error(
      { code: 'INTERNAL_SERVER_ERROR', message: err?.message || 'Failed to process refund' },
      500
    );
  }
}
