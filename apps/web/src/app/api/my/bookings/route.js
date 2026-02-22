import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/my/bookings - Get current user's bookings with filters
export async function GET(request) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // upcoming, past, all
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT b.*, s.name as salon_name, s.address as salon_address, s.city as salon_city,
        GROUP_CONCAT(DISTINCT sv.name) as services,
        st.id as staff_id, u2.first_name as staff_first_name, u2.last_name as staff_last_name
      FROM bookings b
      JOIN salons s ON s.id = b.salon_id
      LEFT JOIN booking_services bs ON bs.booking_id = b.id
      LEFT JOIN services sv ON sv.id = bs.service_id
      LEFT JOIN staff st ON st.id = b.staff_id
      LEFT JOIN users u2 ON u2.id = st.user_id
      WHERE b.client_id = ?
    `;
    const sqlParams = [session.userId];

    // Apply filter
    if (filter === 'upcoming') {
      sql += " AND b.start_datetime > NOW() AND b.status IN ('pending', 'confirmed')";
    } else if (filter === 'past') {
      sql += " AND (b.start_datetime <= NOW() OR b.status IN ('completed', 'cancelled', 'no_show'))";
    }

    if (status) {
      sql += ' AND b.status = ?';
      sqlParams.push(status);
    }

    sql += ' GROUP BY b.id';

    // Get total count
    const countSql = sql.replace(/SELECT .* FROM/, 'SELECT COUNT(DISTINCT b.id) as total FROM').replace('GROUP BY b.id', '');
    const [countResult] = await query(countSql, sqlParams);
    const total = countResult.total;

    sql += ' ORDER BY b.start_datetime DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const bookings = await query(sql, sqlParams);

    return success({
      bookings: bookings.map((b) => ({
        id: b.id,
        salonId: b.salon_id,
        salonName: b.salon_name,
        salonAddress: b.salon_address,
        salonCity: b.salon_city,
        staffId: b.staff_id,
        staffName: b.staff_first_name ? `${b.staff_first_name} ${b.staff_last_name}` : null,
        services: b.services,
        startTime: String(b.start_datetime).replace(' ', 'T'),
        endTime: String(b.end_datetime).replace(' ', 'T'),
        status: b.status,
        notes: b.notes,
        createdAt: b.created_at,
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
    console.error('Get my bookings error:', err);
    return error('Failed to get bookings', 500);
  }
}
