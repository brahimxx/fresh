import { query } from "@/lib/db";
import { success, error } from "@/lib/response";

// GET /api/widget/[salonId]/staff - Get available staff for booking
export async function GET(request, { params }) {
  try {
    const { salonId } = await params;
    const { searchParams } = new URL(request.url);
    const serviceIds =
      searchParams.get("services")?.split(",").filter(Boolean) || [];

    let staffQuery = `
      SELECT 
        s.id, s.title, s.avatar_url,
        u.first_name, u.last_name,
        AVG(r.rating) as rating,
        COUNT(r.id) as review_count
      FROM staff s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN reviews r ON r.staff_id = s.id AND r.status = 'approved'
      WHERE s.salon_id = ? AND s.is_active = 1
    `;

    const queryParams = [salonId];

    // If specific services selected, filter by staff who can perform them
    if (serviceIds.length > 0) {
      staffQuery += ` AND s.id IN (
          SELECT staff_id FROM service_staff WHERE service_id IN (${serviceIds
            .map(() => "?")
            .join(",")})
        )`;
      queryParams.push(...serviceIds);
    }

    staffQuery += ` GROUP BY s.id, s.title, s.avatar_url, u.first_name, u.last_name
                    ORDER BY u.first_name`;

    const staff = await query(staffQuery, queryParams);

    // Get specialties for each staff member
    const staffWithDetails = await Promise.all(
      staff.map(async (member) => {
        // Get service IDs they can perform
        const serviceIds = await query(
          `SELECT ss.service_id
         FROM service_staff ss
         WHERE ss.staff_id = ?`,
          [member.id]
        );

        return {
          id: member.id,
          name: `${member.first_name} ${member.last_name}`,
          title: member.title,
          avatar_url: member.avatar_url,
          rating: member.rating ? parseFloat(member.rating) : null,
          review_count: parseInt(member.review_count) || 0,
          service_ids: serviceIds.map((s) => s.service_id),
          specialties: serviceIds.map((s) => s.service_id), // Keep for backward compatibility if needed
        };
      })
    );

    return success(staffWithDetails);
  } catch (err) {
    console.error("Widget staff error:", err);
    return error("Failed to load staff", 500);
  }
}
