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

// GET /api/reports/staff - Get staff performance report
export async function GET(request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const salonId = searchParams.get('salonId') || searchParams.get('salon_id');
    const startDate = searchParams.get('startDate') || searchParams.get('start_date');
    const endDate = searchParams.get('endDate') || searchParams.get('end_date');

    if (!salonId) {
      return error('Salon ID is required');
    }

    const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to view staff reports');
    }

    // Default to last 30 days
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Staff performance
    const staffPerformance = await query(
      `SELECT 
         st.id as staff_id,
         u.first_name, u.last_name,
         COUNT(b.id) as total_bookings,
         SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
         SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
         SUM(CASE WHEN b.status = 'no_show' THEN 1 ELSE 0 END) as no_show_bookings,
         COALESCE(SUM(CASE WHEN b.status = 'completed' THEN bs_total.total_price ELSE 0 END), 0) as revenue
       FROM staff st
       JOIN users u ON u.id = st.user_id
       LEFT JOIN bookings b ON b.staff_id = st.id AND DATE(b.start_datetime) BETWEEN ? AND ?
       LEFT JOIN (
         SELECT booking_id, SUM(price) as total_price
         FROM booking_services
         GROUP BY booking_id
       ) bs_total ON bs_total.booking_id = b.id
       WHERE st.salon_id = ? AND st.is_active = 1
       GROUP BY st.id
       ORDER BY revenue DESC`,
      [start, end, salonId]
    );

    // Average rating per staff
    const staffRatings = await query(
      `SELECT 
         b.staff_id,
         AVG(r.rating) as avg_rating,
         COUNT(r.id) as review_count
       FROM reviews r
       JOIN bookings b ON b.salon_id = r.salon_id AND b.client_id = r.client_id
       WHERE b.salon_id = ? AND DATE(r.created_at) BETWEEN ? AND ?
       GROUP BY b.staff_id`,
      [salonId, start, end]
    );

    // Working hours utilization
    const staffUtilization = await query(
      `SELECT 
         st.id as staff_id,
         SUM(TIMESTAMPDIFF(MINUTE, b.start_datetime, b.end_datetime)) as booked_minutes
       FROM staff st
       LEFT JOIN bookings b ON b.staff_id = st.id 
         AND b.status IN ('confirmed', 'completed')
         AND DATE(b.start_datetime) BETWEEN ? AND ?
       WHERE st.salon_id = ? AND st.is_active = 1
       GROUP BY st.id`,
      [start, end, salonId]
    );

    // Combine data
    const staffData = staffPerformance.map((staff) => {
      const ratings = staffRatings.find((r) => r.staff_id === staff.staff_id);
      const utilization = staffUtilization.find((u) => u.staff_id === staff.staff_id);

      return {
        id: staff.staff_id,
        name: `${staff.first_name} ${staff.last_name}`,
        totalBookings: staff.total_bookings,
        completedBookings: staff.completed_bookings,
        cancelledBookings: staff.cancelled_bookings,
        noShowBookings: staff.no_show_bookings,
        revenue: parseFloat(staff.revenue),
        avgRating: ratings ? parseFloat(ratings.avg_rating).toFixed(1) : null,
        reviewCount: ratings?.review_count || 0,
        bookedHours: utilization ? Math.round(utilization.booked_minutes / 60) : 0,
      };
    });

    return success({
      period: { start, end },
      staff: staffData,
      summary: {
        totalRevenue: staffData.reduce((sum, s) => sum + s.revenue, 0),
        totalBookings: staffData.reduce((sum, s) => sum + s.totalBookings, 0),
        avgRating: staffData.filter((s) => s.avgRating).length > 0
          ? (staffData.filter((s) => s.avgRating).reduce((sum, s) => sum + parseFloat(s.avgRating), 0) / staffData.filter((s) => s.avgRating).length).toFixed(1)
          : null,
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get staff report error:', err);
    return error('Failed to get staff report', 500);
  }
}
