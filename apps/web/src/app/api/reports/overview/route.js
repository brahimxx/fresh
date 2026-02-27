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

// GET /api/reports/overview - Get KPIs overview
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
      return forbidden('Not authorized to view reports');
    }

    // Default to current month
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Total revenue
    const [revenueResult] = await query(
      `SELECT COALESCE(SUM(p.amount), 0) as total_revenue
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       WHERE b.salon_id = ? AND p.status = 'paid'
       AND DATE(p.created_at) BETWEEN ? AND ?`,
      [salonId, start, end]
    );

    // Total bookings
    const [bookingsResult] = await query(
      `SELECT 
         COUNT(*) as total_bookings,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
         SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
       FROM bookings
       WHERE salon_id = ? AND DATE(start_datetime) BETWEEN ? AND ?`,
      [salonId, start, end]
    );

    // New clients
    const [newClientsResult] = await query(
      `SELECT COUNT(*) as new_clients
       FROM salon_clients
       WHERE salon_id = ? AND is_active = 1 AND DATE(first_visit_date) BETWEEN ? AND ?`,
      [salonId, start, end]
    );

    // Calculate cancellation rate
    const totalBookings = bookingsResult.total_bookings || 0;
    const cancellationRate = totalBookings > 0
      ? ((bookingsResult.cancelled / totalBookings) * 100).toFixed(1)
      : 0;
    const noShowRate = totalBookings > 0
      ? ((bookingsResult.no_show / totalBookings) * 100).toFixed(1)
      : 0;

    return success({
      period: { start, end },
      kpis: {
        revenue: parseFloat(revenueResult.total_revenue),
        totalBookings: totalBookings,
        completedBookings: bookingsResult.completed || 0,
        cancelledBookings: bookingsResult.cancelled || 0,
        noShowBookings: bookingsResult.no_show || 0,
        cancellationRate: parseFloat(cancellationRate),
        noShowRate: parseFloat(noShowRate),
        newClients: newClientsResult.new_clients || 0,
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get reports overview error:', err);
    return error('Failed to get reports', 500);
  }
}
