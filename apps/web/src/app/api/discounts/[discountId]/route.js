import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// Helper to check discount access
async function checkDiscountAccess(discountId, userId, role) {
  const discount = await getOne(
    'SELECT d.*, s.owner_id FROM discounts d JOIN salons s ON s.id = d.salon_id WHERE d.id = ? AND d.deleted_at IS NULL',
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

    const discount = await getOne('SELECT * FROM discounts WHERE id = ? AND deleted_at IS NULL', [discountId]);

    if (!discount) {
      return notFound('Discount not found');
    }

    const services = await query('SELECT service_id FROM discount_services WHERE discount_id = ?', [discountId]);
    const products = await query('SELECT product_id FROM discount_products WHERE discount_id = ?', [discountId]);

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
      specificServices: services.map(s => s.service_id),
      specificProducts: products.map(p => p.product_id),
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
      min_purchase: minPurchase,
      max_discount: maxDiscount,
      start_date: startDate,
      end_date: endDate,
      max_uses: maxUses,
      is_active: isActive,
      applies_to_services: appliesToServices,
      applies_to_products: appliesToProducts,
      specific_services: specificServices,
      specific_products: specificProducts,
    } = body;

    const updates = [];
    const sqlParams = [];

    if (name !== undefined) { updates.push('name = ?'); sqlParams.push(name); }
    if (description !== undefined) { updates.push('description = ?'); sqlParams.push(description); }
    if (type !== undefined) { updates.push('type = ?'); sqlParams.push(type); }
    if (value !== undefined) { updates.push('value = ?'); sqlParams.push(value); }
    if (minPurchase !== undefined) { updates.push('min_purchase = ?'); sqlParams.push(minPurchase); }
    if (maxDiscount !== undefined) { updates.push('max_discount = ?'); sqlParams.push(maxDiscount); }
    if (startDate !== undefined) { updates.push('start_date = ?'); sqlParams.push(startDate); }
    if (endDate !== undefined) { updates.push('end_date = ?'); sqlParams.push(endDate); }
    if (maxUses !== undefined) { updates.push('max_uses = ?'); sqlParams.push(maxUses); }
    if (isActive !== undefined) { updates.push('is_active = ?'); sqlParams.push(isActive); }
    if (appliesToServices !== undefined) { updates.push('applies_to_services = ?'); sqlParams.push(appliesToServices); }
    if (appliesToProducts !== undefined) { updates.push('applies_to_products = ?'); sqlParams.push(appliesToProducts); }

    if (updates.length > 0) {
      sqlParams.push(discountId);
      await query(`UPDATE discounts SET ${updates.join(', ')} WHERE id = ?`, sqlParams);
    }

    if (specificServices !== undefined) {
      await query('DELETE FROM discount_services WHERE discount_id = ?', [discountId]);
      if (specificServices.length > 0) {
        const serviceValues = specificServices.map(id => [discountId, id]);
        const placeholders = serviceValues.map(() => "(?, ?)").join(", ");
        await query(`INSERT INTO discount_services (discount_id, service_id) VALUES ${placeholders}`, serviceValues.flat());
      }
    }

    if (specificProducts !== undefined) {
      await query('DELETE FROM discount_products WHERE discount_id = ?', [discountId]);
      if (specificProducts.length > 0) {
        const productValues = specificProducts.map(id => [discountId, id]);
        const placeholders = productValues.map(() => "(?, ?)").join(", ");
        await query(`INSERT INTO discount_products (discount_id, product_id) VALUES ${placeholders}`, productValues.flat());
      }
    }

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

    await query('UPDATE discounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [discountId]);

    return success({ message: 'Discount deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete discount error:', err);
    return error('Failed to delete discount', 500);
  }
}
