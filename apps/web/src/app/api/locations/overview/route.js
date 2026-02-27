import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/locations/overview - Get multi-location overview dashboard
export async function GET(request) {
  try {
    const session = await requireAuth();

    if (session.role !== 'admin' && session.role !== 'owner') {
      return forbidden('Only owners can view multi-location overview');
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || startDate;

    // Get all locations for this owner
    const locations = await query('SELECT id, name, city FROM salons WHERE owner_id = ? AND is_active = 1', [
      session.userId,
    ]);

    if (locations.length === 0) {
      return success({
        locations: [],
        totals: { revenue: 0, bookings: 0, newClients: 0 },
      });
    }

    const locationIds = locations.map((l) => l.id);

    // Get stats for each location
    const locationStats = await Promise.all(
      locations.map(async (location) => {
        // Revenue
        const [revenueResult] = await query(
          `SELECT COALESCE(SUM(p.amount), 0) as revenue
           FROM payments p
           JOIN bookings b ON b.id = p.booking_id
           WHERE b.salon_id = ? AND p.status = 'paid' AND DATE(p.created_at) BETWEEN ? AND ?`,
          [location.id, startDate, endDate]
        );

        // Bookings
        const [bookingsResult] = await query(
          `SELECT COUNT(*) as count FROM bookings 
           WHERE salon_id = ? AND DATE(start_datetime) BETWEEN ? AND ?`,
          [location.id, startDate, endDate]
        );

        // New clients
        const [clientsResult] = await query(
          `SELECT COUNT(*) as count FROM salon_clients 
           WHERE salon_id = ? AND is_active = 1 AND DATE(created_at) BETWEEN ? AND ?`,
          [location.id, startDate, endDate]
        );

        // Staff count
        const [staffResult] = await query('SELECT COUNT(*) as count FROM staff WHERE salon_id = ? AND is_active = 1', [
          location.id,
        ]);

        return {
          id: location.id,
          name: location.name,
          city: location.city,
          revenue: parseFloat(revenueResult.revenue || 0),
          bookings: parseInt(bookingsResult.count || 0),
          newClients: parseInt(clientsResult.count || 0),
          staffCount: parseInt(staffResult.count || 0),
        };
      })
    );

    // Calculate totals
    const totals = {
      revenue: locationStats.reduce((sum, l) => sum + l.revenue, 0),
      bookings: locationStats.reduce((sum, l) => sum + l.bookings, 0),
      newClients: locationStats.reduce((sum, l) => sum + l.newClients, 0),
      staffCount: locationStats.reduce((sum, l) => sum + l.staffCount, 0),
    };

    return success({
      locations: locationStats,
      totals,
      dateRange: { startDate, endDate },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get locations overview error:', err);
    return error('Failed to get overview', 500);
  }
}
