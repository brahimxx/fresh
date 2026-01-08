import { query, getOne } from '@/lib/db';
import { success, error } from '@/lib/response';

// POST /api/discounts/validate - Validate a discount code
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, salonId, subtotal = 0, hasServices = true, hasProducts = false } = body;

    if (!code || !salonId) {
      return error('Code and salon ID are required');
    }

    const discount = await getOne(
      `SELECT * FROM discounts 
       WHERE code = ? AND salon_id = ? AND is_active = 1
       AND (start_date IS NULL OR start_date <= CURDATE())
       AND (end_date IS NULL OR end_date >= CURDATE())
       AND (max_uses IS NULL OR current_uses < max_uses)`,
      [code.toUpperCase(), salonId]
    );

    if (!discount) {
      return error('Invalid or expired discount code', 404);
    }

    // Check if discount applies to the cart contents
    if (hasServices && !discount.applies_to_services) {
      return error('This discount does not apply to services');
    }

    if (hasProducts && !discount.applies_to_products) {
      return error('This discount does not apply to products');
    }

    // Check minimum purchase
    if (discount.min_purchase && subtotal < discount.min_purchase) {
      return error(`Minimum purchase of €${discount.min_purchase} required`);
    }

    // Calculate discount amount
    let discountAmount;
    if (discount.type === 'percentage') {
      discountAmount = subtotal * (discount.value / 100);
      if (discount.max_discount && discountAmount > discount.max_discount) {
        discountAmount = discount.max_discount;
      }
    } else {
      discountAmount = discount.value;
    }

    return success({
      valid: true,
      discount: {
        id: discount.id,
        code: discount.code,
        name: discount.name,
        type: discount.type,
        value: parseFloat(discount.value),
        calculatedAmount: Math.min(discountAmount, subtotal),
      },
    });
  } catch (err) {
    console.error('Validate discount error:', err);
    return error('Failed to validate discount', 500);
  }
}
