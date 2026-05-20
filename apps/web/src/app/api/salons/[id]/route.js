import { decodeId } from "@/lib/id";
import { query, getOne } from "@/lib/db";
import { getSession, requireAuth } from "@/lib/auth";
import { geocodeAddress } from "@/lib/geo";
import {
  success,
  error,
  unauthorized,
  notFound,
  forbidden,
} from "@/lib/response";

export const dynamic = "force-dynamic";

// Helper to check if user owns the salon
async function checkSalonOwnership(salonId, userId, role) {
  if (role === "admin") return true;
  const salon = await getOne(
    "SELECT owner_id FROM salons WHERE id = ? AND deleted_at IS NULL",
    [salonId],
  );
  return salon && salon.owner_id === userId;
}

// GET /api/salons/[id] - Get salon details
export async function GET(request, { params }) {
  try {
    const { id: rawId } = await params;
    const id = decodeId(rawId);

    const salon = await getOne(
      `SELECT s.*, 
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(DISTINCT r.id) as review_count
       FROM salons s
       LEFT JOIN reviews r ON r.salon_id = s.id
       WHERE s.id = ? AND s.deleted_at IS NULL
       GROUP BY s.id`,
      [id],
    );

    if (!salon) {
      return notFound("Salon not found");
    }

    // Get salon settings
    const settings = await getOne(
      "SELECT * FROM salon_settings WHERE salon_id = ?",
      [id],
    );

    // Get salon photos
    const photos = await query(
      "SELECT id, image_url, is_cover FROM salon_photos WHERE salon_id = ?",
      [id],
    );

    // Get services grouped by category
    const categories = await query(
      `SELECT sc.id, sc.name,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', s.id,
                  'name', s.name,
                  'duration', s.duration_minutes,
                  'price', s.price,
                  'isActive', s.is_active
                )
              ) as services
       FROM service_categories sc
       LEFT JOIN services s ON s.category_id = sc.id AND s.is_active = 1
       WHERE sc.salon_id = ?
       GROUP BY sc.id`,
      [id],
    );

    // Get staff (include user_id and permissions for frontend role derivation)
    const staff = await query(
      `SELECT st.id, st.user_id, st.role, st.is_active, st.permissions, u.first_name, u.last_name
       FROM staff st
       JOIN users u ON u.id = st.user_id
       WHERE st.salon_id = ? AND st.is_active = 1`,
      [id],
    );

    // Get business hours
    const dbHours = await query(
      "SELECT day_of_week, open_time, close_time, is_closed FROM business_hours WHERE salon_id = ? ORDER BY day_of_week",
      [id],
    );

    // Get salon categories
    const salonCategories = await query(
      "SELECT category_name as name, is_primary FROM salon_categories WHERE salon_id = ? ORDER BY is_primary DESC, category_name ASC",
      [id],
    );

    const DAYS = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const business_hours =
      dbHours.length > 0
        ? dbHours.map((h) => ({
            day: h.day_of_week,
            name: DAYS[h.day_of_week],
            enabled: !h.is_closed,
            open: h.open_time ? h.open_time.slice(0, 5) : "09:00",
            close: h.close_time ? h.close_time.slice(0, 5) : "17:00",
          }))
        : undefined;

    // Fetch covered zip codes from normalized table
    const coveredZipRows = await query(
      "SELECT zip_code FROM salon_covered_zip_codes WHERE salon_id = ?",
      [id],
    );
    const coveredZipCodes = coveredZipRows.length > 0
      ? coveredZipRows.map(r => r.zip_code).join(',')
      : null;

    return success({
      id: salon.id,
      ownerId: salon.owner_id,
      name: salon.name,
      description: salon.description,
      phone: salon.phone,
      email: salon.email,
      address: salon.address,
      city: salon.city,
      country: salon.country,
      state: salon.state,
      zip_code: salon.zip_code,
      website: salon.website,
      latitude: salon.latitude,
      longitude: salon.longitude,
      isMarketplaceEnabled: salon.is_marketplace_enabled,
      currency: salon.currency,
      is_physical: salon.is_physical,
      is_mobile: salon.is_mobile,
      is_virtual: salon.is_virtual,
      mobile_base_address: salon.mobile_base_address,
      travel_radius: salon.travel_radius,
      travel_fee_type: salon.travel_fee_type,
      travel_fee_amount: salon.travel_fee_amount,
      min_booking_amount: salon.min_booking_amount,
      travel_buffer_time: salon.travel_buffer_time,
      covered_zip_codes: coveredZipCodes,
      virtual_meeting_link: salon.virtual_meeting_link,
      avgRating: parseFloat(salon.avg_rating).toFixed(1),
      reviewCount: salon.review_count,
      createdAt: salon.created_at,
      salonCategories: salonCategories.map((c) => ({
        name: c.name,
        isPrimary: c.is_primary === 1,
      })),
      business_hours,
      settings: settings
        ? {
            cancellationPolicyHours: settings.cancellation_policy_hours,
            noShowFee: settings.no_show_fee,
            depositRequired: settings.deposit_required,
            depositPercentage: settings.deposit_percentage,
          }
        : null,
      photos: photos.map((p) => ({
        id: p.id,
        imageUrl: p.image_url,
        isCover: p.is_cover,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        services: (typeof c.services === "string"
          ? JSON.parse(c.services)
          : c.services || []
        ).filter((s) => s.id !== null),
      })),
      staff: staff.map((s) => ({
        id: s.id,
        userId: s.user_id,
        firstName: s.first_name,
        lastName: s.last_name,
        role: s.role,
        isActive: s.is_active,
        permissions: s.permissions
          ? typeof s.permissions === "string"
            ? JSON.parse(s.permissions)
            : s.permissions
          : null,
      })),
    });
  } catch (err) {
    console.error("Get salon error:", err);
    return error("Failed to get salon", 500);
  }
}

