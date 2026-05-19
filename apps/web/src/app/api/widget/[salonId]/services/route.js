import { decodeId } from "@/lib/id";
import { query, getOne } from "@/lib/db";
import { success, error, notFound } from "@/lib/response";
import {
  geocodeAddress,
  haversineDistanceKm,
  isValidCoordinatePair,
} from "@/lib/geo";

// GET /api/widget/[salonId]/services - Get services for booking widget
export async function GET(request, { params }) {
  try {
    const { salonId: rawSalonId } = await params;
    const salonId = decodeId(rawSalonId);
    const { searchParams } = new URL(request.url);
    const fulfillmentType = searchParams.get("fulfillmentType");
    const userLat = Number(searchParams.get("userLat"));
    const userLng = Number(searchParams.get("userLng"));

    let mobileFilter = {
      requiresLocation: false,
      outOfRange: false,
      distanceKm: null,
      maxRadiusKm: null,
      reason: null,
    };

    if (fulfillmentType === "mobile") {
      if (!isValidCoordinatePair(userLat, userLng)) {
        mobileFilter.requiresLocation = true;
        mobileFilter.reason = "LOCATION_REQUIRED";
      } else {
        const salon = await getOne(
          "SELECT is_mobile, travel_radius, latitude, longitude, mobile_base_address, address, city, country FROM salons WHERE id = ? AND is_active = 1",
          [salonId],
        );

        if (!salon) {
          return notFound("Salon not found");
        }

        if (!salon.is_mobile) {
          mobileFilter.reason = "SALON_NOT_MOBILE";
        } else {
          const radiusKm = Number(salon.travel_radius || 0);
          mobileFilter.maxRadiusKm = Number.isFinite(radiusKm) ? radiusKm : 0;

          if (radiusKm > 0) {
            let centerLat = Number(salon.latitude);
            let centerLng = Number(salon.longitude);

            if (!isValidCoordinatePair(centerLat, centerLng)) {
              let centerAddress = (salon.mobile_base_address || "").trim();
              if (!centerAddress) {
                centerAddress = [salon.address, salon.city, salon.country]
                  .filter(Boolean)
                  .join(", ");
              }

              if (centerAddress) {
                try {
                  const coords = await geocodeAddress(centerAddress);
                  if (coords) {
                    centerLat = Number(coords.lat);
                    centerLng = Number(coords.lng);
                  }
                } catch (geoErr) {
                  console.error(
                    "[WIDGET SERVICES] Center geocoding failed",
                    geoErr,
                  );
                }
              }
            }

            if (isValidCoordinatePair(centerLat, centerLng)) {
              const distanceKm = haversineDistanceKm(
                centerLat,
                centerLng,
                userLat,
                userLng,
              );
              mobileFilter.distanceKm = Number(distanceKm.toFixed(2));
              if (distanceKm > radiusKm) {
                mobileFilter.outOfRange = true;
                mobileFilter.reason = "OUTSIDE_SERVICE_RADIUS";
              }
            } else {
              // Fail closed for mobile list if salon center cannot be validated.
              mobileFilter.reason = "MOBILE_CENTER_NOT_CONFIGURED";
            }
          }
        }
      }
    }

    // Get categories
    const categories = await query(
      `SELECT id, name, display_order
       FROM service_categories 
       WHERE salon_id = ? 
       ORDER BY display_order, name`,
      [salonId],
    );

    let serviceFulfillmentFilter = "";
    if (fulfillmentType === "mobile") {
      serviceFulfillmentFilter = "AND s.can_mobile = 1";
    } else if (fulfillmentType === "virtual") {
      serviceFulfillmentFilter = "AND s.can_virtual = 1";
    } else if (fulfillmentType === "physical") {
      serviceFulfillmentFilter = "AND s.can_physical = 1";
    }

    let staffCapabilityFilter = "";
    if (fulfillmentType === "mobile") {
      staffCapabilityFilter = "AND st.can_mobile = 1";
    } else if (fulfillmentType === "virtual") {
      staffCapabilityFilter = "AND st.can_virtual = 1";
    } else if (fulfillmentType === "physical") {
      staffCapabilityFilter = "AND st.can_physical = 1";
    }

    // We no longer early return here. We return the full list and let the frontend disable items.

    // Get active services that have at least one compatible staff member assigned
    const services = await query(
      `SELECT 
        s.id, s.name, s.description, s.duration_minutes as duration,
        s.price, s.mobile_price_override, s.virtual_price_override,
        s.category_id, sc.name as category_name,
        s.can_physical, s.can_mobile, s.can_virtual
       FROM services s
       LEFT JOIN service_categories sc ON sc.id = s.category_id
       INNER JOIN service_staff ss ON ss.service_id = s.id
       INNER JOIN staff st ON st.id = ss.staff_id
         AND st.is_active = 1 AND st.is_visible = 1 AND st.salon_id = s.salon_id
       WHERE s.salon_id = ? AND s.is_active = 1 AND s.deleted_at IS NULL
       GROUP BY s.id
       ORDER BY sc.display_order, s.name`,
      [salonId],
    );

    // Get available staff for each service
    const servicesWithStaff = await Promise.all(
      services.map(async (service) => {
        let isCompatible = true;
        if (fulfillmentType === "mobile") isCompatible = !!service.can_mobile;
        else if (fulfillmentType === "virtual") isCompatible = !!service.can_virtual;
        else if (fulfillmentType === "physical") isCompatible = !!service.can_physical;
        else isCompatible = true;

        let isReachable = true;
        if (fulfillmentType === "mobile") {
          if (mobileFilter.requiresLocation || mobileFilter.reason === "LOCATION_REQUIRED") {
            isReachable = null;
          } else if (mobileFilter.outOfRange || mobileFilter.reason) {
            isReachable = false;
          }
        }

        let staff = [];
        
        if (isCompatible) {
          staff = await query(
            `SELECT 
              st.id, st.first_name, st.last_name, st.title, st.avatar_url, st.color
             FROM staff st
             INNER JOIN service_staff ss ON ss.staff_id = st.id
             WHERE ss.service_id = ?
               AND st.salon_id = ?
               AND st.is_active = 1
               AND st.is_visible = 1
               ${staffCapabilityFilter}
             ORDER BY st.first_name`,
            [service.id, salonId],
          );
        }

        let hasAvailableStaff = staff.length > 0;
        if (fulfillmentType === "mobile" && isReachable === null) {
          hasAvailableStaff = null;
        }

        return {
          ...service,
          isCompatible,
          isReachable,
          hasAvailableStaff,
          availableStaff: staff.map((s) => ({
            id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            firstName: s.first_name,
            lastName: s.last_name,
            title: s.title,
            avatarUrl: s.avatar_url,
            color: s.color,
          })),
        };
      }),
    );

    return success({
      categories: categories,
      services: servicesWithStaff,
      mobileFilter: mobileFilter,
    });
  } catch (err) {
    console.error("Widget services error:", err);
    return error("Failed to load services", 500);
  }
}
