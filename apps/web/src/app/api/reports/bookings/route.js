import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/reports/bookings - Get bookings report
export async function GET(request) {
  try {
    const session = await requireAuth();

    if (session.role !== 'admin' && session.role !== 'owner') {
      return forbidden('Not authorized to view reports');
    }

    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'day'; // day, week, month

    if (!salonId) {
      return error('Salon ID is required');
    }

    // Verify salon access
    if (session.role !== 'admin') {
      const [salon] = await query('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
      if (!salon || salon.owner_id !== session.userId) {
        return forbidden('Not authorized for this salon');
      }
    }

    let dateFormat;
    switch (groupBy) {
      case 'week':
        dateFormat = '%Y-%u';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    let sql = `
      SELECT 
        DATE_FORMAT(start_datetime, '${dateFormat}') as period,
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
      FROM bookings
      WHERE salon_id = ?
    `;
    const sqlParams = [salonId];

    if (startDate) {
      sql += ' AND DATE(start_datetime) >= ?';
      sqlParams.push(startDate);
    }

    if (endDate) {
      sql += ' AND DATE(start_datetime) <= ?';
      sqlParams.push(endDate);
    }

    sql += ' GROUP BY period ORDER BY period DESC';

    const data = await query(sql, sqlParams);

    // Get summary
    let summarySql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows
      FROM bookings WHERE salon_id = ?
    `;
    const summaryParams = [salonId];

    if (startDate) {
      summarySql += ' AND DATE(start_datetime) >= ?';
      summaryParams.push(startDate);
    }
    if (endDate) {
      summarySql += ' AND DATE(start_datetime) <= ?';
      summaryParams.push(endDate);
    }

    const [summary] = await query(summarySql, summaryParams);

    const completionRate = summary.total > 0 ? ((summary.completed / summary.total) * 100).toFixed(1) : 0;
    const cancellationRate = summary.total > 0 ? ((summary.cancelled / summary.total) * 100).toFixed(1) : 0;
    const noShowRate = summary.total > 0 ? ((summary.no_shows / summary.total) * 100).toFixed(1) : 0;

    return success({
      data: data.map((d) => ({
        period: d.period,
        totalBookings: parseInt(d.total_bookings),
        completed: parseInt(d.completed),
        cancelled: parseInt(d.cancelled),
        noShows: parseInt(d.no_shows),
        pending: parseInt(d.pending),
        confirmed: parseInt(d.confirmed),
      })),
      summary: {
        totalBookings: parseInt(summary.total),
        completed: parseInt(summary.completed),
        cancelled: parseInt(summary.cancelled),
        noShows: parseInt(summary.no_shows),
        completionRate: parseFloat(completionRate),
        cancellationRate: parseFloat(cancellationRate),
        noShowRate: parseFloat(noShowRate),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Bookings report error:', err);
    return error('Failed to get report', 500);
  }
}
