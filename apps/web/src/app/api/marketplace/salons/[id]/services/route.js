import { query, getOne } from '@/lib/db';
import { success, error } from '@/lib/response';

// GET /api/marketplace/salons/[id]/services - Get salon's public services
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Server-side pricing gate: check salon widget settings before returning prices
    const widgetSettings = await getOne(
      'SELECT show_prices FROM widget_settings WHERE salon_id = ?',
      [id]
    );
    const showPrices = !widgetSettings || widgetSettings.show_prices !== 0;

    const services = await query(
      `SELECT 
        s.id, s.name, s.description, s.duration_minutes,
        s.price, s.category_id, s.display_order, s.is_popular, sc.name as category_name
       FROM services s
       LEFT JOIN service_categories sc ON sc.id = s.category_id
       WHERE s.salon_id = ? 
         AND s.is_active = 1 
         AND s.deleted_at IS NULL
       ORDER BY sc.display_order ASC, sc.name ASC, s.display_order ASC, s.name ASC`,
      [id]
    );

    // Apply pricing gate server-side — never trust frontend to hide prices
    return success(services.map(s => ({
      ...s,
      price: showPrices ? parseFloat(s.price) : null
    })));

  } catch (err) {
    console.error('Get salon services error:', err);
    return error('Failed to load services', 500);
  }
}
