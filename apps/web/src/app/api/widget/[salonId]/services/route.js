import { decodeId } from "@/lib/id";
import { query } from "@/lib/db";
import { success, error, notFound } from "@/lib/response";

// GET /api/widget/[salonId]/services - Get services for booking widget
export async function GET(request, { params }) {
  try {
    const { salonId: rawSalonId } = await params;
    const salonId = decodeId(rawSalonId);
    const { searchParams } = new URL(request.url);
    const fulfillmentType = searchParams.get("fulfillmentType") || "physical";

    // Get categories
    const categories = await query(
      `SELECT id, name, display_order
       FROM service_categories 
       WHERE salon_id = ? 
       ORDER BY display_order, name`,
      [salonId],
    );

    let serviceFulfillmentFilter = "";
    if (fulfillmentType === "mobile") {
      serviceFulfillmentFilter = "AND s.can_mobile = 1";
    } else if (fulfillmentType === "virtual") {
      serviceFulfillmentFilter = "AND s.can_virtual = 1";
    } else {
      serviceFulfillmentFilter = "AND s.can_physical = 1";
    }

    let staffCapabilityFilter = "";
    if (fulfillmentType === "mobile") {
      staffCapabilityFilter = "AND st.can_mobile = 1";
    } else if (fulfillmentType === "virtual") {
      staffCapabilityFilter = "AND st.can_virtual = 1";
    }

    // Get active services that have at least one compatible staff member assigned
    const services = await query(
      `SELECT 
        s.id, s.name, s.description, s.duration_minutes as duration,
        s.price, s.category_id, sc.name as category_name,
        s.can_physical, s.can_mobile, s.can_virtual
       FROM services s
       LEFT JOIN service_categories sc ON sc.id = s.category_id
       INNER JOIN service_staff ss ON ss.service_id = s.id
       INNER JOIN staff st ON st.id = ss.staff_id
         AND st.is_active = 1 AND st.is_visible = 1 AND st.salon_id = s.salon_id
       WHERE s.salon_id = ? AND s.is_active = 1 AND s.deleted_at IS NULL
         ${serviceFulfillmentFilter}
         ${staffCapabilityFilter}
       GROUP BY s.id
       ORDER BY sc.display_order, s.name`,
      [salonId],
    );

    // Get available staff for each service
    const servicesWithStaff = await Promise.all(
      services.map(async (service) => {
        const staff = await query(
          `SELECT 
            st.id, st.first_name, st.last_name, st.title, st.avatar_url, st.color
           FROM staff st
           INNER JOIN service_staff ss ON ss.staff_id = st.id
           WHERE ss.service_id = ?
             AND st.salon_id = ?
             AND st.is_active = 1
             AND st.is_visible = 1
             ${staffCapabilityFilter}
           ORDER BY st.first_name`,
          [service.id, salonId],
        );

        return {
          ...service,
          availableStaff: staff.map((s) => ({
            id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            firstName: s.first_name,
            lastName: s.last_name,
            title: s.title,
            avatarUrl: s.avatar_url,
            color: s.color,
          })),
        };
      }),
    );

    return success({
      categories: categories,
      services: servicesWithStaff,
    });
  } catch (err) {
    console.error("Widget services error:", err);
    return error("Failed to load services", 500);
  }
}
