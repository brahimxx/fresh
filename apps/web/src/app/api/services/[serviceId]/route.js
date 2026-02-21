import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  success,
  error,
  unauthorized,
  notFound,
  forbidden,
} from "@/lib/response";

// Helper to check salon access via service
async function checkServiceAccess(serviceId, userId, role) {
  if (role === "admin") return true;
  const service = await getOne(
    `SELECT s.salon_id, sa.owner_id
     FROM services s
     JOIN salons sa ON sa.id = s.salon_id
     WHERE s.id = ?`,
    [serviceId],
  );
  if (!service) return false;
  if (service.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [service.salon_id, userId],
  );
  return !!staff;
}

// GET /api/services/[serviceId] - Get service details
export async function GET(request, { params }) {
  try {
    const { serviceId } = await params;

    const service = await getOne(
      `SELECT s.*, sc.name as category_name
       FROM services s
       LEFT JOIN service_categories sc ON sc.id = s.category_id
       WHERE s.id = ?`,
      [serviceId],
    );

    if (!service) {
      return notFound("Service not found");
    }

    // Get assigned staff
    const staff = await query(
      `SELECT st.id, u.first_name, u.last_name
       FROM service_staff ss
       JOIN staff st ON st.id = ss.staff_id
       JOIN users u ON u.id = st.user_id
       WHERE ss.service_id = ?`,
      [serviceId],
    );

    return success({
      id: service.id,
      salonId: service.salon_id,
      categoryId: service.category_id,
      categoryName: service.category_name,
      name: service.name,
      duration: service.duration_minutes,
      price: service.price,
      isActive: service.is_active,
      staff: staff.map((s) => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
      })),
    });
  } catch (err) {
    console.error("Get service error:", err);
    return error("Failed to get service", 500);
  }
}

// PUT /api/services/[serviceId] - Update service
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { serviceId } = await params;

    const hasAccess = await checkServiceAccess(
      serviceId,
      session.userId,
      session.role,
    );
    if (!hasAccess) {
      return forbidden("Not authorized to update this service");
    }

    const body = await request.json();
    const { name, categoryId, duration, price, isActive, staffIds } = body;

    if (duration !== undefined && duration !== null && Number(duration) <= 0) {
      return error("Duration must be greater than 0", 400);
    }

    if (price !== undefined && price !== null && Number(price) < 0) {
      return error("Price cannot be negative", 400);
    }

    await query(
      `UPDATE services SET
        name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        duration_minutes = COALESCE(?, duration_minutes),
        price = COALESCE(?, price),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, categoryId, duration, price, isActive, serviceId],
    );

    // Update staff assignments if provided
    if (staffIds !== undefined) {
      // Resolve the salon this service belongs to
      const svc = await getOne("SELECT salon_id FROM services WHERE id = ?", [
        serviceId,
      ]);

      if (staffIds.length > 0) {
        // Verify every staff member belongs to the same salon as the service
        const validStaff = await query(
          `SELECT id FROM staff WHERE salon_id = ? AND id IN (${staffIds.map(() => "?").join(",")}) AND is_active = 1`,
          [svc.salon_id, ...staffIds],
        );
        if (validStaff.length !== staffIds.length) {
          return error(
            "One or more staff members do not belong to this salon",
            400,
          );
        }
      }

      await query("DELETE FROM service_staff WHERE service_id = ?", [
        serviceId,
      ]);
      for (const staffId of staffIds) {
        await query(
          "INSERT INTO service_staff (service_id, staff_id) VALUES (?, ?)",
          [serviceId, staffId],
        );
      }
    }

    const service = await getOne("SELECT * FROM services WHERE id = ?", [
      serviceId,
    ]);
    const assignedStaff = await query(
      "SELECT staff_id FROM service_staff WHERE service_id = ?",
      [serviceId],
    );

    return success({
      id: service.id,
      name: service.name,
      categoryId: service.category_id,
      duration: service.duration_minutes,
      price: service.price,
      isActive: service.is_active,
      staffIds: assignedStaff.map((s) => s.staff_id),
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Update service error:", err);
    return error("Failed to update service", 500);
  }
}

// DELETE /api/services/[serviceId] - Delete service
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { serviceId } = await params;

    const hasAccess = await checkServiceAccess(
      serviceId,
      session.userId,
      session.role,
    );
    if (!hasAccess) {
      return forbidden("Not authorized to delete this service");
    }

    await query("DELETE FROM service_staff WHERE service_id = ?", [serviceId]);
    await query("DELETE FROM services WHERE id = ?", [serviceId]);

    return success({ message: "Service deleted successfully" });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Delete service error:", err);
    return error("Failed to delete service", 500);
  }
}
