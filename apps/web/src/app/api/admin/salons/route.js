import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/admin/salons - Get all salons (admin only)
export async function GET(request) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const city = searchParams.get('city');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT s.*, u.email as owner_email, u.first_name as owner_first_name, u.last_name as owner_last_name,
        (SELECT COUNT(*) FROM staff st WHERE st.salon_id = s.id) as staff_count,
        (SELECT COUNT(*) FROM bookings b WHERE b.salon_id = s.id) as booking_count
      FROM salons s
      JOIN users u ON u.id = s.owner_id
      WHERE 1=1
    `;
    const sqlParams = [];

    if (search) {
      sql += ' AND (s.name LIKE ? OR s.city LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      sqlParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (isActive !== null && isActive !== undefined) {
      sql += ' AND s.is_active = ?';
      sqlParams.push(isActive === 'true' ? 1 : 0);
    }

    if (city) {
      sql += ' AND s.city = ?';
      sqlParams.push(city);
    }

    // Get total
    const countSql = sql.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await query(countSql, sqlParams);

    sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const salons = await query(sql, sqlParams);

    return success({
      salons: salons.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        city: s.city,
        phone: s.phone,
        email: s.email,
        isActive: s.is_active,
        marketplaceEnabled: s.marketplace_enabled,
        ownerId: s.owner_id,
        ownerEmail: s.owner_email,
        ownerName: `${s.owner_first_name} ${s.owner_last_name}`,
        staffCount: s.staff_count,
        bookingCount: s.booking_count,
        createdAt: s.created_at,
      })),
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Admin get salons error:', err);
    return error('Failed to get salons', 500);
  }
}
