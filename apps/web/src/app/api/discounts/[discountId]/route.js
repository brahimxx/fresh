import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// Helper to check discount access
async function checkDiscountAccess(discountId, userId, role) {
  const discount = await getOne(
    'SELECT d.*, s.owner_id FROM discounts d JOIN salons s ON s.id = d.salon_id WHERE d.id = ?',
    [discountId]
  );
  if (!discount) return { access: false, discount: null };
  if (role === 'admin') return { access: true, discount };
  if (discount.owner_id === userId) return { access: true, discount };
  return { access: false, discount: null };
}

// GET /api/discounts/[discountId] - Get discount details
export async function GET(request, { params }) {
  try {
    const { discountId } = await params;

    const discount = await getOne('SELECT * FROM discounts WHERE id = ?', [discountId]);

    if (!discount) {
      return notFound('Discount not found');
    }

    return success({
      id: discount.id,
      salonId: discount.salon_id,
      code: discount.code,
      name: discount.name,
      description: discount.description,
      type: discount.type,
      value: parseFloat(discount.value),
      minPurchase: discount.min_purchase ? parseFloat(discount.min_purchase) : null,
      maxDiscount: discount.max_discount ? parseFloat(discount.max_discount) : null,
      startDate: discount.start_date,
      endDate: discount.end_date,
      maxUses: discount.max_uses,
      currentUses: discount.current_uses,
      isActive: discount.is_active,
      appliesToServices: discount.applies_to_services,
      appliesToProducts: discount.applies_to_products,
    });
  } catch (err) {
    console.error('Get discount error:', err);
    return error('Failed to get discount', 500);
  }
}

// PUT /api/discounts/[discountId] - Update discount
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { discountId } = await params;

    const { access, discount } = await checkDiscountAccess(discountId, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to update this discount');
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      value,
      minPurchase,
      maxDiscount,
      startDate,
      endDate,
      maxUses,
      isActive,
      appliesToServices,
      appliesToProducts,
    } = body;

    await query(
      `UPDATE discounts SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        type = COALESCE(?, type),
        value = COALESCE(?, value),
        min_purchase = COALESCE(?, min_purchase),
        max_discount = COALESCE(?, max_discount),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        max_uses = COALESCE(?, max_uses),
        is_active = COALESCE(?, is_active),
        applies_to_services = COALESCE(?, applies_to_services),
        applies_to_products = COALESCE(?, applies_to_products)
       WHERE id = ?`,
      [
        name,
        description,
        type,
        value,
        minPurchase,
        maxDiscount,
        startDate,
        endDate,
        maxUses,
        isActive,
        appliesToServices,
        appliesToProducts,
        discountId,
      ]
    );

    return success({ message: 'Discount updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update discount error:', err);
    return error('Failed to update discount', 500);
  }
}

// DELETE /api/discounts/[discountId] - Delete discount
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { discountId } = await params;

    const { access } = await checkDiscountAccess(discountId, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to delete this discount');
    }

    await query('UPDATE discounts SET is_active = 0 WHERE id = ?', [discountId]);

    return success({ message: 'Discount deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete discount error:', err);
    return error('Failed to delete discount', 500);
  }
}
