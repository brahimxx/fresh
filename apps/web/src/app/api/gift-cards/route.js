import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, forbidden } from '@/lib/response';

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  if (!salon) return false;
  if (salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role IN ('manager') AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// GET /api/gift-cards - Get all gift cards
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salon_id');
    const status = searchParams.get('status');

    let sql = `SELECT * FROM gift_cards WHERE 1=1`;
    const params = [];

    if (salonId) {
      sql += ' AND salon_id = ?';
      params.push(salonId);
    }

    if (status === 'active') {
      sql += " AND status = 'active' AND remaining_balance > 0";
    } else if (status === 'used') {
      sql += " AND remaining_balance = 0";
    } else if (status === 'expired') {
      sql += " AND status = 'expired'";
    } else if (status === 'cancelled') {
      sql += " AND status = 'cancelled'";
    }

    sql += ' ORDER BY created_at DESC';

    const giftCards = await query(sql, params);

    return success({
      data: giftCards.map((g) => ({
        id: g.id,
        salonId: g.salon_id,
        code: g.code,
        initialBalance: g.initial_balance,
        remainingBalance: g.remaining_balance,
        purchasedBy: g.purchased_by,
        recipientEmail: g.recipient_email,
        recipientName: g.recipient_name,
        recipientMessage: g.recipient_message,
        status: g.status,
        expiresAt: g.expires_at,
        createdAt: g.created_at,
      })),
    });
  } catch (err) {
    console.error('Get gift cards error:', err);
    return error('Failed to get gift cards', 500);
  }
}

// POST /api/gift-cards - Create a new gift card
export async function POST(request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { 
      salon_id, code, initial_balance, recipient_email, 
      recipient_name, recipient_message, expires_at 
    } = body;

    if (!salon_id) {
      return error('salon_id is required', 400);
    }

    if (!initial_balance || initial_balance <= 0) {
      return error('Initial balance must be greater than 0', 400);
    }

    // Check salon access
    const hasAccess = await checkSalonAccess(salon_id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to create gift cards for this salon');
    }

    // Generate code if not provided
    const giftCardCode = code || generateCode();

    // Check for duplicate code
    const existing = await getOne('SELECT id FROM gift_cards WHERE code = ?', [giftCardCode]);
    if (existing) {
      return error('A gift card with this code already exists', 400);
    }

    const result = await query(
      `INSERT INTO gift_cards (
        salon_id, code, initial_balance, remaining_balance,
        purchased_by, recipient_email, recipient_name, recipient_message,
        status, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        salon_id, giftCardCode, initial_balance, initial_balance,
        session.userId, recipient_email || null, recipient_name || null,
        recipient_message || null, expires_at || null,
      ]
    );

    const newGiftCard = await getOne('SELECT * FROM gift_cards WHERE id = ?', [result.insertId]);

    return created({
      id: newGiftCard.id,
      code: newGiftCard.code,
      initialBalance: newGiftCard.initial_balance,
      remainingBalance: newGiftCard.remaining_balance,
    });
  } catch (err) {
    console.error('Create gift card error:', err);
    return error('Failed to create gift card', 500);
  }
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  for (let s = 0; s < 4; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join('-');
}
