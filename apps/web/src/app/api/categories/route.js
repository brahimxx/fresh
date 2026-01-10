import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, forbidden } from '@/lib/response';

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  if (!salon) return false;
  if (salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role IN ('manager') AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// GET /api/categories - Get all service categories
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salon_id');

    let sql = `
      SELECT sc.*
      FROM service_categories sc
      WHERE 1=1
    `;
    const params = [];

    if (salonId) {
      sql += ' AND sc.salon_id = ?';
      params.push(salonId);
    }

    sql += ' ORDER BY sc.display_order ASC, sc.name ASC';

    const categories = await query(sql, params);

    return success({
      data: categories.map((c) => ({
        id: c.id,
        salonId: c.salon_id,
        name: c.name,
        displayOrder: c.display_order,
      })),
    });
  } catch (err) {
    console.error('Get categories error:', err);
    return error('Failed to get categories', 500);
  }
}

// POST /api/categories - Create a new service category
export async function POST(request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { salon_id, name, display_order } = body;

    if (!salon_id) {
      return error('salon_id is required', 400);
    }

    if (!name) {
      return error('Category name is required', 400);
    }

    // Check salon access
    const hasAccess = await checkSalonAccess(salon_id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to add categories to this salon');
    }

    const result = await query(
      `INSERT INTO service_categories (salon_id, name, display_order)
       VALUES (?, ?, ?)`,
      [salon_id, name, display_order || 0]
    );

    const newCategory = await getOne(
      'SELECT * FROM service_categories WHERE id = ?',
      [result.insertId]
    );

    return created({
      id: newCategory.id,
      salonId: newCategory.salon_id,
      name: newCategory.name,
      displayOrder: newCategory.display_order,
    });
  } catch (err) {
    console.error('Create category error:', err);
    return error('Failed to create category', 500);
  }
}
