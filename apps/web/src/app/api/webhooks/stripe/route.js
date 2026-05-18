import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { query, getOne } from '@/lib/db';
import { success, error } from '@/lib/response';
import { sendEmail } from '@/lib/email';
import { recordGiftCardTransaction } from '@/lib/gift-card-ledger';

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

        // Handle gift card purchase completion
        if (session.metadata?.type === 'gift_card_purchase') {
          const giftCardId = session.metadata.giftCardId;
          const giftCardCode = session.metadata.giftCardCode;
          const recipientEmail = session.metadata.recipientEmail;
          const recipientName = session.metadata.recipientName;
          const senderName = session.metadata.senderName;
          const senderEmail = session.metadata.senderEmail;
          const message = session.metadata.message;
          const amount = session.metadata.amount;
          const salonName = session.metadata.salonName;

          // Use Stripe customer email as fallback for purchaser tracking
          const purchaserEmail = senderEmail || session.customer_details?.email || null;

          // Activate the gift card and store purchaser email
          await query(
            `UPDATE gift_cards 
             SET status = 'active',
                 purchaser_email = COALESCE(purchaser_email, ?)
             WHERE id = ? AND status = 'pending'`,
            [purchaserEmail, giftCardId]
          );

          // Record purchase credit in audit ledger
          await recordGiftCardTransaction({
            giftCardId: parseInt(giftCardId),
            type: 'purchase',
            amount: parseFloat(amount),
            balanceAfter: parseFloat(amount),
            referenceType: 'webhook',
            referenceId: parseInt(giftCardId),
            notes: `Activated via Stripe payment`,
            createdBy: null,
          });

          // Get expiry date
          const giftCard = await getOne("SELECT expires_at FROM gift_cards WHERE id = ?", [giftCardId]);
          const expiresAt = giftCard?.expires_at ? new Date(giftCard.expires_at).toLocaleDateString() : 'Never';

          // Send email to recipient
          const senderLine = senderName ? ` from ${senderName}` : '';
          const formattedAmount = Number(amount).toFixed(2);

          try {
            await sendEmail({
              to: recipientEmail,
              subject: `You received a $${formattedAmount} gift card${senderLine}!`,
              html: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                  <h1 style="color: #6366f1; margin-bottom: 8px;">🎁 Gift Card</h1>
                  <p>You've received a <strong>$${formattedAmount}</strong> gift card${recipientName ? ` for ${recipientName}` : ''}${senderLine}!</p>
                  ${message ? `<p style="font-style: italic; color: #6b7280; border-left: 3px solid #e5e7eb; padding-left: 12px;">"${message}"</p>` : ''}
                  <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Your gift card code</p>
                    <p style="margin: 0; font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 2px; color: #111827;">${giftCardCode}</p>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;">This card expires on ${expiresAt}.</p>
                  <p style="color: #6b7280; font-size: 14px;">Present this code at checkout to redeem your balance at <strong>${salonName}</strong>.</p>
                </div>
              `,
              text: `You received a $${formattedAmount} gift card${senderLine}! Code: ${giftCardCode}. Expires: ${expiresAt}. Redeem at ${salonName}.`,
            });
          } catch (emailErr) {
            console.error('[Stripe Webhook] Gift card email failed:', emailErr);
          }

          console.log(`[Stripe Webhook] Gift card ${giftCardId} activated after payment`);
          break;
        }

        // Handle booking checkout completion
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

        // Handle expired gift card purchase
        if (session.metadata?.type === 'gift_card_purchase') {
          const giftCardId = session.metadata.giftCardId;
          // Delete the pending gift card since payment was never completed
          await query(
            "DELETE FROM gift_cards WHERE id = ? AND status = 'pending'",
            [giftCardId]
          );
          console.log(`[Stripe Webhook] Deleted unpaid gift card ${giftCardId} due to checkout expiration`);
          break;
        }

        // Handle expired booking checkout
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

          // Refund gift card if one was used
          const giftCardUsage = await getOne(
            'SELECT bgc.gift_card_id, bgc.amount_used FROM booking_gift_cards bgc WHERE bgc.booking_id = ?',
            [bookingId]
          );
          if (giftCardUsage && parseFloat(giftCardUsage.amount_used) > 0) {
            await query(
              `UPDATE gift_cards SET remaining_balance = remaining_balance + ?, status = 'active' WHERE id = ?`,
              [parseFloat(giftCardUsage.amount_used), giftCardUsage.gift_card_id]
            );
          }

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
