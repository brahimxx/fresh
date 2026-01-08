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

// GET /api/salons/[id]/discounts - Get salon discounts/promos
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to view discounts');
    }

    const { searchParams } = new URL(request.url);
    const includeExpired = searchParams.get('includeExpired') === 'true';
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let sql = 'SELECT * FROM discounts WHERE salon_id = ?';
    const sqlParams = [id];

    if (!includeExpired) {
      sql += ' AND (end_date IS NULL OR end_date >= CURDATE())';
    }

    if (!includeInactive) {
      sql += ' AND is_active = 1';
    }

    sql += ' ORDER BY created_at DESC';

    const discounts = await query(sql, sqlParams);

    return success({
      discounts: discounts.map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        description: d.description,
        type: d.type, // percentage, fixed
        value: parseFloat(d.value),
        minPurchase: d.min_purchase ? parseFloat(d.min_purchase) : null,
        maxDiscount: d.max_discount ? parseFloat(d.max_discount) : null,
        startDate: d.start_date,
        endDate: d.end_date,
        maxUses: d.max_uses,
        currentUses: d.current_uses,
        isActive: d.is_active,
        appliesToServices: d.applies_to_services,
        appliesToProducts: d.applies_to_products,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get discounts error:', err);
    return error('Failed to get discounts', 500);
  }
}

// POST /api/salons/[id]/discounts - Create discount
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to create discounts');
    }

    const body = await request.json();
    const {
      code,
      name,
      description,
      type = 'percentage', // percentage or fixed
      value,
      minPurchase,
      maxDiscount,
      startDate,
      endDate,
      maxUses,
      appliesToServices = true,
      appliesToProducts = true,
    } = body;

    if (!name || value === undefined || !type) {
      return error('Name, type, and value are required');
    }

    // Generate code if not provided
    const discountCode = code || `PROMO${Date.now().toString(36).toUpperCase()}`;

    const result = await query(
      `INSERT INTO discounts (
        salon_id, code, name, description, type, value, min_purchase, max_discount,
        start_date, end_date, max_uses, current_uses, is_active, applies_to_services,
        applies_to_products, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, NOW())`,
      [
        id,
        discountCode,
        name,
        description || null,
        type,
        value,
        minPurchase || null,
        maxDiscount || null,
        startDate || null,
        endDate || null,
        maxUses || null,
        appliesToServices,
        appliesToProducts,
      ]
    );

    return created({
      id: result.insertId,
      code: discountCode,
      name,
      type,
      value,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create discount error:', err);
    return error('Failed to create discount', 500);
  }
}
