import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// Helper to check category access
async function checkCategoryAccess(categoryId, userId, role) {
  if (role === 'admin') return true;
  const category = await getOne(
    `SELECT sc.salon_id, s.owner_id
     FROM service_categories sc
     JOIN salons s ON s.id = sc.salon_id
     WHERE sc.id = ?`,
    [categoryId]
  );
  if (!category) return false;
  if (category.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [category.salon_id, userId]
  );
  return !!staff;
}

// GET /api/categories/[categoryId] - Get category details
export async function GET(request, { params }) {
  try {
    const { categoryId } = await params;

    const category = await getOne('SELECT * FROM service_categories WHERE id = ?', [categoryId]);

    if (!category) {
      return notFound('Category not found');
    }

    const services = await query(
      'SELECT id, name, duration_minutes, price, is_active FROM services WHERE category_id = ?',
      [categoryId]
    );

    return success({
      id: category.id,
      salonId: category.salon_id,
      name: category.name,
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        duration: s.duration_minutes,
        price: s.price,
        isActive: s.is_active,
      })),
    });
  } catch (err) {
    console.error('Get category error:', err);
    return error('Failed to get category', 500);
  }
}

// PUT /api/categories/[categoryId] - Update category
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { categoryId } = await params;

    const hasAccess = await checkCategoryAccess(categoryId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to update this category');
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return error('Category name is required');
    }

    await query('UPDATE service_categories SET name = ? WHERE id = ?', [name, categoryId]);

    return success({
      id: parseInt(categoryId),
      name,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update category error:', err);
    return error('Failed to update category', 500);
  }
}

// DELETE /api/categories/[categoryId] - Delete category
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { categoryId } = await params;

    const hasAccess = await checkCategoryAccess(categoryId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to delete this category');
    }

    // Set services to uncategorized
    await query('UPDATE services SET category_id = NULL WHERE category_id = ?', [categoryId]);
    await query('DELETE FROM service_categories WHERE id = ?', [categoryId]);

    return success({ message: 'Category deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete category error:', err);
    return error('Failed to delete category', 500);
  }
}
