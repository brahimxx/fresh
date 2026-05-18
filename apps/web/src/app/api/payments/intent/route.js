import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';
import { toStripeAmount } from '@/lib/format';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/payments/intent - Create Stripe payment intent
export async function POST(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { bookingId, amount } = body;

    if (!bookingId || amount === undefined || amount === null || isNaN(amount) || amount <= 0) {
      return error('Valid Booking ID and positive amount are required', 400);
    }

    // Verify the booking exists and the user has access to it
    const booking = await getOne(
      `SELECT b.id, b.client_id, b.salon_id, s.owner_id, s.currency as salon_currency
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking) {
      return error('Booking not found', 404);
    }

    // Allow: admin, the booking's client, the salon owner, or salon staff
    if (session.role !== 'admin' && booking.client_id !== session.userId && booking.owner_id !== session.userId) {
      const staff = await getOne(
        'SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
        [booking.salon_id, session.userId]
      );
      if (!staff) {
        return forbidden('Not authorized to create payment for this booking');
      }
    }

    // Derive currency from the salon — never trust client-supplied currency
    const currency = (booking.salon_currency || 'DZD').toLowerCase();

    // Generate idempotency key to prevent duplicate charges
    const idempotencyKey = `booking-${bookingId}-${Date.now()}`;

    // Create Stripe PaymentIntent with correct smallest-unit conversion
    const paymentIntent = await stripe.paymentIntents.create({
      amount: toStripeAmount(amount, currency),
      currency,
      metadata: {
        bookingId: bookingId.toString(),
      },
    }, {
      idempotencyKey,
    });

    return created({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create payment intent error:', err);
    return error('Failed to create payment intent', 500);
  }
}
