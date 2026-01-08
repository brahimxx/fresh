import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

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

// GET /api/salons/[id]/calendar - Get salon/staff calendar
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to view calendar');
    }

    const staffId = searchParams.get('staffId');
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate'); // YYYY-MM-DD

    if (!startDate || !endDate) {
      return error('Start date and end date are required');
    }

    // Get bookings
    let bookingSql = `
      SELECT b.*, 
             u.first_name as client_first_name, u.last_name as client_last_name,
             st.id as staff_id, su.first_name as staff_first_name, su.last_name as staff_last_name
      FROM bookings b
      JOIN users u ON u.id = b.client_id
      LEFT JOIN staff st ON st.id = b.staff_id
      LEFT JOIN users su ON su.id = st.user_id
      WHERE b.salon_id = ?
        AND DATE(b.start_datetime) >= ?
        AND DATE(b.start_datetime) <= ?
        AND b.status NOT IN ('cancelled')
    `;
    const bookingParams = [id, startDate, endDate];

    if (staffId) {
      bookingSql += ' AND b.staff_id = ?';
      bookingParams.push(staffId);
    }

    bookingSql += ' ORDER BY b.start_datetime';

    const bookings = await query(bookingSql, bookingParams);

    // Get booking services
    const bookingIds = bookings.map((b) => b.id);
    let bookingServices = [];
    if (bookingIds.length > 0) {
      bookingServices = await query(
        `SELECT bs.*, sv.name as service_name
         FROM booking_services bs
         JOIN services sv ON sv.id = bs.service_id
         WHERE bs.booking_id IN (${bookingIds.map(() => '?').join(',')})`,
        bookingIds
      );
    }

    // Get staff time off in range
    let timeOffSql = `
      SELECT sto.*, st.id as staff_id, u.first_name, u.last_name
      FROM staff_time_off sto
      JOIN staff st ON st.id = sto.staff_id
      JOIN users u ON u.id = st.user_id
      WHERE st.salon_id = ?
        AND DATE(sto.start_datetime) <= ?
        AND DATE(sto.end_datetime) >= ?
    `;
    const timeOffParams = [id, endDate, startDate];

    if (staffId) {
      timeOffSql += ' AND sto.staff_id = ?';
      timeOffParams.push(staffId);
    }

    const timeOff = await query(timeOffSql, timeOffParams);

    // Format response as calendar events
    const events = [
      ...bookings.map((b) => ({
        type: 'booking',
        id: b.id,
        title: `${b.client_first_name} ${b.client_last_name}`,
        start: b.start_datetime,
        end: b.end_datetime,
        status: b.status,
        staffId: b.staff_id,
        staffName: b.staff_first_name ? `${b.staff_first_name} ${b.staff_last_name}` : null,
        services: bookingServices
          .filter((bs) => bs.booking_id === b.id)
          .map((bs) => ({
            name: bs.service_name,
            duration: bs.duration_minutes,
          })),
      })),
      ...timeOff.map((to) => ({
        type: 'time_off',
        id: to.id,
        title: `Time Off - ${to.first_name} ${to.last_name}`,
        start: to.start_datetime,
        end: to.end_datetime,
        staffId: to.staff_id,
        staffName: `${to.first_name} ${to.last_name}`,
        reason: to.reason,
      })),
    ];

    return success({
      startDate,
      endDate,
      events,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get calendar error:', err);
    return error('Failed to get calendar', 500);
  }
}