// PUT /api/salons/[id] - Update salon
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const id = decodeId(rawId);

    const isOwner = await checkSalonOwnership(id, session.userId, session.role);
    if (!isOwner) {
      return forbidden("Not authorized to update this salon");
    }

    const body = await request.json();
    const {
      name,
      description,
      phone,
      email,
      address,
      city,
      country,
      latitude,
      longitude,
      isMarketplaceEnabled,
      currency,
      salonCategories,
      is_physical,
      is_mobile,
      is_virtual,
      mobile_base_address,
      travel_radius,
      travel_fee_type,
      travel_fee_amount,
      min_booking_amount,
      travel_buffer_time,
      virtual_meeting_link,
      covered_zip_codes,
    } = body;

    var resolvedLatitude = latitude;
    var resolvedLongitude = longitude;
    var mobileEnabled =
      is_mobile === true ||
      is_mobile === 1 ||
      is_mobile === "1" ||
      is_mobile === "true";
    var hasIncomingCoordinates =
      latitude !== undefined &&
      latitude !== null &&
      longitude !== undefined &&
      longitude !== null;

    if (mobileEnabled && !hasIncomingCoordinates) {
      var centerAddress = (mobile_base_address || "").trim();
      if (!centerAddress) {
        centerAddress = [address, city, country].filter(Boolean).join(", ");
      }

      if (centerAddress) {
        try {
          var coords = await geocodeAddress(centerAddress);
          if (coords) {
            resolvedLatitude = coords.lat;
            resolvedLongitude = coords.lng;
          }
        } catch (geoErr) {
          console.error(
            "[SALON SETTINGS] Failed to geocode mobile center:",
            geoErr,
          );
        }
      }
    }

    // Virtual fulfillment requires a meeting link
    var virtualEnabled = is_virtual === true || is_virtual === 1 || is_virtual === "1" || is_virtual === "true";
    var virtualLinkBeingCleared = virtual_meeting_link !== undefined && !virtual_meeting_link?.trim();
    
    if (virtualEnabled && !virtual_meeting_link?.trim()) {
      // Enabling virtual — check if a link is already stored
      const existingSalon = await getOne("SELECT virtual_meeting_link FROM salons WHERE id = ?", [id]);
      if (!existingSalon?.virtual_meeting_link?.trim()) {
        return error("A virtual meeting link is required to enable virtual services. Please provide a link (e.g. Google Meet, Zoom).", 400);
      }
    } else if (virtualLinkBeingCleared && is_virtual === undefined) {
      // Clearing the link without disabling virtual — check if virtual is currently active
      const existingSalon = await getOne("SELECT is_virtual FROM salons WHERE id = ?", [id]);
      if (existingSalon?.is_virtual) {
        return error("Cannot remove the meeting link while virtual services are enabled. Disable virtual mode first, or provide a new link.", 400);
      }
    }

    await query(
      `UPDATE salons SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        country = COALESCE(?, country),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        is_marketplace_enabled = COALESCE(?, is_marketplace_enabled),
        currency = COALESCE(?, currency),
        is_physical = COALESCE(?, is_physical),
        is_mobile = COALESCE(?, is_mobile),
        is_virtual = COALESCE(?, is_virtual),
        mobile_base_address = COALESCE(?, mobile_base_address),
        travel_radius = COALESCE(?, travel_radius),
        travel_fee_type = COALESCE(?, travel_fee_type),
        travel_fee_amount = COALESCE(?, travel_fee_amount),
        min_booking_amount = COALESCE(?, min_booking_amount),
          travel_buffer_time = COALESCE(?, travel_buffer_time),
        virtual_meeting_link = COALESCE(?, virtual_meeting_link)
       WHERE id = ?`,
      [
        name,
        description,
        phone,
        email,
        address,
        city,
        country,
        resolvedLatitude,
        resolvedLongitude,
        isMarketplaceEnabled,
        currency,
        is_physical !== undefined ? (is_physical ? 1 : 0) : null,
        is_mobile !== undefined ? (is_mobile ? 1 : 0) : null,
        is_virtual !== undefined ? (is_virtual ? 1 : 0) : null,
        mobile_base_address,
        travel_radius,
        travel_fee_type === "" ? "none" : travel_fee_type,
        travel_fee_amount === "" ? null : travel_fee_amount,
        min_booking_amount,
        travel_buffer_time,
        virtual_meeting_link,
        id,
      ],
    );

    // Sync covered zip codes to normalized table if provided
    if (covered_zip_codes !== undefined) {
      await query("DELETE FROM salon_covered_zip_codes WHERE salon_id = ?", [id]);
      if (covered_zip_codes && covered_zip_codes.trim()) {
        const zips = covered_zip_codes.split(',').map(z => z.trim()).filter(Boolean);
        if (zips.length > 0) {
          const values = zips.map(zip => [id, zip]);
          await query(
            "INSERT IGNORE INTO salon_covered_zip_codes (salon_id, zip_code) VALUES ?",
            [values],
          );
        }
      }
    }

    // ── Cascade fulfillment mode changes to services ────────────────────────
    //
    // When a fulfillment mode is disabled at the salon level, strip that flag
    // from all services. Services that become flag-less (were only that mode)
    // get flipped to can_physical=1 so they remain bookable.
    // Same logic applies to both virtual and mobile.

    var virtualDisabled = is_virtual !== undefined && !virtualEnabled;
    var mobileDisabled = is_mobile !== undefined && !(is_mobile === true || is_mobile === 1 || is_mobile === "1" || is_mobile === "true");
    var cascadeInfo = {};

    if (virtualDisabled) {
      // Count affected services before updating
      const virtualOnlyServices = await query(
        `SELECT COUNT(*) as count FROM services WHERE salon_id = ? AND can_virtual = 1 AND can_physical = 0 AND can_mobile = 0 AND deleted_at IS NULL`,
        [id]
      );
      const virtualMixedServices = await query(
        `SELECT COUNT(*) as count FROM services WHERE salon_id = ? AND can_virtual = 1 AND (can_physical = 1 OR can_mobile = 1) AND deleted_at IS NULL`,
        [id]
      );

      // Services that are virtual-only → flip to physical
      await query(
        `UPDATE services SET can_physical = 1, can_virtual = 0, virtual_price_override = NULL
         WHERE salon_id = ? AND can_virtual = 1 AND can_physical = 0 AND can_mobile = 0 AND deleted_at IS NULL`,
        [id]
      );
      // Services that have virtual + other modes → just strip virtual
      await query(
        `UPDATE services SET can_virtual = 0, virtual_price_override = NULL
         WHERE salon_id = ? AND can_virtual = 1 AND deleted_at IS NULL`,
        [id]
      );

      var totalVirtualAffected = (virtualOnlyServices[0]?.count || 0) + (virtualMixedServices[0]?.count || 0);
      if (totalVirtualAffected > 0) {
        cascadeInfo.virtualServicesAffected = totalVirtualAffected;
        cascadeInfo.virtualOnlyConverted = virtualOnlyServices[0]?.count || 0;
      }
    }

    if (mobileDisabled) {
      // Count affected services before updating
      const mobileOnlyServices = await query(
        `SELECT COUNT(*) as count FROM services WHERE salon_id = ? AND can_mobile = 1 AND can_physical = 0 AND can_virtual = 0 AND deleted_at IS NULL`,
        [id]
      );
      const mobileMixedServices = await query(
        `SELECT COUNT(*) as count FROM services WHERE salon_id = ? AND can_mobile = 1 AND (can_physical = 1 OR can_virtual = 1) AND deleted_at IS NULL`,
        [id]
      );

      // Services that are mobile-only → flip to physical
      await query(
        `UPDATE services SET can_physical = 1, can_mobile = 0, mobile_price_override = NULL
         WHERE salon_id = ? AND can_mobile = 1 AND can_physical = 0 AND can_virtual = 0 AND deleted_at IS NULL`,
        [id]
      );
      // Services that have mobile + other modes → just strip mobile
      await query(
        `UPDATE services SET can_mobile = 0, mobile_price_override = NULL
         WHERE salon_id = ? AND can_mobile = 1 AND deleted_at IS NULL`,
        [id]
      );

      var totalMobileAffected = (mobileOnlyServices[0]?.count || 0) + (mobileMixedServices[0]?.count || 0);
      if (totalMobileAffected > 0) {
        cascadeInfo.mobileServicesAffected = totalMobileAffected;
        cascadeInfo.mobileOnlyConverted = mobileOnlyServices[0]?.count || 0;
      }
    }

    // If salonCategories is provided, update them
    if (Array.isArray(salonCategories)) {
      // Delete existing categories
      await query("DELETE FROM salon_categories WHERE salon_id = ?", [id]);

      // Insert new categories (up to 4)
      const categoriesToInsert = salonCategories.slice(0, 4);
      for (let i = 0; i < categoriesToInsert.length; i++) {
        const cat = categoriesToInsert[i];
        // The first item (index 0) or the one marked isPrimary gets is_primary = 1
        const isPrimary = i === 0 || cat.isPrimary ? 1 : 0;
        await query(
          "INSERT INTO salon_categories (salon_id, category_name, is_primary) VALUES (?, ?, ?)",
          [id, cat.name || cat, isPrimary],
        );
      }
    }

    const salon = await getOne("SELECT * FROM salons WHERE id = ?", [id]);

    const updatedCategories = await query(
      "SELECT category_name as name, is_primary FROM salon_categories WHERE salon_id = ? ORDER BY is_primary DESC, category_name ASC",
      [id],
    );

    const updatedZipRows = await query(
      "SELECT zip_code FROM salon_covered_zip_codes WHERE salon_id = ?",
      [id],
    );
    const updatedZipCodes = updatedZipRows.length > 0
      ? updatedZipRows.map(r => r.zip_code).join(',')
      : null;

    return success({
      id: salon.id,
      name: salon.name,
      description: salon.description,
      phone: salon.phone,
      email: salon.email,
      address: salon.address,
      city: salon.city,
      state: salon.state,
      zip_code: salon.zip_code,
      country: salon.country,
      website: salon.website,
      latitude: salon.latitude,
      longitude: salon.longitude,
      isMarketplaceEnabled: salon.is_marketplace_enabled,
      currency: salon.currency,
      is_physical: salon.is_physical,
      is_mobile: salon.is_mobile,
      is_virtual: salon.is_virtual,
      mobile_base_address: salon.mobile_base_address,
      travel_radius: salon.travel_radius,
      travel_fee_type: salon.travel_fee_type,
      travel_fee_amount: salon.travel_fee_amount,
      min_booking_amount: salon.min_booking_amount,
      travel_buffer_time: salon.travel_buffer_time,
      covered_zip_codes: updatedZipCodes,
      virtual_meeting_link: salon.virtual_meeting_link,
      salonCategories: updatedCategories.map((c) => ({
        name: c.name,
        isPrimary: c.is_primary === 1,
      })),
      ...(Object.keys(cascadeInfo).length > 0 ? { cascadeInfo } : {}),
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Update salon error:", err);
    return error("Failed to update salon", 500);
  }
}

