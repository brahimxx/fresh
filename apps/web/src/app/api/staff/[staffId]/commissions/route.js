import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/staff/[id]/commissions - Get staff member's commission history
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Get staff and verify access
    const staff = await getOne(
      `SELECT st.*, s.owner_id, u.first_name, u.last_name
       FROM staff st 
       JOIN salons s ON s.id = st.salon_id
       JOIN users u ON u.id = st.user_id
       WHERE st.id = ?`,
      [id]
    );

    if (!staff) {
      return error('Staff not found', 404);
    }

    // Staff can see their own, owners can see their salon's staff
    if (session.role !== 'admin' && staff.owner_id !== session.userId && staff.user_id !== session.userId) {
      return forbidden('Not authorized to view this commission data');
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'month'; // day, week, month

    // Get commission settings
    const settings = await getOne('SELECT * FROM staff_commissions WHERE staff_id = ?', [id]);

    // Build query based on grouping
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    let dataQuery = `
      SELECT 
        DATE_FORMAT(b.start_datetime, '${dateFormat}') as period,
        COUNT(DISTINCT b.id) as bookings,
        COALESCE(SUM(bs.price), 0) as revenue
      FROM bookings b
      LEFT JOIN booking_services bs ON bs.booking_id = b.id
      WHERE b.staff_id = ? AND b.status = 'completed'
    `;
    const dataParams = [id];

    if (startDate && endDate) {
      dataQuery += ' AND DATE(b.start_datetime) BETWEEN ? AND ?';
      dataParams.push(startDate, endDate);
    }

    dataQuery += ' GROUP BY period ORDER BY period DESC';

    const periodData = await query(dataQuery, dataParams);

    // Calculate commissions for each period
    const commissionType = settings?.commission_type || 'percentage';
    const commissionValue = parseFloat(settings?.commission_value || 0);

    const periods = periodData.map((p) => {
      let commission = 0;
      if (commissionType === 'percentage') {
        commission = parseFloat(p.revenue) * (commissionValue / 100);
      } else {
        commission = parseInt(p.bookings) * commissionValue;
      }

      return {
        period: p.period,
        bookings: parseInt(p.bookings),
        revenue: parseFloat(p.revenue),
        commission,
      };
    });

    return success({
      staffId: parseInt(id),
      staffName: `${staff.first_name} ${staff.last_name}`,
      settings: settings
        ? {
            type: settings.commission_type,
            value: parseFloat(settings.commission_value),
          }
        : null,
      periods,
      totals: {
        totalBookings: periods.reduce((sum, p) => sum + p.bookings, 0),
        totalRevenue: periods.reduce((sum, p) => sum + p.revenue, 0),
        totalCommission: periods.reduce((sum, p) => sum + p.commission, 0),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get staff commissions error:', err);
    return error('Failed to get commissions', 500);
  }
}
