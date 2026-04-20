import { decodeId } from '@/lib/id';
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
    const rawSalonId = searchParams.get("salon_id");
    const salonId = rawSalonId ? decodeId(rawSalonId) : null;

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
      categoryId,
      name,
      description,
      duration,
      duration_minutes,
      price,
      buffer_time,
      bufferTime,
      buffer_before,
      buffer_after,
      display_order,
      displayOrder,
      staff_ids,
      staffIds,
    } = body;
    
    const finalCategory = category_id !== undefined ? category_id : categoryId;
    const finalDuration = duration !== undefined ? duration : duration_minutes;
    let finalBuffer = buffer_time !== undefined ? buffer_time : bufferTime;
    if (finalBuffer === undefined && (buffer_before !== undefined || buffer_after !== undefined)) {
       finalBuffer = (Number(buffer_before) || 0) + (Number(buffer_after) || 0);
    }
    const finalDisplay = display_order !== undefined ? display_order : displayOrder;
    const finalStaff = staff_ids || staffIds;

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
        finalCategory || null,
        name,
        description || null,
        finalDuration || 60,
        price || 0,
        finalBuffer || 0,
        finalDisplay || 0,
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
    if (Array.isArray(finalStaff) && finalStaff.length > 0) {
      // Verify every staff member belongs to the same salon
      const validStaff = await query(
        `SELECT id FROM staff WHERE salon_id = ? AND id IN (${finalStaff.map(() => "?").join(",")}) AND is_active = 1`,
        [salon_id, ...finalStaff],
      );
      if (validStaff.length !== finalStaff.length) {
        return error(
          "One or more staff members do not belong to this salon",
          400,
        );
      }
      const values = finalStaff.map((sid) => [result.insertId, sid]);
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
