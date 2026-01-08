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

// GET /api/salons/[id]/products - Get salon products
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const categoryId = searchParams.get('categoryId');

    let sql = 'SELECT * FROM products WHERE salon_id = ?';
    const sqlParams = [id];

    if (!includeInactive) {
      sql += ' AND is_active = 1';
    }

    if (categoryId) {
      sql += ' AND category_id = ?';
      sqlParams.push(categoryId);
    }

    sql += ' ORDER BY name';

    const products = await query(sql, sqlParams);

    return success({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: parseFloat(p.price),
        sku: p.sku,
        stockQuantity: p.stock_quantity,
        categoryId: p.category_id,
        isActive: p.is_active,
      })),
    });
  } catch (err) {
    console.error('Get products error:', err);
    return error('Failed to get products', 500);
  }
}

// POST /api/salons/[id]/products - Create product
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to create products');
    }

    const body = await request.json();
    const { name, description, price, sku, stockQuantity, categoryId, isActive = true } = body;

    if (!name || price === undefined) {
      return error('Name and price are required');
    }

    const result = await query(
      `INSERT INTO products (salon_id, name, description, price, sku, stock_quantity, category_id, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, name, description || null, price, sku || null, stockQuantity || 0, categoryId || null, isActive]
    );

    return created({
      id: result.insertId,
      name,
      description,
      price,
      sku,
      stockQuantity,
      categoryId,
      isActive,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create product error:', err);
    return error('Failed to create product', 500);
  }
}
