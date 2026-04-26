import { decodeId } from "@/lib/id";
import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  success,
  error,
  created,
  unauthorized,
  forbidden,
} from "@/lib/response";

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === "admin") return true;
  const salon = await getOne("SELECT owner_id FROM salons WHERE id = ?", [
    salonId,
  ]);
  if (salon && salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1",
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
  if (
    payload.canPhysical !== undefined ||
    payload.canMobile !== undefined ||
    payload.canVirtual !== undefined
  ) {
    return {
      canPhysical:
        payload.canPhysical !== undefined ? !!payload.canPhysical : true,
      canMobile: payload.canMobile !== undefined ? !!payload.canMobile : true,
      canVirtual:
        payload.canVirtual !== undefined ? !!payload.canVirtual : true,
    };
  }

  const type = payload.offeringType || "hybrid";
  return {
    canPhysical: type === "physical" || type === "hybrid",
    canMobile: type === "mobile" || type === "hybrid",
    canVirtual: type === "virtual" || type === "hybrid",
  };
}

// GET /api/salons/[id]/services - Get salon services with categories
export async function GET(request, { params }) {
  try {
    const { id: rawId } = await params;
    const id = decodeId(rawId);
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Get categories
    const categories = await query(
      "SELECT id, name, display_order FROM service_categories WHERE salon_id = ? ORDER BY display_order ASC, name ASC",
      [id],
    );

    // Get services for each category
    let serviceSql = `
      SELECT s.*, GROUP_CONCAT(ss.staff_id) as staff_ids
      FROM services s
      LEFT JOIN service_staff ss ON ss.service_id = s.id
      WHERE s.salon_id = ? AND s.deleted_at IS NULL
    `;
    const serviceParams = [id];

    if (!includeInactive) {
      serviceSql += " AND s.is_active = 1";
    }

    serviceSql += " GROUP BY s.id ORDER BY s.display_order ASC, s.name ASC";

    const services = await query(serviceSql, serviceParams);

    const mapService = (s) => ({
      id: s.id,
      categoryId: s.category_id,
      name: s.name,
      description: s.description || "",
      duration: s.duration_minutes,
      durationMinutes: s.duration_minutes,
      price: s.price,
      bufferTime: s.buffer_time_minutes || 0,
      bufferTimeMinutes: s.buffer_time_minutes || 0,
      isActive: s.is_active,
      isPopular: s.is_popular,
      canPhysical: !!s.can_physical,
      canMobile: !!s.can_mobile,
      canVirtual: !!s.can_virtual,
      offeringType: deriveOfferingTypeFromFlags(
        s.can_physical,
        s.can_mobile,
        s.can_virtual,
      ),
      mobilePriceOverride: s.mobile_price_override ?? null,
      virtualPriceOverride: s.virtual_price_override ?? null,
      displayOrder: s.display_order || 0,
      staffIds: s.staff_ids ? s.staff_ids.split(",").map(Number) : [],
    });

    const categorizedServices = categories.map((category) => ({
      id: category.id,
      name: category.name,
      services: services
        .filter((s) => s.category_id === category.id)
        .map(mapService),
    }));

    // Include uncategorized services
    const uncategorized = services.filter((s) => !s.category_id);
    if (uncategorized.length > 0) {
      categorizedServices.push({
        id: null,
        name: "Uncategorized",
        services: uncategorized.map(mapService),
      });
    }

    return success({ categories: categorizedServices });
  } catch (err) {
    console.error("Get services error:", err);
    return error("Failed to get services", 500);
  }
}

// POST /api/salons/[id]/services - Create a new service
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const id = decodeId(rawId);

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden("Not authorized to create services");
    }

    const body = await request.json();
    const {
      name,
      categoryId,
      duration,
      price,
      isActive = true,
      staffIds = [],
      description = null,
      bufferTime = 0,
      isPopular = false,
      offeringType,
      canPhysical,
      canMobile,
      canVirtual,
      mobilePriceOverride = null,
      virtualPriceOverride = null,
    } = body;

    const flags = flagsFromPayload({
      offeringType,
      canPhysical,
      canMobile,
      canVirtual,
    });

    if (!flags.canPhysical && !flags.canMobile && !flags.canVirtual) {
      return error("At least one fulfillment mode must be enabled", 400);
    }

    if (!name || !duration || price === undefined) {
      return error("Name, duration, and price are required");
    }

    const result = await query(
      `INSERT INTO services
         (salon_id, category_id, name, duration_minutes, price, is_active,
          description, buffer_time_minutes, is_popular,
          can_physical, can_mobile, can_virtual,
          mobile_price_override, virtual_price_override)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        categoryId || null,
        name,
        duration,
        price,
        isActive,
        description,
        bufferTime,
        isPopular,
        flags.canPhysical ? 1 : 0,
        flags.canMobile ? 1 : 0,
        flags.canVirtual ? 1 : 0,
        mobilePriceOverride !== undefined ? mobilePriceOverride : null,
        virtualPriceOverride !== undefined ? virtualPriceOverride : null,
      ],
    );

    // Assign staff to this service
    for (const staffId of staffIds) {
      await query(
        "INSERT INTO service_staff (service_id, staff_id) VALUES (?, ?)",
        [result.insertId, staffId],
      );
    }

    return created({
      id: result.insertId,
      name,
      categoryId,
      duration,
      price,
      isActive,
      staffIds,
      canPhysical: flags.canPhysical,
      canMobile: flags.canMobile,
      canVirtual: flags.canVirtual,
      offeringType: deriveOfferingTypeFromFlags(
        flags.canPhysical,
        flags.canMobile,
        flags.canVirtual,
      ),
      mobilePriceOverride,
      virtualPriceOverride,
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Create service error:", err);
    return error("Failed to create service", 500);
  }
}
