import { query, getOne } from '@/lib/db';
import { success, error, notFound } from '@/lib/response';

// POST /api/gift-cards/check - Check gift card balance
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, salonId } = body;

    if (!code) {
      return error('Gift card code is required');
    }

    let sql = 'SELECT * FROM gift_cards WHERE code = ?';
    const params = [code.toUpperCase()];

    if (salonId) {
      sql += ' AND salon_id = ?';
      params.push(salonId);
    }

    const giftCard = await getOne(sql, params);

    if (!giftCard) {
      return notFound('Gift card not found');
    }

    const isExpired = giftCard.expires_at && new Date(giftCard.expires_at) < new Date();
    const isActive = giftCard.remaining_balance > 0 && !isExpired;

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
