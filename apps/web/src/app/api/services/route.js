import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error, created, forbidden } from "@/lib/response";

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === "admin") return true;
  const salon = await getOne("SELECT owner_id FROM salons WHERE id = ?", [
    salonId,
  ]);
  if (!salon) return false;
  if (salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role IN ('manager', 'owner') AND is_active = 1",
    [salonId, userId],
  );
  return !!staff;
}

// GET /api/services - Get all services (optionally filtered by salon_id)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get("salon_id");

    let sql = `
      SELECT s.*, sc.name as category_name
      FROM services s
      LEFT JOIN service_categories sc ON sc.id = s.category_id
      WHERE s.deleted_at IS NULL
    `;
    const params = [];

    if (salonId) {
      sql += " AND s.salon_id = ?";
      params.push(salonId);
    }

    sql += " ORDER BY s.display_order ASC, s.name ASC";

    const services = await query(sql, params);

    return success({
      data: services.map((s) => ({
        id: s.id,
        salonId: s.salon_id,
        categoryId: s.category_id,
        categoryName: s.category_name,
        name: s.name,
        description: s.description,
        duration: s.duration_minutes,
        price: s.price,
        bufferTime: s.buffer_time_minutes,
        displayOrder: s.display_order,
        isActive: s.is_active,
      })),
    });
  } catch (err) {
    console.error("Get services error:", err);
    return error("Failed to get services", 500);
  }
}

// POST /api/services - Create a new service
export async function POST(request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const {
      salon_id,
      category_id,
      name,
      description,
      duration,
      price,
      buffer_time,
      display_order,
      staff_ids,
    } = body;

    if (!salon_id) {
      return error("salon_id is required", 400);
    }

    if (!name) {
      return error("Service name is required", 400);
    }

    const parsedDuration = Number(duration);
    if (!duration || parsedDuration <= 0) {
      return error("Duration must be greater than 0", 400);
    }

    if (price !== undefined && price !== null && Number(price) < 0) {
      return error("Price cannot be negative", 400);
    }

    // Check salon access
    const hasAccess = await checkSalonAccess(
      salon_id,
      session.userId,
      session.role,
    );
    if (!hasAccess) {
      return forbidden("Not authorized to add services to this salon");
    }

    const result = await query(
      `INSERT INTO services (salon_id, category_id, name, description, duration_minutes, price, buffer_time_minutes, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        salon_id,
        category_id || null,
        name,
        description || null,
        duration || 60,
        price || 0,
        buffer_time || 0,
        display_order || 0,
      ],
    );

    const newService = await getOne(
      `SELECT s.*, sc.name as category_name
       FROM services s
       LEFT JOIN service_categories sc ON sc.id = s.category_id
       WHERE s.id = ?`,
      [result.insertId],
    );

    // Assign staff members if provided
    if (Array.isArray(staff_ids) && staff_ids.length > 0) {
      // Verify every staff member belongs to the same salon
      const validStaff = await query(
        `SELECT id FROM staff WHERE salon_id = ? AND id IN (${staff_ids.map(() => "?").join(",")}) AND is_active = 1`,
        [salon_id, ...staff_ids],
      );
      if (validStaff.length !== staff_ids.length) {
        return error(
          "One or more staff members do not belong to this salon",
          400,
        );
      }
      const values = staff_ids.map((sid) => [result.insertId, sid]);
      await query(
        "INSERT IGNORE INTO service_staff (service_id, staff_id) VALUES ?",
        [values],
      );
    }

    return created({
      id: newService.id,
      salonId: newService.salon_id,
      categoryId: newService.category_id,
      categoryName: newService.category_name,
      name: newService.name,
      description: newService.description,
      duration: newService.duration_minutes,
      price: newService.price,
      bufferTime: newService.buffer_time_minutes,
      displayOrder: newService.display_order,
      isActive: newService.is_active,
      staffIds: Array.isArray(staff_ids) ? staff_ids : [],
    });
  } catch (err) {
    console.error("Create service error:", err);
    return error("Failed to create service", 500);
  }
}
