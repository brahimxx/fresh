import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { query } from '@/lib/db';
import { success, error } from '@/lib/response';

export async function POST(req) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return error(`Webhook Error: ${err.message}`, 400);
  }

  try {
    switch (event.type) {
      case 'payout.paid': {
        const payout = event.data.object;
        await query(
          "UPDATE payouts SET status = 'completed', processed_at = NOW() WHERE stripe_transfer_id = ?",
          [payout.id]
        );
        console.log(`[Stripe Webhook] Payout paid: ${payout.id}`);
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object;
        await query(
          "UPDATE payouts SET status = 'failed', failure_reason = ?, processed_at = NOW() WHERE stripe_transfer_id = ?",
          [payout.failure_balance_transaction ? 'Balance transaction failed' : 'Unknown', payout.id]
        );
        console.log(`[Stripe Webhook] Payout failed: ${payout.id}`);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.metadata?.bookingId) {
          const bookingId = session.metadata.bookingId;
          const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
          
          await query(
            "UPDATE payments SET status = 'paid', stripe_payment_id = ? WHERE booking_id = ?",
            [paymentIntentId || session.id, bookingId]
          );
          console.log(`[Stripe Webhook] Checkout session completed for booking ${bookingId}`);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        if (session.metadata?.bookingId) {
          const bookingId = session.metadata.bookingId;
          
          // Free up the calendar slot if they just closed the tab and never paid
          await query(
            "UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Stripe checkout expired' WHERE id = ?",
            [bookingId]
          );
          await query(
            "UPDATE payments SET status = 'cancelled' WHERE booking_id = ?",
            [bookingId]
          );
          console.log(`[Stripe Webhook] Cancelled abandoned booking ${bookingId} due to expiration`);
        }
        break;
      }

      // Add other relevant cases (like payment_intent.succeeded) if needed for MVP
      default:
        console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
    }

    return success({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return error('Webhook processing failed', 500);
  }
}
