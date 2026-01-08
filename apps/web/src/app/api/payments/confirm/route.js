import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/response';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/payments/confirm - Confirm a payment
export async function POST(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { paymentIntentId, bookingId } = body;

    if (!paymentIntentId || !bookingId) {
      return error('Payment intent ID and booking ID are required');
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return error(`Payment not successful. Status: ${paymentIntent.status}`);
    }

    // Check if payment already recorded
    const existingPayment = await getOne('SELECT id FROM payments WHERE stripe_payment_id = ?', [paymentIntentId]);
    if (existingPayment) {
      return success({
        id: existingPayment.id,
        status: 'paid',
        message: 'Payment already confirmed',
      });
    }

    // Create payment record
    const result = await query(
      `INSERT INTO payments (booking_id, amount, method, status, stripe_payment_id, created_at)
       VALUES (?, ?, 'card', 'paid', ?, NOW())`,
      [bookingId, paymentIntent.amount / 100, paymentIntentId]
    );

    // Confirm the booking
    await query("UPDATE bookings SET status = 'confirmed' WHERE id = ? AND status = 'pending'", [bookingId]);

    return success({
      id: result.insertId,
      bookingId,
      amount: paymentIntent.amount / 100,
      status: 'paid',
      message: 'Payment confirmed successfully',
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Confirm payment error:', err);
    return error('Failed to confirm payment', 500);
  }
}
