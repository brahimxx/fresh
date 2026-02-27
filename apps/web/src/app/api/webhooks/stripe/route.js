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
