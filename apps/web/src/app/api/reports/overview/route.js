import { decodeId } from '@/lib/id';
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

    const rawSalonId = searchParams.get('salonId') || searchParams.get('salon_id');
    const salonId = rawSalonId ? decodeId(rawSalonId) : null;
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
    const currentDate = new Date();
    const startStr = startDate ? startDate.split('T')[0] : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
    const endStr = endDate ? endDate.split('T')[0] : new Date().toISOString().split('T')[0];

    // Format dates to cover full day bounds for SQL comparisons
    const start = `${startStr} 00:00:00`;
    const end = `${endStr} 23:59:59`;

    // Calculate previous period
    const startObj = new Date(startStr);
    const endObj = new Date(endStr);
    const durationDays = Math.ceil((endObj.getTime() - startObj.getTime()) / (1000 * 3600 * 24)) || 1;
    
    const prevEndObj = new Date(startObj.getTime() - (24 * 60 * 60 * 1000));
    const prevStartObj = new Date(prevEndObj.getTime() - ((durationDays - 1) * 24 * 60 * 60 * 1000));
    
    const prevStart = `${prevStartObj.toISOString().split('T')[0]} 00:00:00`;
    const prevEnd = `${prevEndObj.toISOString().split('T')[0]} 23:59:59`;

    // 1. Revenue Current & Previous
    const [revenueResult] = await query(`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM payments p JOIN bookings b ON b.id = p.booking_id
      WHERE b.salon_id = ? AND p.status = 'paid' AND p.created_at BETWEEN ? AND ?`,
      [salonId, start, end]
    );

    const [prevRevenueResult] = await query(`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM payments p JOIN bookings b ON b.id = p.booking_id
      WHERE b.salon_id = ? AND p.status = 'paid' AND p.created_at BETWEEN ? AND ?`,
      [salonId, prevStart, prevEnd]
    );

    // Daily Revenue Breakdown
    const dailyRevenue = await query(`
      SELECT DATE(p.created_at) as d, COALESCE(SUM(p.amount), 0) as total
      FROM payments p JOIN bookings b ON b.id = p.booking_id
      WHERE b.salon_id = ? AND p.status = 'paid' AND p.created_at BETWEEN ? AND ?
      GROUP BY DATE(p.created_at) ORDER BY d ASC`,
      [salonId, start, end]
    );

    // Convert daily array map (using day strings)
    const dailyMap = {};
    for (const r of dailyRevenue) {
      dailyMap[String(r.d).split('T')[0]] = parseFloat(r.total);
    }
    
    // Fill all days
    const dailyAmounts = [];
    for (let i = 0; i <= durationDays; i++) {
        const d = new Date(startObj.getTime() + (i * 24 * 60 * 60 * 1000));
        const dateStr = d.toISOString().split('T')[0];
        dailyAmounts.push(dailyMap[dateStr] || 0);
    }

    // 2. Bookings Current
    const [bookingsResult] = await query(`
      SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
         SUM(CASE WHEN b.status = 'no_show' THEN 1 ELSE 0 END) as no_show
       FROM bookings b WHERE b.salon_id = ? AND b.start_datetime BETWEEN ? AND ?`,
      [salonId, start, end]
    );

    const [prevBookingsResult] = await query(`
      SELECT COUNT(*) as total FROM bookings WHERE salon_id = ? AND start_datetime BETWEEN ? AND ?`,
      [salonId, prevStart, prevEnd]
    );

    // 3. Clients Current
    const [clientsResult] = await query(`
      SELECT 
        COUNT(DISTINCT client_id) as total,
        SUM(CASE WHEN first_visit_date BETWEEN ? AND ? THEN 1 ELSE 0 END) as new_clients
      FROM salon_clients WHERE salon_id = ? AND is_active = 1`,
      [start, end, salonId]
    );

    const [prevClientsResult] = await query(`
      SELECT COUNT(DISTINCT client_id) as total
      FROM salon_clients WHERE salon_id = ? AND is_active = 1 AND first_visit_date <= ?`,
      [salonId, prevEnd]
    );

    // 4. Staff Performance
    const staffPerformance = await query(`
      SELECT 
          u.first_name as first_name,
          COALESCE(SUM(p.amount), 0) as revenue
      FROM staff s
      JOIN users u ON u.id = s.user_id
      JOIN bookings b ON b.staff_id = s.id
      JOIN payments p ON p.booking_id = b.id AND p.status = 'paid'
      WHERE s.salon_id = ? AND b.start_datetime BETWEEN ? AND ?
      GROUP BY s.id, u.first_name
      ORDER BY revenue DESC
      LIMIT 1`,
      [salonId, start, end]
    );

    const durationForUtilization = durationDays * 4 || 1;
    const avgUtilization = Math.min(100, Math.round(((bookingsResult?.completed || 0) / durationForUtilization) * 100) || 0);

    // 5. Popular Services
    const popularServices = await query(`
      SELECT 
          sv.name as name, 
          COUNT(bs.service_id) as count, 
          COALESCE(SUM(bs.price), 0) as revenue
      FROM booking_services bs
      JOIN services sv ON sv.id = bs.service_id
      JOIN bookings b ON b.id = bs.booking_id
      WHERE b.salon_id = ? AND b.start_datetime BETWEEN ? AND ? AND b.status IN ('completed', 'confirmed', 'pending')
      GROUP BY sv.id, sv.name
      ORDER BY count DESC
      LIMIT 4`,
      [salonId, start, end]
    );

    // Final response matches exactly what the frontend "data" object expects
    return success({
      revenue: {
        total: parseFloat(revenueResult?.total || 0),
        previous: parseFloat(prevRevenueResult?.total || 0),
        daily: dailyAmounts
      },
        bookings: {
          total: parseInt(bookingsResult?.total || 0, 10),
          previous: parseInt(prevBookingsResult?.total || 0, 10),
          completed: parseInt(bookingsResult?.completed || 0, 10),
          cancelled: parseInt(bookingsResult?.cancelled || 0, 10),
          noShow: parseInt(bookingsResult?.no_show || 0, 10),
        },
        clients: {
          total: parseInt(clientsResult?.total || 0, 10),
          new: parseInt(clientsResult?.new_clients || 0, 10),
          returning: (parseInt(clientsResult?.total || 0, 10) - parseInt(clientsResult?.new_clients || 0, 10)) || 0,
          previous: parseInt(prevClientsResult?.total || 0, 10),
        },
        staff: {
          utilization: avgUtilization || 0,
          topPerformer: staffPerformance.length > 0 ? staffPerformance[0].first_name : 'No staff yet',
          topPerformerRevenue: staffPerformance.length > 0 ? parseFloat(staffPerformance[0].revenue) : 0,
        },
        services: {
          popular: popularServices.map(s => ({
              name: s.name,
              count: Number(s.count),
              revenue: parseFloat(s.revenue)
          }))
        }
    });

  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get reports overview error:', err);
    return error('Failed to get reports', 500);
  }
}
