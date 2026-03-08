import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';

async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  if (!salon) return false;
  if (salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// GET /api/salons/[id]/closures - List all closures for a salon
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) return forbidden('Not authorized');

    const { searchParams } = new URL(request.url);
    const includePast = searchParams.get('includePast') === 'true';

    let sql = 'SELECT id, date, reason, created_at FROM salon_closures WHERE salon_id = ?';
    if (!includePast) {
      sql += ' AND date >= CURDATE()';
    }
    sql += ' ORDER BY date ASC';

    const closures = await query(sql, [id]);

    return success({
      closures: closures.map((c) => ({
        id: c.id,
        date: c.date,
        reason: c.reason,
        createdAt: c.created_at,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get closures error:', err);
    return error('Failed to get closures', 500);
  }
}

// POST /api/salons/[id]/closures - Add a closure date
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) return forbidden('Not authorized');

    const body = await request.json();
    const { date, reason } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return error('A valid date (YYYY-MM-DD) is required', 400);
    }

    // Check for duplicate
    const existing = await getOne(
      'SELECT id FROM salon_closures WHERE salon_id = ? AND date = ?',
      [id, date]
    );
    if (existing) {
      return error('A closure already exists for this date', 400);
    }

    const result = await query(
      'INSERT INTO salon_closures (salon_id, date, reason) VALUES (?, ?, ?)',
      [id, date, reason || null]
    );

    return created({
      id: result.insertId,
      date,
      reason: reason || null,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create closure error:', err);
    return error('Failed to create closure', 500);
  }
}
