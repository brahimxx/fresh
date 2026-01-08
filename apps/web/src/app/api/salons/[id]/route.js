import { query, getOne } from '@/lib/db';
import { getSession, requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// Helper to check if user owns the salon
async function checkSalonOwnership(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  return salon && salon.owner_id === userId;
}

// GET /api/salons/[id] - Get salon details
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const salon = await getOne(
      `SELECT s.*, 
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(DISTINCT r.id) as review_count
       FROM salons s
       LEFT JOIN reviews r ON r.salon_id = s.id
       WHERE s.id = ?
       GROUP BY s.id`,
      [id]
    );

    if (!salon) {
      return notFound('Salon not found');
    }

    // Get salon settings
    const settings = await getOne('SELECT * FROM salon_settings WHERE salon_id = ?', [id]);

    // Get salon photos
    const photos = await query('SELECT id, image_url, is_cover FROM salon_photos WHERE salon_id = ?', [id]);

    // Get services grouped by category
    const categories = await query(
      `SELECT sc.id, sc.name,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', s.id,
                  'name', s.name,
                  'duration', s.duration_minutes,
                  'price', s.price,
                  'isActive', s.is_active
                )
              ) as services
       FROM service_categories sc
       LEFT JOIN services s ON s.category_id = sc.id AND s.is_active = 1
       WHERE sc.salon_id = ?
       GROUP BY sc.id`,
      [id]
    );

    // Get staff
    const staff = await query(
      `SELECT st.id, st.role, st.is_active, u.first_name, u.last_name
       FROM staff st
       JOIN users u ON u.id = st.user_id
       WHERE st.salon_id = ? AND st.is_active = 1`,
      [id]
    );

    return success({
      id: salon.id,
      ownerId: salon.owner_id,
      name: salon.name,
      description: salon.description,
      phone: salon.phone,
      email: salon.email,
      address: salon.address,
      city: salon.city,
      country: salon.country,
      latitude: salon.latitude,
      longitude: salon.longitude,
      isMarketplaceEnabled: salon.is_marketplace_enabled,
      avgRating: parseFloat(salon.avg_rating).toFixed(1),
      reviewCount: salon.review_count,
      createdAt: salon.created_at,
      settings: settings
        ? {
            cancellationPolicyHours: settings.cancellation_policy_hours,
            noShowFee: settings.no_show_fee,
            depositRequired: settings.deposit_required,
            depositPercentage: settings.deposit_percentage,
          }
        : null,
      photos: photos.map((p) => ({
        id: p.id,
        imageUrl: p.image_url,
        isCover: p.is_cover,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        services: c.services ? JSON.parse(c.services).filter((s) => s.id !== null) : [],
      })),
      staff: staff.map((s) => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        role: s.role,
        isActive: s.is_active,
      })),
    });
  } catch (err) {
    console.error('Get salon error:', err);
    return error('Failed to get salon', 500);
  }
}

// PUT /api/salons/[id] - Update salon
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const isOwner = await checkSalonOwnership(id, session.userId, session.role);
    if (!isOwner) {
      return forbidden('Not authorized to update this salon');
    }

    const body = await request.json();
    const {
      name,
      description,
      phone,
      email,
      address,
      city,
      country,
      latitude,
      longitude,
      isMarketplaceEnabled,
    } = body;

    await query(
      `UPDATE salons SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        country = COALESCE(?, country),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        is_marketplace_enabled = COALESCE(?, is_marketplace_enabled)
       WHERE id = ?`,
      [name, description, phone, email, address, city, country, latitude, longitude, isMarketplaceEnabled, id]
    );

    const salon = await getOne('SELECT * FROM salons WHERE id = ?', [id]);

    return success({
      id: salon.id,
      name: salon.name,
      description: salon.description,
      phone: salon.phone,
      email: salon.email,
      address: salon.address,
      city: salon.city,
      country: salon.country,
      latitude: salon.latitude,
      longitude: salon.longitude,
      isMarketplaceEnabled: salon.is_marketplace_enabled,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update salon error:', err);
    return error('Failed to update salon', 500);
  }
}

// DELETE /api/salons/[id] - Delete salon
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const isOwner = await checkSalonOwnership(id, session.userId, session.role);
    if (!isOwner) {
      return forbidden('Not authorized to delete this salon');
    }

    // Delete related records first
    await query('DELETE FROM salon_settings WHERE salon_id = ?', [id]);
    await query('DELETE FROM salon_photos WHERE salon_id = ?', [id]);
    await query('DELETE FROM service_categories WHERE salon_id = ?', [id]);
    await query('DELETE FROM salons WHERE id = ?', [id]);

    return success({ message: 'Salon deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete salon error:', err);
    return error('Failed to delete salon', 500);
  }
}
