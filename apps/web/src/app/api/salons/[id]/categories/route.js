import { decodeId } from '@/lib/id';
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

// GET /api/salons/[id]/categories - Get service categories
export async function GET(request, { params }) {
  try {
    const { id: rawId } = await params;
  const id = decodeId(rawId);

    const categories = await query(
      'SELECT id, name, display_order FROM service_categories WHERE salon_id = ? ORDER BY display_order ASC, name ASC',
      [id]
    );

    return success({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        displayOrder: c.display_order,
      })),
    });
  } catch (err) {
    console.error('Get categories error:', err);
    return error('Failed to get categories', 500);
  }
}

// POST /api/salons/[id]/categories - Create service category
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
  const id = decodeId(rawId);

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to create categories');
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return error('Category name is required');
    }

    const result = await query(
      'INSERT INTO service_categories (salon_id, name) VALUES (?, ?)',
      [id, name]
    );

    return created({
      id: result.insertId,
      name,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create category error:', err);
    return error('Failed to create category', 500);
  }
}
