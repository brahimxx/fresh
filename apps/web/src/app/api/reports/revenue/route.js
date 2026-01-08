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

// GET /api/reports/revenue - Get revenue report by date range
export async function GET(request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const salonId = searchParams.get('salonId') || searchParams.get('salon_id');
    const startDate = searchParams.get('startDate') || searchParams.get('start_date');
    const endDate = searchParams.get('endDate') || searchParams.get('end_date');
    const groupBy = searchParams.get('groupBy') || 'day'; // day, week, month

    if (!salonId) {
      return error('Salon ID is required');
    }

    const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to view revenue reports');
    }

    // Default to last 30 days
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let dateFormat;
    switch (groupBy) {
      case 'week':
        dateFormat = "DATE_FORMAT(p.created_at, '%Y-%u')";
        break;
      case 'month':
        dateFormat = "DATE_FORMAT(p.created_at, '%Y-%m')";
        break;
      default:
        dateFormat = 'DATE(p.created_at)';
    }

    const revenueData = await query(
      `SELECT 
         ${dateFormat} as period,
         SUM(p.amount) as revenue,
         COUNT(DISTINCT p.id) as transactions,
         COUNT(DISTINCT b.id) as bookings
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       WHERE b.salon_id = ? AND p.status = 'paid'
       AND DATE(p.created_at) BETWEEN ? AND ?
       GROUP BY ${dateFormat}
       ORDER BY period`,
      [salonId, start, end]
    );

    // Revenue by payment method
    const [methodBreakdown] = await query(
      `SELECT 
         SUM(CASE WHEN p.method = 'card' THEN p.amount ELSE 0 END) as card_revenue,
         SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END) as cash_revenue
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       WHERE b.salon_id = ? AND p.status = 'paid'
       AND DATE(p.created_at) BETWEEN ? AND ?`,
      [salonId, start, end]
    );

    // Revenue by service
    const serviceRevenue = await query(
      `SELECT 
         sv.name as service_name,
         SUM(bs.price) as revenue,
         COUNT(*) as count
       FROM booking_services bs
       JOIN bookings b ON b.id = bs.booking_id
       JOIN services sv ON sv.id = bs.service_id
       WHERE b.salon_id = ? AND b.status = 'completed'
       AND DATE(b.start_datetime) BETWEEN ? AND ?
       GROUP BY sv.id
       ORDER BY revenue DESC
       LIMIT 10`,
      [salonId, start, end]
    );

    const totalRevenue = revenueData.reduce((sum, d) => sum + parseFloat(d.revenue), 0);

    return success({
      period: { start, end, groupBy },
      summary: {
        totalRevenue,
        cardRevenue: parseFloat(methodBreakdown?.card_revenue || 0),
        cashRevenue: parseFloat(methodBreakdown?.cash_revenue || 0),
      },
      timeline: revenueData.map((d) => ({
        period: d.period,
        revenue: parseFloat(d.revenue),
        transactions: d.transactions,
        bookings: d.bookings,
      })),
      topServices: serviceRevenue.map((s) => ({
        name: s.service_name,
        revenue: parseFloat(s.revenue),
        count: s.count,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get revenue report error:', err);
    return error('Failed to get revenue report', 500);
  }
}
