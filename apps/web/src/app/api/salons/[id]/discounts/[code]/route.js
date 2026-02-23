import { getOne } from '@/lib/db';
import { success, error, notFound } from '@/lib/response';

// GET /api/salons/[id]/discounts/[code]
// Validates a discount code for a specific salon, optionally checking against a cart total.
export async function GET(request, { params }) {
  try {
    const { id: salonId, code } = await params;
    
    // Parse total from query string if frontend provides it for `min_purchase` validation
    const { searchParams } = new URL(request.url);
    const totalQuery = searchParams.get('total');
    const currentTotal = totalQuery ? parseFloat(totalQuery) : null;

    if (!salonId || !code) return error('Salon ID and Discount Code are required', 400);

    const discount = await getOne(
      `SELECT * FROM discounts 
       WHERE salon_id = ? 
         AND code = ? 
         AND is_active = 1 
         AND (start_date IS NULL OR start_date <= CURDATE())
         AND (end_date IS NULL OR end_date >= CURDATE())`,
      [salonId, code]
    );

    if (!discount) return notFound('Invalid or expired discount code');

    // Check usage limits
    if (discount.max_uses && discount.current_uses >= discount.max_uses) {
      return error('This discount code has reached its maximum usage limit', 400);
    }

    // Check min purchase if total is provided
    if (currentTotal !== null && discount.min_purchase && currentTotal < parseFloat(discount.min_purchase)) {
      return error(`Minimum purchase of ${discount.min_purchase} required to use this code`, 400);
    }

    // Calculate simulated savings if total is provided
    let calculatedSavings = 0;
    if (currentTotal !== null) {
      if (discount.type === 'fixed') {
        calculatedSavings = Math.min(parseFloat(discount.value), currentTotal);
      } else if (discount.type === 'percentage') {
        calculatedSavings = currentTotal * (parseFloat(discount.value) / 100);
      }
      
      if (discount.max_discount && calculatedSavings > parseFloat(discount.max_discount)) {
        calculatedSavings = parseFloat(discount.max_discount);
      }
    }

    return success({
      ...discount,
      min_purchase: discount.min_purchase ? parseFloat(discount.min_purchase) : null,
      max_discount: discount.max_discount ? parseFloat(discount.max_discount) : null,
      value: parseFloat(discount.value),
      simulated_savings: calculatedSavings > 0 ? calculatedSavings : null,
      isValid: true
    });

  } catch (err) {
    console.error('Discount Validation Error:', err);
    return error('Failed to validate discount', 500);
  }
}
