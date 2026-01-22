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

    // Get active services that have at least one staff member assigned
    const services = await query(
      `SELECT 
        s.id, s.name, s.description, s.duration_minutes as duration,
        s.price, s.category_id, sc.name as category_name
       FROM services s
       LEFT JOIN service_categories sc ON sc.id = s.category_id
       INNER JOIN service_staff ss ON ss.service_id = s.id
       INNER JOIN staff st ON st.id = ss.staff_id AND st.is_active = 1
       WHERE s.salon_id = ? AND s.is_active = 1
       GROUP BY s.id
       ORDER BY sc.display_order, s.name`,
      [salonId]
    );

    // Get available staff for each service
    const servicesWithStaff = await Promise.all(
      services.map(async (service) => {
        const staff = await query(
          `SELECT 
            st.id, st.first_name, st.last_name, st.title, st.avatar_url, st.color
           FROM staff st
           INNER JOIN service_staff ss ON ss.staff_id = st.id
           WHERE ss.service_id = ? AND st.is_active = 1
           ORDER BY st.first_name`,
          [service.id]
        );

        return {
          ...service,
          availableStaff: staff.map(s => ({
            id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            firstName: s.first_name,
            lastName: s.last_name,
            title: s.title,
            avatarUrl: s.avatar_url,
            color: s.color
          }))
        };
      })
    );

    return success({
      categories: categories,
      services: servicesWithStaff
    });

  } catch (err) {
    console.error('Widget services error:', err);
    return error('Failed to load services', 500);
  }
}
