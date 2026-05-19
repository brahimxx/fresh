import { decodeId } from "@/lib/id";
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

function deriveOfferingTypeFromFlags(canPhysical, canMobile, canVirtual) {
  const p = !!canPhysical;
  const m = !!canMobile;
  const v = !!canVirtual;

  if (p && !m && !v) return "physical";
  if (!p && m && !v) return "mobile";
  if (!p && !m && v) return "virtual";
  return "hybrid";
}

function flagsFromPayload(payload) {
  // Accept both camelCase (canPhysical) and snake_case (can_physical)
  const rawPhysical = payload.canPhysical !== undefined ? payload.canPhysical : payload.can_physical;
  const rawMobile = payload.canMobile !== undefined ? payload.canMobile : payload.can_mobile;
  const rawVirtual = payload.canVirtual !== undefined ? payload.canVirtual : payload.can_virtual;

  if (rawPhysical !== undefined || rawMobile !== undefined || rawVirtual !== undefined) {
    return {
      canPhysical: rawPhysical !== undefined ? !!rawPhysical : true,
      canMobile: rawMobile !== undefined ? !!rawMobile : true,
      canVirtual: rawVirtual !== undefined ? !!rawVirtual : true,
    };
  }

  const type = payload.offeringType || "hybrid";
  return {
    canPhysical: type === "physical" || type === "hybrid",
    canMobile: type === "mobile" || type === "hybrid",
    canVirtual: type === "virtual" || type === "hybrid",
  };
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
        canPhysical: !!s.can_physical,
        canMobile: !!s.can_mobile,
        canVirtual: !!s.can_virtual,
        mobilePriceOverride: s.mobile_price_override ?? null,
        virtualPriceOverride: s.virtual_price_override ?? null,
        offeringType: deriveOfferingTypeFromFlags(
          s.can_physical,
          s.can_mobile,
          s.can_virtual,
        ),
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
      salon_id: rawSalonId,
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
      offeringType,
      canPhysical,
      canMobile,
      canVirtual,
      mobilePriceOverride,
      mobile_price_override,
      virtualPriceOverride,
      virtual_price_override,
    } = body;

    const flags = flagsFromPayload(body);

    if (!flags.canPhysical && !flags.canMobile && !flags.canVirtual) {
      return error("At least one fulfillment mode must be enabled", 400);
    }

    // Resolve price overrides (accept both camelCase and snake_case, empty/undefined → null)
    const finalMobilePriceOverride = mobilePriceOverride !== undefined
      ? mobilePriceOverride
      : mobile_price_override !== undefined
        ? mobile_price_override
        : null;
    const finalVirtualPriceOverride = virtualPriceOverride !== undefined
      ? virtualPriceOverride
      : virtual_price_override !== undefined
        ? virtual_price_override
        : null;

    const finalCategory = category_id !== undefined ? category_id : categoryId;
    const finalDuration = duration !== undefined ? duration : duration_minutes;
    let finalBuffer = buffer_time !== undefined ? buffer_time : bufferTime;
    if (
      finalBuffer === undefined &&
      (buffer_before !== undefined || buffer_after !== undefined)
    ) {
      finalBuffer = (Number(buffer_before) || 0) + (Number(buffer_after) || 0);
    }
    const finalDisplay =
      display_order !== undefined ? display_order : displayOrder;
    const finalStaff = staff_ids || staffIds;

    if (!rawSalonId) {
      return error("salon_id is required", 400);
    }

    const salon_id = decodeId(rawSalonId);

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
      `INSERT INTO services
       (salon_id, category_id, name, description, duration_minutes, price, buffer_time_minutes, display_order, is_active,
        can_physical, can_mobile, can_virtual, mobile_price_override, virtual_price_override)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
      [
        salon_id,
        finalCategory || null,
        name,
        description || null,
        finalDuration || 60,
        price || 0,
        finalBuffer || 0,
        finalDisplay || 0,
        flags.canPhysical ? 1 : 0,
        flags.canMobile ? 1 : 0,
        flags.canVirtual ? 1 : 0,
        finalMobilePriceOverride != null && finalMobilePriceOverride !== '' ? finalMobilePriceOverride : null,
        finalVirtualPriceOverride != null && finalVirtualPriceOverride !== '' ? finalVirtualPriceOverride : null,
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
      canPhysical: !!newService.can_physical,
      canMobile: !!newService.can_mobile,
      canVirtual: !!newService.can_virtual,
      offeringType: deriveOfferingTypeFromFlags(
        newService.can_physical,
        newService.can_mobile,
        newService.can_virtual,
      ),
      mobilePriceOverride: newService.mobile_price_override ?? null,
      virtualPriceOverride: newService.virtual_price_override ?? null,
      staffIds: Array.isArray(staff_ids) ? staff_ids : [],
    });
  } catch (err) {
    console.error("Create service error:", err);
    return error("Failed to create service", 500);
  }
}
