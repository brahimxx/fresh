import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/reports/clients - Get clients report
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

    // New clients over time
    let newClientsSql = `
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as new_clients
      FROM salon_clients
      WHERE salon_id = ?
    `;
    const newClientsParams = [salonId];

    if (startDate) {
      newClientsSql += ' AND DATE(created_at) >= ?';
      newClientsParams.push(startDate);
    }
    if (endDate) {
      newClientsSql += ' AND DATE(created_at) <= ?';
      newClientsParams.push(endDate);
    }

    newClientsSql += ' GROUP BY month ORDER BY month DESC LIMIT 12';

    const newClientsData = await query(newClientsSql, newClientsParams);

    // Client retention / visit frequency
    const visitFrequency = await query(
      `SELECT 
        CASE 
          WHEN total_visits = 1 THEN 'one_time'
          WHEN total_visits BETWEEN 2 AND 5 THEN 'occasional'
          WHEN total_visits BETWEEN 6 AND 10 THEN 'regular'
          ELSE 'loyal'
        END as category,
        COUNT(*) as count
       FROM salon_clients
       WHERE salon_id = ?
       GROUP BY category`,
      [salonId]
    );

    // Top clients by revenue
    const topClients = await query(
      `SELECT 
        sc.client_id,
        u.first_name,
        u.last_name,
        u.email,
        sc.total_visits,
        sc.last_visit_date,
        COALESCE(SUM(p.amount), 0) as total_spent
       FROM salon_clients sc
       JOIN users u ON u.id = sc.client_id
       LEFT JOIN bookings b ON b.client_id = sc.client_id AND b.salon_id = sc.salon_id
       LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'paid'
       WHERE sc.salon_id = ?
       GROUP BY sc.client_id, u.first_name, u.last_name, u.email, sc.total_visits, sc.last_visit_date
       ORDER BY total_spent DESC
       LIMIT 10`,
      [salonId]
    );

    // Summary stats
    const [summary] = await query(
      `SELECT 
        COUNT(*) as total_clients,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_last_30_days,
        AVG(total_visits) as avg_visits,
        SUM(CASE WHEN last_visit_date >= DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 1 ELSE 0 END) as active_clients
       FROM salon_clients WHERE salon_id = ?`,
      [salonId]
    );

    // Average revenue per client
    const [avgRevenue] = await query(
      `SELECT AVG(client_total) as avg_revenue FROM (
        SELECT sc.client_id, COALESCE(SUM(p.amount), 0) as client_total
        FROM salon_clients sc
        LEFT JOIN bookings b ON b.client_id = sc.client_id AND b.salon_id = sc.salon_id
        LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'paid'
        WHERE sc.salon_id = ?
        GROUP BY sc.client_id
      ) as client_revenues`,
      [salonId]
    );

    return success({
      newClientsOverTime: newClientsData.map((d) => ({
        month: d.month,
        count: parseInt(d.new_clients),
      })),
      visitFrequency: {
        oneTime: parseInt(visitFrequency.find((v) => v.category === 'one_time')?.count || 0),
        occasional: parseInt(visitFrequency.find((v) => v.category === 'occasional')?.count || 0),
        regular: parseInt(visitFrequency.find((v) => v.category === 'regular')?.count || 0),
        loyal: parseInt(visitFrequency.find((v) => v.category === 'loyal')?.count || 0),
      },
      topClients: topClients.map((c) => ({
        id: c.client_id,
        name: `${c.first_name} ${c.last_name}`,
        email: c.email,
        totalVisits: c.total_visits,
        lastVisit: c.last_visit_date,
        totalSpent: parseFloat(c.total_spent),
      })),
      summary: {
        totalClients: parseInt(summary.total_clients),
        newLast30Days: parseInt(summary.new_last_30_days),
        avgVisitsPerClient: parseFloat(summary.avg_visits || 0).toFixed(1),
        activeClients: parseInt(summary.active_clients),
        retentionRate: summary.total_clients > 0
          ? ((summary.active_clients / summary.total_clients) * 100).toFixed(1)
          : 0,
        avgRevenuePerClient: parseFloat(avgRevenue.avg_revenue || 0),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Clients report error:', err);
    return error('Failed to get report', 500);
  }
}
