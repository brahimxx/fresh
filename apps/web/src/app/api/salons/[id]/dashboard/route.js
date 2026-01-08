import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/salons/[id]/dashboard - Get salon dashboard summary
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Verify ownership
    const salon = await getOne('SELECT * FROM salons WHERE id = ?', [id]);
    if (!salon) {
      return error('Salon not found', 404);
    }

    if (session.role !== 'admin' && salon.owner_id !== session.userId) {
      // Check if staff
      const staff = await getOne(
        'SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
        [id, session.userId]
      );
      if (!staff) {
        return forbidden('Not authorized');
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Today's stats
    const [todayBookings] = await query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
       FROM bookings WHERE salon_id = ? AND DATE(start_datetime) = ?`,
      [id, today]
    );

    // Today's revenue
    const [todayRevenue] = await query(
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       WHERE b.salon_id = ? AND DATE(p.created_at) = ? AND p.status = 'paid'`,
      [id, today]
    );

    // This week's revenue
    const [weekRevenue] = await query(
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       WHERE b.salon_id = ? AND DATE(p.created_at) >= ? AND p.status = 'paid'`,
      [id, startOfWeek]
    );

    // This month's revenue
    const [monthRevenue] = await query(
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       WHERE b.salon_id = ? AND DATE(p.created_at) >= ? AND p.status = 'paid'`,
      [id, startOfMonth]
    );

    // New clients this month
    const [newClients] = await query(
      `SELECT COUNT(*) as total FROM salon_clients 
       WHERE salon_id = ? AND DATE(created_at) >= ?`,
      [id, startOfMonth]
    );

    // Upcoming bookings (next 7 days)
    const upcomingBookings = await query(
      `SELECT b.*, u.first_name, u.last_name, 
        GROUP_CONCAT(s.name) as services
       FROM bookings b
       JOIN users u ON u.id = b.client_id
       LEFT JOIN booking_services bs ON bs.booking_id = b.id
       LEFT JOIN services s ON s.id = bs.service_id
       WHERE b.salon_id = ? AND b.start_datetime >= NOW() 
       AND b.start_datetime <= DATE_ADD(NOW(), INTERVAL 7 DAY)
       AND b.status IN ('pending', 'confirmed')
       GROUP BY b.id
       ORDER BY b.start_datetime
       LIMIT 10`,
      [id]
    );

    // Recent reviews
    const recentReviews = await query(
      `SELECT r.*, u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON u.id = r.client_id
       WHERE r.salon_id = ?
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [id]
    );

    // Staff count
    const [staffCount] = await query(
      'SELECT COUNT(*) as total FROM staff WHERE salon_id = ? AND is_active = 1',
      [id]
    );

    // Service count
    const [serviceCount] = await query(
      'SELECT COUNT(*) as total FROM services WHERE salon_id = ? AND is_active = 1',
      [id]
    );

    return success({
      salon: {
        id: salon.id,
        name: salon.name,
        isActive: salon.is_active,
      },
      today: {
        bookings: {
          total: parseInt(todayBookings.total || 0),
          completed: parseInt(todayBookings.completed || 0),
          pending: parseInt(todayBookings.pending || 0),
          confirmed: parseInt(todayBookings.confirmed || 0),
        },
        revenue: parseFloat(todayRevenue.total || 0),
      },
      week: {
        revenue: parseFloat(weekRevenue.total || 0),
      },
      month: {
        revenue: parseFloat(monthRevenue.total || 0),
        newClients: parseInt(newClients.total || 0),
      },
      counts: {
        staff: parseInt(staffCount.total || 0),
        services: parseInt(serviceCount.total || 0),
      },
      upcomingBookings: upcomingBookings.map((b) => ({
        id: b.id,
        clientName: `${b.first_name} ${b.last_name}`,
        startTime: b.start_datetime,
        endTime: b.end_datetime,
        services: b.services,
        status: b.status,
      })),
      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        clientName: `${r.first_name} ${r.last_name}`,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get dashboard error:', err);
    return error('Failed to get dashboard', 500);
  }
}
