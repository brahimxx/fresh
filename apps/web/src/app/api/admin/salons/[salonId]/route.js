import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden, notFound } from '@/lib/response';

// GET /api/admin/salons/[salonId] - Get salon details
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const { salonId } = await params;

    const salon = await getOne(
      `SELECT s.*, u.email as owner_email, u.first_name as owner_first_name, u.last_name as owner_last_name
       FROM salons s
       JOIN users u ON u.id = s.owner_id
       WHERE s.id = ?`,
      [salonId]
    );

    if (!salon) return notFound('Salon not found');

    // Get stats
    const [stats] = await query(
      `SELECT 
        (SELECT COUNT(*) FROM staff WHERE salon_id = ?) as staff_count,
        (SELECT COUNT(*) FROM services WHERE salon_id = ?) as service_count,
        (SELECT COUNT(*) FROM bookings WHERE salon_id = ?) as total_bookings,
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE b.salon_id = ? AND p.status = 'paid') as total_revenue,
        (SELECT AVG(rating) FROM reviews WHERE salon_id = ?) as avg_rating`,
      [salonId, salonId, salonId, salonId, salonId]
    );

    return success({
      id: salon.id,
      name: salon.name,
      description: salon.description,
      address: salon.address,
      city: salon.city,
      postalCode: salon.postal_code,
      phone: salon.phone,
      email: salon.email,
      website: salon.website,
      isActive: salon.is_active,
      marketplaceEnabled: salon.marketplace_enabled,
      owner: {
        id: salon.owner_id,
        email: salon.owner_email,
        name: `${salon.owner_first_name} ${salon.owner_last_name}`,
      },
      stats: {
        staffCount: stats.staff_count,
        serviceCount: stats.service_count,
        totalBookings: stats.total_bookings,
        totalRevenue: parseFloat(stats.total_revenue),
        avgRating: stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : null,
      },
      createdAt: salon.created_at,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Admin get salon error:', err);
    return error('Failed to get salon', 500);
  }
}

// PUT /api/admin/salons/[salonId] - Update salon (admin)
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const { salonId } = await params;
    const body = await request.json();
    const { isActive, marketplaceEnabled, ownerId } = body;

    await query(
      `UPDATE salons SET 
        is_active = COALESCE(?, is_active),
        marketplace_enabled = COALESCE(?, marketplace_enabled),
        owner_id = COALESCE(?, owner_id)
       WHERE id = ?`,
      [isActive, marketplaceEnabled, ownerId, salonId]
    );

    return success({ message: 'Salon updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Admin update salon error:', err);
    return error('Failed to update salon', 500);
  }
}

// DELETE /api/admin/salons/[salonId] - Delete salon
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const { salonId } = await params;

    await query('DELETE FROM salons WHERE id = ?', [salonId]);

    return success({ message: 'Salon deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Admin delete salon error:', err);
    return error('Failed to delete salon', 500);
  }
}
