import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// Any active staff member (owner, manager, or receptionist) may read clients.
// The old guard (role='manager' only) locked out receptionists who use this
// view every day to look up walk-in clients.
async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne(
    'SELECT owner_id FROM salons WHERE id = ? AND deleted_at IS NULL',
    [salonId],
  );
  if (!salon) return false;
  if (salon.owner_id === userId) return true;
  const staff = await getOne(
    'SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
    [salonId, userId],
  );
  return !!staff;
}

// GET /api/salons/[id]/clients - Get salon clients (CRM)
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to view salon clients');
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT sc.*, u.first_name, u.last_name, u.email, u.phone
      FROM salon_clients sc
      JOIN users u ON u.id = sc.client_id
      WHERE sc.salon_id = ?
        AND sc.is_active = 1
    `;
    const params_query = [id];

    if (search) {
      sql += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      params_query.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY sc.last_visit_date DESC LIMIT ? OFFSET ?';
    params_query.push(limit, offset);

    const clients = await query(sql, params_query);

    // Get total count — only active relationships
    let countSql = 'SELECT COUNT(*) as total FROM salon_clients WHERE salon_id = ? AND is_active = 1';
    const [{ total }] = await query(countSql, [id]);

    return success({
      clients: clients.map((c) => ({
        id: c.client_id,
        firstName: c.first_name,
        lastName: c.last_name,
        email: c.email,
        phone: c.phone,
        firstVisitDate: c.first_visit_date,
        lastVisitDate: c.last_visit_date,
        totalVisits: c.total_visits,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get salon clients error:', err);
    return error('Failed to get salon clients', 500);
  }
}
