import { decodeId } from '@/lib/id';
import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error, notFound, forbidden } from "@/lib/response";
import { checkStaffAccess } from '@/lib/permissions-server';



// GET /api/staff/[staffId]/services - Get staff member's assigned services
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawStaffId } = await params;
  const staffId = decodeId(rawStaffId);

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return notFound("Staff member not found or access denied");
    }

    // Get assigned services
    const services = await query(
      `SELECT s.id, s.name, s.description, s.duration_minutes, s.price, s.category_id, sc.name as category_name
       FROM services s
       JOIN service_staff ss ON ss.service_id = s.id
       LEFT JOIN service_categories sc ON s.category_id = sc.id
       WHERE ss.staff_id = ?
       ORDER BY s.name ASC`,
      [staffId]
    );

    return success(
      services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration_minutes,
        price: s.price,
        categoryId: s.category_id,
        category_name: s.category_name,
      }))
    );
  } catch (err) {
    console.error("Get staff services error:", err);
    return error("Failed to get staff services", 500);
  }
}

// PUT /api/staff/[staffId]/services - Update staff member's assigned services
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawStaffId } = await params;
  const staffId = decodeId(rawStaffId);
    const body = await request.json();
    const { services } = body;

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return notFound("Staff member not found or access denied");
    }

    // Only owner or manager can update services. Regular staff cannot update their own services.
    const isOwner = Number(staff.owner_id) === Number(session.userId);
    if (session.role !== "admin" && !isOwner && Number(staff.user_id) === Number(session.userId)) {
      return forbidden("You cannot modify your own service assignments");
    }

    // Validate services is an array
    if (!Array.isArray(services)) {
      return error("Services must be an array", 400);
    }

    // Delete existing service assignments
    await query("DELETE FROM service_staff WHERE staff_id = ?", [staffId]);

    // Insert new service assignments
    if (services.length > 0) {
      const serviceIds = services.map((s) => (typeof s === 'number' ? s : s.id));
      const values = serviceIds.map((serviceId) => [serviceId, staffId]);
      
      await query(
        "INSERT INTO service_staff (service_id, staff_id) VALUES ?",
        [values]
      );
    }

    // Get updated services list
    const updatedServices = await query(
      `SELECT s.id, s.name, s.description, s.duration_minutes, s.price, s.category_id
       FROM services s
       JOIN service_staff ss ON ss.service_id = s.id
       WHERE ss.staff_id = ?
       ORDER BY s.name ASC`,
      [staffId]
    );

    return success(
      updatedServices.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration_minutes,
        price: s.price,
        categoryId: s.category_id,
      }))
    );
  } catch (err) {
    console.error("Update staff services error:", err);
    return error("Failed to update staff services", 500);
  }
}
