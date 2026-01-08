import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/response';

// GET /api/my/bookings/past - Get user's past bookings
export async function GET(request) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM bookings 
       WHERE client_id = ? AND (start_datetime <= NOW() OR status IN ('completed', 'cancelled', 'no_show'))`,
      [session.userId]
    );
    const total = countResult.total;

    const bookings = await query(
      `SELECT b.*, s.name as salon_name, s.id as salon_id,
        GROUP_CONCAT(DISTINCT sv.name) as services,
        u2.first_name as staff_first_name, u2.last_name as staff_last_name,
        p.amount as payment_amount, p.status as payment_status,
        r.id as review_id, r.rating
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       LEFT JOIN booking_services bs ON bs.booking_id = b.id
       LEFT JOIN services sv ON sv.id = bs.service_id
       LEFT JOIN staff st ON st.id = b.staff_id
       LEFT JOIN users u2 ON u2.id = st.user_id
       LEFT JOIN payments p ON p.booking_id = b.id
       LEFT JOIN reviews r ON r.booking_id = b.id
       WHERE b.client_id = ? AND (b.start_datetime <= NOW() OR b.status IN ('completed', 'cancelled', 'no_show'))
       GROUP BY b.id
       ORDER BY b.start_datetime DESC
       LIMIT ? OFFSET ?`,
      [session.userId, limit, offset]
    );

    return success({
      bookings: bookings.map((b) => ({
        id: b.id,
        salonId: b.salon_id,
        salonName: b.salon_name,
        staffName: b.staff_first_name ? `${b.staff_first_name} ${b.staff_last_name}` : null,
        services: b.services,
        startTime: b.start_datetime,
        endTime: b.end_datetime,
        status: b.status,
        paymentAmount: b.payment_amount ? parseFloat(b.payment_amount) : null,
        paymentStatus: b.payment_status,
        hasReview: !!b.review_id,
        rating: b.rating,
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
    console.error('Get past bookings error:', err);
    return error('Failed to get bookings', 500);
  }
}