// DELETE /api/salons/[id] - Soft delete salon
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const id = decodeId(rawId);
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const isOwner = await checkSalonOwnership(id, session.userId, session.role);
    if (!isOwner) {
      return forbidden("Not authorized to delete this salon");
    }

    // Check if salon exists and is not already deleted
    const salon = await getOne(
      "SELECT id, name, deleted_at FROM salons WHERE id = ?",
      [id],
    );
    if (!salon) {
      return notFound("Salon not found");
    }
    if (salon.deleted_at) {
      return error("Salon is already deleted", 400);
    }

    // Pre-deletion checks (unless force=true)
    if (!force) {
      // Check for pending or confirmed future bookings
      const pendingBookings = await query(
        `SELECT id, start_datetime, status 
         FROM bookings 
         WHERE salon_id = ? 
           AND status IN ('pending', 'confirmed') 
           AND start_datetime > NOW()
           AND deleted_at IS NULL
         LIMIT 5`,
        [id],
      );

      // Check for active gift cards with balance
      const activeGiftCards = await query(
        `SELECT id, code, remaining_balance 
         FROM gift_cards 
         WHERE salon_id = ? 
           AND remaining_balance > 0 
           AND (expires_at IS NULL OR expires_at > NOW())
           AND status = 'active'
         LIMIT 5`,
        [id],
      );

      // Check for active packages with remaining uses
      const activePackages = await query(
        `SELECT cp.id, p.name, cp.remaining_uses 
         FROM client_packages cp
         JOIN packages p ON p.id = cp.package_id
         WHERE cp.salon_id = ? 
           AND cp.remaining_uses > 0
           AND cp.status = 'active'
           AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
         LIMIT 5`,
        [id],
      );

      const blockers = [];
      if (pendingBookings.length > 0) {
        blockers.push({
          type: "bookings",
          count: pendingBookings.length,
          message: `${pendingBookings.length} pending/confirmed future booking(s)`,
          items: pendingBookings.map((b) => ({
            id: b.id,
            datetime: b.start_datetime,
            status: b.status,
          })),
        });
      }
      if (activeGiftCards.length > 0) {
        blockers.push({
          type: "giftCards",
          count: activeGiftCards.length,
          message: `${activeGiftCards.length} active gift card(s) with balance`,
          items: activeGiftCards.map((g) => ({
            id: g.id,
            code: g.code,
            balance: g.remaining_balance,
          })),
        });
      }
      if (activePackages.length > 0) {
        blockers.push({
          type: "packages",
          count: activePackages.length,
          message: `${activePackages.length} active package(s) with remaining uses`,
          items: activePackages.map((p) => ({
            id: p.id,
            name: p.name,
            remaining: p.remaining_uses,
          })),
        });
      }

      if (blockers.length > 0) {
        return error(
          "Cannot delete salon. Please resolve the following issues first or use force=true to proceed anyway.",
          409,
          { blockers },
        );
      }
    }

    // Soft delete: set deleted_at timestamp
    await query(
      `UPDATE salons SET 
         deleted_at = NOW(), 
         deleted_by = ?,
         is_active = 0,
         is_marketplace_enabled = 0,
         status = 'deleted'
       WHERE id = ?`,
      [session.userId, id],
    );

    // Deactivate all staff members for this salon
    await query("UPDATE staff SET is_active = 0 WHERE salon_id = ?", [id]);

    // Revoke all pending team invitations
    await query(
      "UPDATE staff_invitations SET status = 'revoked' WHERE salon_id = ? AND status = 'pending'",
      [id],
    );

    // Cancel all pending future bookings
    await query(
      `UPDATE bookings SET 
         status = 'cancelled',
         cancelled_at = NOW(),
         cancelled_by = ?,
         cancellation_reason = 'Salon deleted'
       WHERE salon_id = ? 
         AND status IN ('pending', 'confirmed')
         AND start_datetime > NOW()`,
      [session.userId, id],
    );

    // If this was the owner's last active salon, downgrade their role back to client
    const otherSalons = await query(
      "SELECT id FROM salons WHERE owner_id = ? AND id != ? AND deleted_at IS NULL",
      [session.userId, id],
    );

    if (otherSalons.length === 0) {
      await query(
        "UPDATE users SET role = 'client' WHERE id = ? AND role = 'owner'",
        [session.userId],
      );
    }

    return success({
      message: "Salon deleted successfully",
      deletedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Delete salon error:", err);
    return error("Failed to delete salon", 500);
  }
}
