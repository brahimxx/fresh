import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';

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

// GET /api/salons/[id]/services - Get salon services with categories
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Get categories
    const categories = await query('SELECT id, name FROM service_categories WHERE salon_id = ? ORDER BY name', [id]);

    // Get services for each category
    let serviceSql = `
      SELECT s.*, GROUP_CONCAT(ss.staff_id) as staff_ids
      FROM services s
      LEFT JOIN service_staff ss ON ss.service_id = s.id
      WHERE s.salon_id = ?
    `;
    const serviceParams = [id];

    if (!includeInactive) {
      serviceSql += ' AND s.is_active = 1';
    }

    serviceSql += ' GROUP BY s.id ORDER BY s.name';

    const services = await query(serviceSql, serviceParams);

    const categorizedServices = categories.map((category) => ({
      id: category.id,
      name: category.name,
      services: services
        .filter((s) => s.category_id === category.id)
        .map((s) => ({
          id: s.id,
          name: s.name,
          duration: s.duration_minutes,
          price: s.price,
          isActive: s.is_active,
          staffIds: s.staff_ids ? s.staff_ids.split(',').map(Number) : [],
        })),
    }));

    // Include uncategorized services
    const uncategorized = services.filter((s) => !s.category_id);
    if (uncategorized.length > 0) {
      categorizedServices.push({
        id: null,
        name: 'Uncategorized',
        services: uncategorized.map((s) => ({
          id: s.id,
          name: s.name,
          duration: s.duration_minutes,
          price: s.price,
          isActive: s.is_active,
          staffIds: s.staff_ids ? s.staff_ids.split(',').map(Number) : [],
        })),
      });
    }

    return success({ categories: categorizedServices });
  } catch (err) {
    console.error('Get services error:', err);
    return error('Failed to get services', 500);
  }
}

// POST /api/salons/[id]/services - Create a new service
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to create services');
    }

    const body = await request.json();
    const { name, categoryId, duration, price, isActive = true, staffIds = [] } = body;

    if (!name || !duration || price === undefined) {
      return error('Name, duration, and price are required');
    }

    const result = await query(
      'INSERT INTO services (salon_id, category_id, name, duration_minutes, price, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [id, categoryId || null, name, duration, price, isActive]
    );

    // Assign staff to this service
    for (const staffId of staffIds) {
      await query('INSERT INTO service_staff (service_id, staff_id) VALUES (?, ?)', [result.insertId, staffId]);
    }

    return created({
      id: result.insertId,
      name,
      categoryId,
      duration,
      price,
      isActive,
      staffIds,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create service error:', err);
    return error('Failed to create service', 500);
  }
}
