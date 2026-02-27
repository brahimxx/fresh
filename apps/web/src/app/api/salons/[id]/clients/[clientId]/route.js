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

// GET /api/salons/[id]/clients/[clientId] - Get client details with booking history
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id, clientId } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to view client details');
    }

    // Get client basic info
    const client = await getOne(
      `SELECT sc.*, u.first_name, u.last_name, u.email, u.phone
       FROM salon_clients sc
       JOIN users u ON u.id = sc.client_id
       WHERE sc.salon_id = ? AND sc.client_id = ?
         AND sc.is_active = 1
         AND u.deleted_at IS NULL`,
      [id, clientId]
    );

    if (!client) {
      return error('Client not found at this salon', 404);
    }

    // Get booking history
    const bookings = await query(
      `SELECT b.*, st.id as staff_id, su.first_name as staff_first_name, su.last_name as staff_last_name
       FROM bookings b
       LEFT JOIN staff st ON st.id = b.staff_id
       LEFT JOIN users su ON su.id = st.user_id
       WHERE b.salon_id = ? AND b.client_id = ?
       ORDER BY b.start_datetime DESC
       LIMIT 50`,
      [id, clientId]
    );

    // Get booking services for each booking
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

    // Calculate total spent
    const [spentResult] = await query(
      `SELECT SUM(p.amount) as total_spent
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       WHERE b.salon_id = ? AND b.client_id = ? AND p.status = 'paid'`,
      [id, clientId]
    );

    return success({
      client: {
        id: client.client_id,
        firstName: client.first_name,
        lastName: client.last_name,
        email: client.email,
        phone: client.phone,
        firstVisitDate: client.first_visit_date,
        lastVisitDate: client.last_visit_date,
        totalVisits: client.total_visits,
        totalSpent: spentResult.total_spent || 0,
      },
      bookings: bookings.map((b) => ({
        id: b.id,
        startDatetime: b.start_datetime,
        endDatetime: b.end_datetime,
        status: b.status,
        staff: b.staff_id
          ? {
            id: b.staff_id,
            firstName: b.staff_first_name,
            lastName: b.staff_last_name,
          }
          : null,
        services: bookingServices
          .filter((bs) => bs.booking_id === b.id)
          .map((bs) => ({
            name: bs.service_name,
            price: bs.price,
            duration: bs.duration_minutes,
          })),
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get client details error:', err);
    return error('Failed to get client details', 500);
  }
}
