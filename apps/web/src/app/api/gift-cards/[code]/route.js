import { getOne, query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, notFound, forbidden } from '@/lib/response';
import rateLimiter from '@/lib/rate-limit';

// GET /api/gift-cards/[code]
// Fetches balance and validates a global gift card.
export async function GET(request, { params }) {
  try {
    const { code } = await params;

    if (!code) return error('Gift card code is required', 400);

    // Rate limit: 10 validations per IP per 15 minutes (prevents code enumeration)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const rateLimit = rateLimiter.check(`gift_card_validate:${ip}`, 10, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return error(`Too many attempts. Please try again in ${rateLimit.retryAfter} seconds.`, 429);
    }

    const giftCard = await getOne(
      `SELECT * FROM gift_cards 
       WHERE code = ? 
         AND status = 'active'
         AND remaining_balance > 0
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [code]
    );

    if (!giftCard) return notFound('Invalid, expired, or depleted gift card code');

    return success({
      id: giftCard.id,
      salon_id: giftCard.salon_id,
      code: giftCard.code,
      initial_balance: parseFloat(giftCard.initial_balance),
      remaining_balance: parseFloat(giftCard.remaining_balance),
      expires_at: giftCard.expires_at,
      isValid: true
    });

  } catch (err) {
    console.error('Gift Card Validation Error:', err);
    return error('Failed to validate gift card', 500);
  }
}

// PUT /api/gift-cards/[code] - Update gift card (cancel, update status)
// The [code] param can be either the gift card code or its numeric ID.
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { code: codeOrId } = await params;

    if (!codeOrId) return error('Gift card identifier is required', 400);

    // Find the gift card by code or ID
    let giftCard;
    if (/^\d+$/.test(codeOrId)) {
      giftCard = await getOne('SELECT * FROM gift_cards WHERE id = ?', [codeOrId]);
    } else {
      giftCard = await getOne('SELECT * FROM gift_cards WHERE code = ?', [codeOrId]);
    }

    if (!giftCard) return notFound('Gift card not found');

    // Check access — must be salon owner/manager or admin
    const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [giftCard.salon_id]);
    if (!salon) return notFound('Salon not found');

    if (session.role !== 'admin' && Number(salon.owner_id) !== Number(session.userId)) {
      const staff = await getOne(
        "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role IN ('manager') AND is_active = 1",
        [giftCard.salon_id, session.userId]
      );
      if (!staff) return forbidden('Not authorized to update this gift card');
    }

    const body = await request.json();
    const { status, recipient_name, recipient_email, expires_at } = body;

    const updates = [];
    const updateParams = [];

    if (status) {
      updates.push('status = ?');
      updateParams.push(status);
    }
    if (recipient_name !== undefined) {
      updates.push('recipient_name = ?');
      updateParams.push(recipient_name);
    }
    if (recipient_email !== undefined) {
      updates.push('recipient_email = ?');
      updateParams.push(recipient_email);
    }
    if (expires_at !== undefined) {
      updates.push('expires_at = ?');
      updateParams.push(expires_at);
    }

    if (updates.length === 0) {
      return error('No fields to update', 400);
    }

    updateParams.push(giftCard.id);
    await query(`UPDATE gift_cards SET ${updates.join(', ')} WHERE id = ?`, updateParams);

    const updated = await getOne('SELECT * FROM gift_cards WHERE id = ?', [giftCard.id]);

    return success({
      id: updated.id,
      code: updated.code,
      status: updated.status,
      remaining_balance: parseFloat(updated.remaining_balance),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return error('Unauthorized', 401);
    console.error('Update gift card error:', err);
    return error('Failed to update gift card', 500);
  }
}
