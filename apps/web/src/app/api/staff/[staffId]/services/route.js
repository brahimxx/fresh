import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error, notFound, forbidden } from "@/lib/response";

// Helper to check staff access
async function checkStaffAccess(staffId, userId, role) {
  if (role === "admin") return true;

  const staff = await getOne(
    "SELECT s.*, sa.owner_id FROM staff s JOIN salons sa ON sa.id = s.salon_id WHERE s.id = ?",
    [staffId]
  );

  if (!staff) return null;

  // Owner has access
  if (staff.owner_id === userId) return staff;

  // Manager has access
  const isManager = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [staff.salon_id, userId]
  );
  if (isManager) return staff;

  // Staff member can view their own data
  if (staff.user_id === userId) return staff;

  return null;
}

// GET /api/staff/[staffId]/services - Get staff member's assigned services
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId } = await params;

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return notFound("Staff member not found or access denied");
    }

    // Get assigned services
    const services = await query(
      `SELECT s.id, s.name, s.description, s.duration_minutes, s.price, s.category_id
       FROM services s
       JOIN service_staff ss ON ss.service_id = s.id
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
    const { staffId } = await params;
    const body = await request.json();
    const { services } = body;

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return notFound("Staff member not found or access denied");
    }

    // Only owner or manager can update services (not self)
    if (session.role !== "admin" && staff.user_id === session.userId) {
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
