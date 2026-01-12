import { query } from '@/lib/db';
import { success, error, notFound } from '@/lib/response';

// GET /api/widget/[salonId]/services - Get services for booking widget
export async function GET(request, { params }) {
  try {
    const { salonId } = await params;

    // Get categories
    const categories = await query(
      `SELECT id, name, display_order
       FROM service_categories 
       WHERE salon_id = ? 
       ORDER BY display_order, name`,
      [salonId]
    );

    // Get active services
    const services = await query(
      `SELECT 
        s.id, s.name, s.description, s.duration_minutes as duration,
        s.price, s.category_id, sc.name as category_name
       FROM services s
       LEFT JOIN service_categories sc ON sc.id = s.category_id
       WHERE s.salon_id = ? AND s.is_active = 1
       ORDER BY sc.display_order, s.name`,
      [salonId]
    );

    return success({
      categories: categories,
      services: services
    });

  } catch (err) {
    console.error('Widget services error:', err);
    return error('Failed to load services', 500);
  }
}
