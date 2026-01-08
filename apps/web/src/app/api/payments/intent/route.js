import { query } from '@/lib/db';
import { success, error, created } from '@/lib/response';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/payments/intent - Create Stripe payment intent
export async function POST(request) {
  try {
    const body = await request.json();
    const { bookingId, amount, currency = 'eur' } = body;

    if (!bookingId || !amount) {
      return error('Booking ID and amount are required');
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        bookingId: bookingId.toString(),
      },
    });

    return created({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error('Create payment intent error:', err);
    return error('Failed to create payment intent', 500);
  }
}
