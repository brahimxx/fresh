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
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1",
    [service.salon_id, userId],
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

  if (payload.offeringType === undefined) return null;
  const type = payload.offeringType || "hybrid";
  return {
    canPhysical: type === "physical" || type === "hybrid",
    canMobile: type === "mobile" || type === "hybrid",
    canVirtual: type === "virtual" || type === "hybrid",
  };
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
      description: service.description,
      duration: service.duration_minutes,
      bufferTime: service.buffer_time_minutes,
      price: service.price,
      isActive: service.is_active,
      isPopular: service.is_popular,
      canPhysical: !!service.can_physical,
      canMobile: !!service.can_mobile,
      canVirtual: !!service.can_virtual,
      offeringType: deriveOfferingTypeFromFlags(
        service.can_physical,
        service.can_mobile,
        service.can_virtual,
      ),
      mobilePriceOverride: service.mobile_price_override ?? null,
      virtualPriceOverride: service.virtual_price_override ?? null,
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
    const {
      name,
      categoryId,
      category_id,
      duration,
      duration_minutes,
      price,
      isActive,
      is_active,
      staffIds,
      staff_ids,
      description,
      bufferTime,
      buffer_time,
      buffer_before,
      buffer_after,
      isPopular,
      offeringType,
      canPhysical,
      canMobile,
      canVirtual,
      displayOrder,
      mobilePriceOverride,
      virtualPriceOverride,
    } = body;

    const flags = flagsFromPayload({
      offeringType,
      canPhysical,
      canMobile,
      canVirtual,
    });

    if (
      flags !== null &&
      !flags.canPhysical &&
      !flags.canMobile &&
      !flags.canVirtual
    ) {
      return error("At least one fulfillment mode must be enabled", 400);
    }

    // Normalize payload
    const finalCategory = categoryId !== undefined ? categoryId : category_id;
    const finalDuration = duration !== undefined ? duration : duration_minutes;
    const finalActive = isActive !== undefined ? isActive : is_active;
    const finalStaff = staffIds || staff_ids;
    // Calculate buffer
    let finalBuffer = bufferTime !== undefined ? bufferTime : buffer_time;
    if (
      finalBuffer === undefined &&
      (buffer_before !== undefined || buffer_after !== undefined)
    ) {
      finalBuffer = (Number(buffer_before) || 0) + (Number(buffer_after) || 0);
    }

    if (duration !== undefined && duration !== null && Number(duration) <= 0) {
      return error("Duration must be greater than 0", 400);
    }

    if (price !== undefined && price !== null && Number(price) < 0) {
      return error("Price cannot be negative", 400);
    }

    // Prepare dynamic update array
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (finalCategory !== undefined) {
      updates.push("category_id = ?");
      values.push(finalCategory || null);
    }
    if (finalDuration !== undefined) {
      updates.push("duration_minutes = ?");
      values.push(finalDuration);
    }
    if (price !== undefined) {
      updates.push("price = ?");
      values.push(price);
    }
    if (finalActive !== undefined) {
      updates.push("is_active = ?");
      values.push(finalActive);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (finalBuffer !== undefined) {
      updates.push("buffer_time_minutes = ?");
      values.push(finalBuffer);
    }
    if (isPopular !== undefined) {
      updates.push("is_popular = ?");
      values.push(isPopular);
    }
    if (flags !== null) {
      updates.push("can_physical = ?");
      values.push(flags.canPhysical ? 1 : 0);
      updates.push("can_mobile = ?");
      values.push(flags.canMobile ? 1 : 0);
      updates.push("can_virtual = ?");
      values.push(flags.canVirtual ? 1 : 0);
    }
    if (displayOrder !== undefined) {
      updates.push("display_order = ?");
      values.push(displayOrder);
    }
    // Price overrides for hybrid fulfillment
    if (mobilePriceOverride !== undefined) {
      updates.push("mobile_price_override = ?");
      values.push(mobilePriceOverride);
    }
    if (virtualPriceOverride !== undefined) {
      updates.push("virtual_price_override = ?");
      values.push(virtualPriceOverride);
    }

    if (updates.length > 0) {
      values.push(serviceId);
      await query(
        `UPDATE services SET ${updates.join(", ")} WHERE id = ?`,
        values,
      );
    }

    // Update staff assignments if provided
    if (finalStaff !== undefined) {
      const staffIds = finalStaff;
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
      canPhysical: !!service.can_physical,
      canMobile: !!service.can_mobile,
      canVirtual: !!service.can_virtual,
      offeringType: deriveOfferingTypeFromFlags(
        service.can_physical,
        service.can_mobile,
        service.can_virtual,
      ),
      mobilePriceOverride: service.mobile_price_override ?? null,
      virtualPriceOverride: service.virtual_price_override ?? null,
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
    await query(
      "UPDATE services SET deleted_at = NOW(), is_active = 0 WHERE id = ? AND deleted_at IS NULL",
      [serviceId],
    );

    return success({ message: "Service deleted successfully" });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Delete service error:", err);
    return error("Failed to delete service", 500);
  }
}
