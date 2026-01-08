import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/response';

// GET /api/my/bookings/upcoming - Get user's upcoming bookings
export async function GET(request) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const bookings = await query(
      `SELECT b.*, s.name as salon_name, s.address as salon_address, s.phone as salon_phone,
        GROUP_CONCAT(DISTINCT sv.name) as services,
        u2.first_name as staff_first_name, u2.last_name as staff_last_name
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       LEFT JOIN booking_services bs ON bs.booking_id = b.id
       LEFT JOIN services sv ON sv.id = bs.service_id
       LEFT JOIN staff st ON st.id = b.staff_id
       LEFT JOIN users u2 ON u2.id = st.user_id
       WHERE b.client_id = ? AND b.start_datetime > NOW() AND b.status IN ('pending', 'confirmed')
       GROUP BY b.id
       ORDER BY b.start_datetime ASC
       LIMIT ?`,
      [session.userId, limit]
    );

    return success({
      bookings: bookings.map((b) => ({
        id: b.id,
        salonId: b.salon_id,
        salonName: b.salon_name,
        salonAddress: b.salon_address,
        salonPhone: b.salon_phone,
        staffName: b.staff_first_name ? `${b.staff_first_name} ${b.staff_last_name}` : null,
        services: b.services,
        startTime: b.start_datetime,
        endTime: b.end_datetime,
        status: b.status,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get upcoming bookings error:', err);
    return error('Failed to get bookings', 500);
  }
}
