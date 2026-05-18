import { query } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { successResponse, errorResponse } from '@/lib/response';
import { recordGiftCardTransaction } from '@/lib/gift-card-ledger';

/**
 * GET /api/cron/gift-cards/expire
 *
 * Two responsibilities:
 * 1. Mark active gift cards as 'expired' if their expires_at date has passed.
 * 2. Send a one-time "expiring soon" email to recipients whose cards expire within 7 days.
 *
 * Designed to run daily via Vercel Cron or an external scheduler.
 */
export async function GET(request) {
  try {
    // Auth — same pattern as other cron routes
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return errorResponse('Unauthorized', 401);
    }

    // ── 1. Expire overdue gift cards ──────────────────────────────────────
    const expiredCards = await query(`
      SELECT id, remaining_balance FROM gift_cards
      WHERE status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
    `);

    for (const card of expiredCards) {
      await query("UPDATE gift_cards SET status = 'expired' WHERE id = ?", [card.id]);
      await recordGiftCardTransaction({
        giftCardId: card.id,
        type: 'expiry',
        amount: 0,
        balanceAfter: parseFloat(card.remaining_balance),
        referenceType: 'cron',
        referenceId: null,
        notes: 'Expired by scheduled job',
        createdBy: null,
      });
    }
    const expiredCount = expiredCards.length;

    // ── 2. Send "expiring soon" warnings (7-day window) ──────────────────
    // Only cards that:
    //   - Are still active with balance
    //   - Expire within the next 7 days
    //   - Haven't already received an expiry warning notification
    const expiringCards = await query(`
      SELECT gc.id, gc.code, gc.remaining_balance, gc.recipient_email,
             gc.recipient_name, gc.expires_at, gc.salon_id, s.name AS salon_name
      FROM gift_cards gc
      JOIN salons s ON s.id = gc.salon_id
      WHERE gc.status = 'active'
        AND gc.remaining_balance > 0
        AND gc.expires_at IS NOT NULL
        AND gc.expires_at > NOW()
        AND gc.expires_at <= NOW() + INTERVAL 7 DAY
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.type = 'email'
            AND n.title = 'Your Gift Card is Expiring Soon'
            AND JSON_EXTRACT(n.data, '$.giftCardId') = gc.id
        )
    `);

    let notifiedCount = 0;

    for (const card of expiringCards) {
      // We need a user ID for the notification system. Look up by recipient email.
      const recipient = card.recipient_email
        ? await query('SELECT id, email FROM users WHERE email = ? LIMIT 1', [card.recipient_email])
        : [];

      const userId = recipient.length > 0 ? recipient[0].id : null;
      const email = card.recipient_email;

      if (!email) continue;

      const expiresDate = new Date(card.expires_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const balance = parseFloat(card.remaining_balance).toFixed(2);

      await sendNotification({
        userId: userId || 0,
        email,
        type: 'email',
        title: 'Your Gift Card is Expiring Soon',
        message: `
          <p>Hi ${card.recipient_name || 'there'},</p>
          <p>Your gift card for <strong>${card.salon_name}</strong> is expiring on <strong>${expiresDate}</strong>.</p>
          <p>You still have <strong>$${balance}</strong> remaining on your card (code: <code>${card.code}</code>).</p>
          <p>Book an appointment before it expires so you don't lose your balance!</p>
        `,
        data: { giftCardId: card.id, type: 'gift_card_expiry_warning' },
      });

      notifiedCount++;
    }

    return successResponse({
      message: 'Gift card expiration processing complete.',
      expired: expiredCount,
      expiryWarningsSent: notifiedCount,
    });
  } catch (err) {
    console.error('[CRON gift-cards/expire] Error:', err);
    return errorResponse('Failed to process gift card expirations', 500);
  }
}
