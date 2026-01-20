import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/checkout/refund - Process a refund
export async function POST(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { paymentId, amount, reason } = body;

    if (!paymentId) {
      return error('Payment ID is required');
    }

    // Get payment with booking and salon info
    const payment = await getOne(
      `SELECT p.*, b.salon_id, b.client_id, s.owner_id
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       JOIN salons s ON s.id = b.salon_id
       WHERE p.id = ?`,
      [paymentId]
    );

    if (!payment) {
      return error('Payment not found', 404);
    }

    // Only salon owner or admin can process refunds
    if (session.role !== 'admin' && payment.owner_id !== session.userId) {
      return forbidden('Not authorized to process refunds');
    }

    if (payment.status !== 'paid') {
      return error('Can only refund paid transactions');
    }

    const refundAmount = amount || payment.amount;
    const totalRefunded = parseFloat(payment.refunded_amount || 0);
    const remainingAmount = parseFloat(payment.amount) - totalRefunded;

    if (refundAmount > remainingAmount) {
      return error({ 
        code: 'REFUND_EXCEEDS_REMAINING', 
        message: `Refund amount (${refundAmount}) exceeds remaining amount (${remainingAmount})` 
      }, 400);
    }

    const result = await transaction(async (conn) => {
      let stripeRefund = null;

      // Process Stripe refund if applicable
      if (payment.stripe_payment_id) {
        try {
          stripeRefund = await stripe.refunds.create({
            payment_intent: payment.stripe_payment_id,
            amount: Math.round(refundAmount * 100), // Convert to cents
            reason: reason === 'duplicate' ? 'duplicate' : reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer',
          });
        } catch (stripeError) {
          throw new Error(`Stripe refund failed: ${stripeError.message}`);
        }
      }

      // Create refund record
      const [refundResult] = await conn.execute(
        `INSERT INTO refunds (payment_id, amount, reason, stripe_refund_id, status, created_at)
         VALUES (?, ?, ?, ?, 'completed', NOW())`,
        [paymentId, refundAmount, reason || 'Customer request', stripeRefund?.id || null]
      );

      // Update payment status
      const isFullRefund = refundAmount >= payment.amount;
      await conn.execute(
        `UPDATE payments SET status = ?, refunded_amount = COALESCE(refunded_amount, 0) + ? WHERE id = ?`,
        [isFullRefund ? 'refunded' : 'partially_refunded', refundAmount, paymentId]
      );

      // Notify client
      await conn.execute(
        `INSERT INTO notifications (user_id, type, title, message, data, created_at)
         VALUES (?, 'refund', 'Refund Processed', ?, ?, NOW())`,
        [
          payment.client_id,
          `A refund of €${refundAmount.toFixed(2)} has been processed`,
          JSON.stringify({ paymentId, refundAmount }),
        ]
      );

      return {
        refundId: refundResult.insertId,
        stripeRefundId: stripeRefund?.id,
      };
    });

    return success({
      message: 'Refund processed successfully',
      refund: {
        id: result.refundId,
        paymentId,
        amount: refundAmount,
        stripeRefundId: result.stripeRefundId,
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Process refund error:', err);
    return error(err.message || 'Failed to process refund', 500);
  }
}
