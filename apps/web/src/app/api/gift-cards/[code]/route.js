import { getOne } from '@/lib/db';
import { success, error, notFound } from '@/lib/response';

// GET /api/gift-cards/[code]
// Fetches balance and validates a global gift card.
export async function GET(request, { params }) {
  try {
    const { code } = await params;

    if (!code) return error('Gift card code is required', 400);

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
