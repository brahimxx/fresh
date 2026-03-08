import { query, getOne } from '@/lib/db';
import { success, error } from '@/lib/response';

// POST /api/discounts/validate - Validate a discount code
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, salonId, subtotal = 0, services = [], products = [] } = body;

    if (!code || !salonId) {
      return error('Code and salon ID are required');
    }

    const discount = await getOne(
      `SELECT * FROM discounts 
       WHERE code = ? AND salon_id = ? AND is_active = 1 AND deleted_at IS NULL
       AND (start_date IS NULL OR start_date <= CURDATE())
       AND (end_date IS NULL OR end_date >= CURDATE())
       AND (max_uses IS NULL OR current_uses < max_uses)`,
      [code.toUpperCase(), salonId]
    );

    if (!discount) {
      return error('Invalid or expired discount code', 404);
    }

    // Fetch specific restrictions
    const discountServices = await query('SELECT service_id FROM discount_services WHERE discount_id = ?', [discount.id]);
    const discountProducts = await query('SELECT product_id FROM discount_products WHERE discount_id = ?', [discount.id]);

    const specificServiceIds = discountServices.map(s => Number(s.service_id));
    const specificProductIds = discountProducts.map(p => Number(p.product_id));

    // Calculate eligible total
    let eligibleTotal = 0;

    if (discount.applies_to_services) {
      for (const svc of services) {
        const id = Number(svc.id || svc.service_id);
        if (specificServiceIds.length === 0 || specificServiceIds.includes(id)) {
          eligibleTotal += Number(svc.price || 0) * Number(svc.quantity || 1);
        }
      }
    }

    if (discount.applies_to_products) {
      for (const prd of products) {
        const id = Number(prd.id || prd.product_id);
        if (specificProductIds.length === 0 || specificProductIds.includes(id)) {
          eligibleTotal += Number(prd.price || 0) * Number(prd.quantity || 1);
        }
      }
    }

    if (eligibleTotal === 0 && subtotal > 0) {
      return error('This discount does not apply to any items in your cart');
    }

    // Check minimum purchase (against overall subtotal)
    if (discount.min_purchase && subtotal < discount.min_purchase) {
      return error(`Minimum purchase of $${discount.min_purchase} required`);
    }

    // Calculate discount amount against eligibleTotal
    let discountAmount;
    if (discount.type === 'percentage') {
      discountAmount = eligibleTotal * (Number(discount.value) / 100);
      if (discount.max_discount && discountAmount > discount.max_discount) {
        discountAmount = discount.max_discount;
      }
    } else {
      discountAmount = Math.min(Number(discount.value), eligibleTotal);
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
