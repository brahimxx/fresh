import { query, getOne } from '@/lib/db';
import { success, error } from '@/lib/response';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/webhooks/stripe - Handle Stripe webhook events
export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return error('Webhook signature verification failed', 400);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata?.bookingId;

        if (bookingId) {
          // Check if payment already exists
          const existingPayment = await getOne(
            'SELECT id FROM payments WHERE stripe_payment_id = ?',
            [paymentIntent.id]
          );

          if (!existingPayment) {
            // Create payment record
            await query(
              `INSERT INTO payments (booking_id, amount, method, status, stripe_payment_id, created_at)
               VALUES (?, ?, 'card', 'paid', ?, NOW())`,
              [bookingId, paymentIntent.amount / 100, paymentIntent.id]
            );

            // Confirm the booking
            await query("UPDATE bookings SET status = 'confirmed' WHERE id = ? AND status = 'pending'", [bookingId]);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata?.bookingId;

        if (bookingId) {
          // Could notify user or cancel booking
          console.log(`Payment failed for booking ${bookingId}`);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        
        // Update payment status
        await query(
          "UPDATE payments SET status = 'refunded' WHERE stripe_payment_id = ?",
          [charge.payment_intent]
        );
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // Handle subscription events if implementing subscription model
        console.log('Subscription event:', event.type);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return success({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    return error('Webhook handling failed', 500);
  }
}
