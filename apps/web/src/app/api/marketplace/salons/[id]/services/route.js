import { query } from '@/lib/db';
import { success, error } from '@/lib/response';

// GET /api/marketplace/salons/[id]/services - Get salon's public services
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    const services = await query(
      `SELECT 
        s.id, s.name, s.description, s.duration_minutes as duration,
        s.price, s.category_id, sc.name as category_name
       FROM services s
       LEFT JOIN service_categories sc ON sc.id = s.category_id
       WHERE s.salon_id = ? AND s.is_active = 1
       ORDER BY sc.display_order, sc.name, s.name`,
      [id]
    );
    
    return success(services);
    
  } catch (err) {
    console.error('Get salon services error:', err);
    return error('Failed to load services', 500);
  }
}
