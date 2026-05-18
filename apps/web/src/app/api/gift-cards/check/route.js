import { query, getOne } from '@/lib/db';
import { success, error, notFound } from '@/lib/response';
import { decodeId } from '@/lib/id';
import rateLimiter from '@/lib/rate-limit';

// POST /api/gift-cards/check - Check gift card balance
export async function POST(request) {
  try {
    // Rate limit: 10 checks per IP per 15 minutes (stricter — prevents code enumeration)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const rateLimit = rateLimiter.check(`gift_card_check:${ip}`, 10, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return error(`Too many attempts. Please try again in ${rateLimit.retryAfter} seconds.`, 429);
    }

    const body = await request.json();
    const { code, salonId: rawSalonId } = body;

    if (!code) {
      return error('Gift card code is required');
    }

    let sql = 'SELECT * FROM gift_cards WHERE code = ?';
    const params = [code.toUpperCase()];

    if (rawSalonId) {
      const salonId = decodeId(rawSalonId);
      sql += ' AND salon_id = ?';
      params.push(salonId);
    }

    const giftCard = await getOne(sql, params);

    if (!giftCard) {
      return notFound('Gift card not found');
    }

    const isExpired = giftCard.expires_at && new Date(giftCard.expires_at) < new Date();
    const hasBalance = parseFloat(giftCard.remaining_balance) > 0;
    // A card is active if it has balance, isn't expired, and status is 'active'.
    const isActive = hasBalance && !isExpired && giftCard.status === 'active';

    return success({
      code: giftCard.code,
      initialBalance: parseFloat(giftCard.initial_balance),
      remainingBalance: parseFloat(giftCard.remaining_balance),
      expiresAt: giftCard.expires_at,
      isExpired,
      isActive,
      salonId: giftCard.salon_id,
    });
  } catch (err) {
    console.error('Check gift card error:', err);
    return error('Failed to check gift card', 500);
  }
}
