import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  if (salon && salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// GET /api/salons/[id]/gift-cards - Get salon gift cards
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to view gift cards');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // active, depleted, expired

    let sql = 'SELECT * FROM gift_cards WHERE salon_id = ?';
    const sqlParams = [id];

    if (status === 'active') {
      sql += ' AND remaining_balance > 0 AND (expires_at IS NULL OR expires_at > NOW())';
    } else if (status === 'depleted') {
      sql += ' AND remaining_balance = 0';
    } else if (status === 'expired') {
      sql += ' AND expires_at <= NOW()';
    }

    sql += ' ORDER BY created_at DESC';

    const giftCards = await query(sql, sqlParams);

    return success({
      giftCards: giftCards.map((gc) => ({
        id: gc.id,
        code: gc.code,
        initialBalance: parseFloat(gc.initial_balance),
        remainingBalance: parseFloat(gc.remaining_balance),
        purchasedBy: gc.purchased_by,
        recipientEmail: gc.recipient_email,
        recipientName: gc.recipient_name,
        message: gc.message,
        expiresAt: gc.expires_at,
        createdAt: gc.created_at,
        isActive: gc.remaining_balance > 0 && (!gc.expires_at || new Date(gc.expires_at) > new Date()),
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get gift cards error:', err);
    return error('Failed to get gift cards', 500);
  }
}

// POST /api/salons/[id]/gift-cards - Create/sell gift card
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const { amount, recipientEmail, recipientName, message, expiresInMonths = 12 } = body;

    if (!amount || amount <= 0) {
      return error('Valid amount is required');
    }

    // Generate unique code
    const code = `GC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + expiresInMonths);

    const result = await query(
      `INSERT INTO gift_cards (
        salon_id, code, initial_balance, remaining_balance, purchased_by,
        recipient_email, recipient_name, message, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        code,
        amount,
        amount,
        session.userId,
        recipientEmail || null,
        recipientName || null,
        message || null,
        expiresAt,
      ]
    );

    return created({
      id: result.insertId,
      code,
      amount,
      recipientEmail,
      recipientName,
      expiresAt,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create gift card error:', err);
    return error('Failed to create gift card', 500);
  }
}
