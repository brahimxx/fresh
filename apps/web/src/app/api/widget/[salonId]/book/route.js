import { decodeId } from "@/lib/id";
import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  success,
  error,
  created,
  notFound,
  unauthorized,
} from "@/lib/response";
import {
  validate,
  widgetBookingSchema,
  formatValidationErrors,
} from "@/lib/validate";
import { createSafeBooking, BookingError } from "@/lib/booking";
import { sendContextualBookingConfirmation } from "@/lib/notifications";
import { stripe } from "@/lib/stripe";
import {
  geocodeAddress,
  haversineDistanceKm,
  isValidCoordinatePair,
} from "@/lib/geo";

// POST /api/widget/[salonId]/book - Create booking from widget (requires authentication)
export async function POST(request, { params }) {
  try {
    // Require authentication
    const session = await requireAuth();
    const { salonId: rawSalonId } = await params;
    const salonId = decodeId(rawSalonId);

    const salon = await getOne(
      "SELECT id, name, address, city, country, latitude, longitude, is_marketplace_enabled, virtual_meeting_link, covered_zip_codes, travel_radius, mobile_base_address FROM salons WHERE id = ?",
      [salonId],
    );
    if (!salon) {
      return notFound("Salon not found");
    }

    const widgetSettings = await getOne(
      "SELECT * FROM widget_settings WHERE salon_id = ?",
      [salonId],
    );
    if (!widgetSettings || !widgetSettings.enabled) {
      return error(
        { code: "WIDGET_DISABLED", message: "Booking widget is not available" },
        403,
      );
    }

    const salonSettings = await getOne(
      "SELECT auto_confirm_bookings FROM salon_settings WHERE salon_id = ?",
      [salonId],
    );
    const autoConfirm = salonSettings
      ? !!salonSettings.auto_confirm_bookings
      : false;

    const body = await request.json();
    const {
      services,
      startTime,
      notes,
      paymentMethod,
      fulfillmentType,
      serviceLocationAddress,
      clientTimezone,
      virtualMeetingLink,
    } = body;

    // Validate services array
    if (!services || !Array.isArray(services) || services.length === 0) {
      return error(
        {
          code: "VALIDATION_ERROR",
          message: "At least one service is required",
        },
        400,
      );
    }

    // Validate each service has required fields
    for (let svc of services) {
      if (!svc.serviceId || !svc.staffId) {
        return error(
          {
            code: "VALIDATION_ERROR",
            message: "Each service must have serviceId and staffId",
          },
          400,
        );
      }
    }

    // Use authenticated user's data
    const clientId = session.userId;

    // Check if the client is blacklisted at this salon
    const salonClientRecord = await getOne(
      "SELECT is_active FROM salon_clients WHERE client_id = ? AND salon_id = ?",
      [clientId, salonId],
    );

    if (salonClientRecord && salonClientRecord.is_active === 0) {
      return error(
        {
          code: "CLIENT_BLACKLISTED",
          message:
            "You are currently restricted from booking at this salon due to previous no-shows or cancellations. Please contact the salon directly.",
        },
        403,
      );
    }

    // Verify all services exist and staff can perform them
    let totalDuration = 0;
    let totalBuffer = 0;
    let totalPrice = 0;
    const serviceDetails = [];

    for (let svc of services) {
      const service = await getOne(
        "SELECT id, duration_minutes, buffer_time_minutes, price, name FROM services WHERE id = ? AND salon_id = ? AND is_active = 1",
        [svc.serviceId, salonId],
      );
      if (!service) {
        return error(
          {
            code: "SERVICE_UNAVAILABLE",
            message: `Service ${svc.serviceId} not found or inactive`,
          },
          404,
        );
      }

      // Verify staff can perform this service
      if (svc.staffId !== "any" && svc.staffId !== "ANYONE_VIRTUAL") {
        const staffCheck = await getOne(
          "SELECT service_id FROM service_staff WHERE service_id = ? AND staff_id = ?",
          [svc.serviceId, svc.staffId],
        );
        if (!staffCheck) {
          return error(
            {
              code: "INVALID_STAFF",
              message: `Staff ${svc.staffId} cannot perform service: ${service.name}`,
            },
            400,
          );
        }
      }

      totalDuration += service.duration_minutes;
      totalBuffer += service.buffer_time_minutes || 0;
      totalPrice += parseFloat(service.price);
      serviceDetails.push({
        ...svc,
        duration: service.duration_minutes,
        bufferTime: service.buffer_time_minutes || 0,
        price: service.price,
        name: service.name,
      });
    }

    // ── Fulfillment-specific validation ─────────────────────────────────────
    //
    // Mobile: client address is required; ZIP must be within covered zones.
    // Virtual: meeting link defaults to the salon's static link if not provided.
    // Physical: no extra validation needed.

    if (fulfillmentType === "mobile") {
      if (!serviceLocationAddress || !serviceLocationAddress.trim()) {
        return error(
          {
            code: "ADDRESS_REQUIRED",
            message: "A client address is required for mobile service bookings",
          },
          400,
        );
      }

      // Radius boundary check (if the salon has set travel_radius)
      var radiusKm = Number(salon.travel_radius || 0);
      if (radiusKm > 0) {
        var centerLat = Number(salon.latitude);
        var centerLng = Number(salon.longitude);

        if (!isValidCoordinatePair(centerLat, centerLng)) {
          var centerAddress = (salon.mobile_base_address || "").trim();
          if (!centerAddress) {
            centerAddress = [salon.address, salon.city, salon.country]
              .filter(Boolean)
              .join(", ");
          }

          if (!centerAddress) {
            return error(
              {
                code: "MOBILE_CENTER_NOT_CONFIGURED",
                message:
                  "Mobile radius is enabled but no center address is configured. Please ask the salon to set a mobile service center address.",
              },
              400,
            );
          }

          var centerCoords = null;
          try {
            centerCoords = await geocodeAddress(centerAddress);
          } catch (geoErr) {
            console.error("[WIDGET BOOKING] Center geocoding failed:", geoErr);
          }

          if (!centerCoords) {
            return error(
              {
                code: "MOBILE_CENTER_GEOCODE_FAILED",
                message:
                  "We could not verify the salon mobile center location. Please try again later.",
              },
              400,
            );
          }

          centerLat = centerCoords.lat;
          centerLng = centerCoords.lng;

          // Cache derived center coordinates for future checks.
          try {
            await query(
              "UPDATE salons SET latitude = ?, longitude = ? WHERE id = ?",
              [centerLat, centerLng, salonId],
            );
          } catch (persistErr) {
            console.error(
              "[WIDGET BOOKING] Failed to persist center coordinates:",
              persistErr,
            );
          }
        }

        var clientCoords = null;
        try {
          clientCoords = await geocodeAddress(serviceLocationAddress.trim());
        } catch (geoErr) {
          console.error("[WIDGET BOOKING] Client geocoding failed:", geoErr);
        }

        if (!clientCoords) {
          return error(
            {
              code: "CLIENT_ADDRESS_GEOCODE_FAILED",
              message:
                "We could not verify your address for mobile radius checks. Please use a full address.",
            },
            400,
          );
        }

        var distanceKm = haversineDistanceKm(
          centerLat,
          centerLng,
          clientCoords.lat,
          clientCoords.lng,
        );

        if (distanceKm > radiusKm) {
          return error(
            {
              code: "OUTSIDE_SERVICE_RADIUS",
              message:
                "Your address is outside our mobile service radius (" +
                distanceKm.toFixed(1) +
                " km away, max " +
                radiusKm +
                " km).",
            },
            400,
          );
        }
      }

      // ZIP code boundary check (if the salon has set covered zones)
      if (salon.covered_zip_codes) {
        const zips = salon.covered_zip_codes
          .split(",")
          .map((z) => z.trim())
          .filter(Boolean);
        if (zips.length > 0) {
          const hasMatch = zips.some((z) => serviceLocationAddress.includes(z));
          if (!hasMatch) {
            return error(
              {
                code: "OUTSIDE_SERVICE_AREA",
                message: `Your address is outside our service area. We cover: ${salon.covered_zip_codes}`,
              },
              400,
            );
          }
        }
      }
    }

    // Resolve meeting link for virtual bookings
    const resolvedMeetingLink =
      fulfillmentType === "virtual"
        ? virtualMeetingLink || salon.virtual_meeting_link || null
        : null;

    // Calculate end time from DB service durations — totalDuration is computed
    // from DB records above so this is authoritative, not frontend-controlled.
    // We add totalBuffer to endDateTime so the buffer is blocked out in the calendar.
    const startDateTime = new Date(String(startTime).replace(" ", "T"));
    const endDateTime = new Date(
      startDateTime.getTime() + (totalDuration + totalBuffer) * 60000,
    );

    // Format as local time using getters — do NOT use toISOString() which
    // converts to UTC and would store the wrong hour for UTC+1 Algeria.
    const pad = (n) => String(n).padStart(2, "0");
    const startDatetimeFormatted = `${startDateTime.getFullYear()}-${pad(startDateTime.getMonth() + 1)}-${pad(startDateTime.getDate())} ${pad(startDateTime.getHours())}:${pad(startDateTime.getMinutes())}:${pad(startDateTime.getSeconds())}`;
    const endDatetimeFormatted = `${endDateTime.getFullYear()}-${pad(endDateTime.getMonth() + 1)}-${pad(endDateTime.getDate())} ${pad(endDateTime.getHours())}:${pad(endDateTime.getMinutes())}:${pad(endDateTime.getSeconds())}`;

    // ── Per-service sequential working hours check ───────────────────────
    //
    // Build the sequential service schedule and verify each staff member's
    // working hours only against the time window of their assigned service(s),
    // not the entire booking span. This enables scenarios where Staff Y starts
    // at 12:30 but Service A with Staff X runs 12:00–12:30 before Y takes over.

    // Build the sequential schedule: service windows back-to-back
    const dayOfWeek = startDateTime.getDay();
    let scheduleCursor = new Date(startDateTime);
    const serviceWindows = serviceDetails.map((svc, i) => {
      const duration = svc.duration;
      const buffer = svc.bufferTime || 0;
      const isLast = i === serviceDetails.length - 1;
      const winStart = new Date(scheduleCursor);
      const winEnd = new Date(
        scheduleCursor.getTime() + (duration + (isLast ? buffer : 0)) * 60000,
      );
      // Advance cursor by pure duration (no buffer gap between services)
      scheduleCursor = new Date(scheduleCursor.getTime() + duration * 60000);
      return { staffId: svc.staffId, start: winStart, end: winEnd };
    });

    // Group windows by staff
    const staffWindowsMap = {};
    for (const win of serviceWindows) {
      if (win.staffId === "any" || win.staffId === "ANYONE_VIRTUAL") continue;
      if (!staffWindowsMap[win.staffId]) staffWindowsMap[win.staffId] = [];
      staffWindowsMap[win.staffId].push(win);
    }

    for (const [staffIdStr, windows] of Object.entries(staffWindowsMap)) {
      const sId = staffIdStr;

      let workingHours = await getOne(
        "SELECT start_time, end_time FROM staff_working_hours WHERE staff_id = ? AND day_of_week = ?",
        [sId, dayOfWeek],
      );

      if (!workingHours) {
        workingHours = await getOne(
          "SELECT open_time as start_time, close_time as end_time FROM business_hours WHERE salon_id = ? AND day_of_week = ? AND is_closed = 0",
          [salonId, dayOfWeek],
        );
      }

      if (!workingHours) {
        console.error(
          `[WIDGET BOOKING] Staff ${sId} not working on day ${dayOfWeek}`,
        );
        return error(
          {
            code: "STAFF_UNAVAILABLE",
            message: `Staff ${sId} is not working on this day`,
          },
          409,
        );
      }

      // Check each service window for this staff member
      for (const win of windows) {
        const winTimeStr = win.start.toTimeString().slice(0, 8);
        const winEndTimeStr = win.end.toTimeString().slice(0, 8);

        if (winTimeStr < workingHours.start_time) {
          console.error(
            `[WIDGET BOOKING] Staff ${sId} doesn't start until ${workingHours.start_time}, service needs ${winTimeStr}`,
          );
          return error(
            {
              code: "STAFF_UNAVAILABLE",
              message: `Staff doesn't start working until ${workingHours.start_time.slice(0, 5)}. Please choose a time at or after ${workingHours.start_time.slice(0, 5)}.`,
            },
            409,
          );
        }
        if (winEndTimeStr > workingHours.end_time) {
          console.error(
            `[WIDGET BOOKING] Service exceeds shift — shift ends ${workingHours.end_time}, service would end ${winEndTimeStr}`,
          );
          return error(
            {
              code: "SERVICE_EXCEEDS_SHIFT",
              message: `This service would end at ${winEndTimeStr.slice(0, 5)}, but the staff's shift ends at ${workingHours.end_time.slice(0, 5)}. Please choose an earlier start time.`,
            },
            409,
          );
        }
      }
    }

    // Primary staff = the staff assigned to the first service
    const primaryStaffId = services[0].staffId;

    // createSafeBooking handles the full transaction:
    //   FOR UPDATE conflict check, time-off check, insert, salon_clients upsert.
    const result = await createSafeBooking({
      salonId: Number(salonId),
      clientId,
      primaryStaffId,
      startDatetime: startDatetimeFormatted,
      endDatetime: endDatetimeFormatted,
      services: serviceDetails.map((s) => ({
        serviceId: s.serviceId,
        staffId: s.staffId,
        price: s.price,
        duration: s.duration,
        bufferTime: s.bufferTime,
      })),
      notes: notes || null,
      status: autoConfirm ? "confirmed" : "pending",
      source: "marketplace",
      isMarketplaceEnabled: !!salon.is_marketplace_enabled,
      fulfillmentType: fulfillmentType || "physical",
      serviceLocationAddress: serviceLocationAddress || null,
      clientTimezone: clientTimezone || null,
      virtualMeetingLink: resolvedMeetingLink,
    });

    const { bookingId, isNewClient } = result;
    const finalPrice = result.totalPrice || totalPrice;

    let checkoutUrl = null;

    if (paymentMethod === "stripe") {
      try {
        const origin =
          request.headers.get("origin") ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000";

        // Insert a pending payment record
        await query(
          "INSERT INTO payments (booking_id, amount, method, status) VALUES (?, ?, 'card', 'pending')",
          [bookingId, finalPrice || 0],
        );

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "eur", // Assuming eur, adjust if salon uses different currency
                product_data: {
                  name: `Booking at ${salon.name}`,
                },
                unit_amount: Math.round((finalPrice || 0) * 100), // Stripe expects amounts in cents
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${origin}/dashboard/client/bookings?success=true`,
          cancel_url: `${origin}/api/checkout/cancel?bookingId=${bookingId}&salonId=${salonId}`,
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Expire link exactly in 30 minutes
          metadata: {
            bookingId: bookingId.toString(),
            salonId: salonId.toString(),
          },
        });

        checkoutUrl = session.url;
      } catch (stripeErr) {
        console.error("Stripe session creation failed:", stripeErr);
        // Continue, the booking is created. They can pay later.
      }
    } else if (paymentMethod === "cash") {
      // Insert a pending cash payment
      await query(
        "INSERT INTO payments (booking_id, amount, method, status) VALUES (?, ?, 'cash', 'pending')",
        [bookingId, finalPrice || 0],
      );
    }

    // Notification for salon owner — runs OUTSIDE the booking transaction.
    // A notification failure must never roll back a successfully created booking.
    try {
      const [[ownerRow]] = await query(
        "SELECT first_name, last_name FROM users WHERE id = ? LIMIT 1",
        [clientId],
      ).then((rows) => [rows]);
      const clientName = ownerRow
        ? `${ownerRow.first_name} ${ownerRow.last_name}`
        : "A customer";
      await query(
        `INSERT INTO notifications (user_id, type, title, message, sent_at)
         SELECT s.owner_id, 'push', 'New Booking', ?, NOW()
           FROM salons s WHERE s.id = ?`,
        [
          `New booking from ${clientName} on ${startDateTime.toLocaleDateString()} - ${serviceDetails.map((s) => s.name).join(", ")}`,
          salonId,
        ],
      );
    } catch (notifErr) {
      console.error(
        "[WIDGET BOOKING] Notification insert failed (non-fatal):",
        notifErr,
      );
    }

    // Send Contextual Client Email / SMS
    try {
      if (clientId) {
        // Find email address for the user, but we already have session?
        // We know clientId. Next we need clientEmail. We queried ownerRow, let's just query client properly:
        const clientProfile = await getOne(
          "SELECT email, first_name, last_name FROM users WHERE id = ?",
          [clientId],
        );

        if (clientProfile && clientProfile.email) {
          await sendContextualBookingConfirmation({
            userId: clientId,
            userEmail: clientProfile.email,
            userName: clientProfile.first_name,
            salonName: salon.name,
            services: serviceDetails,
            startTime: startDateTime,
            fulfillmentType: fulfillmentType || "physical",
            serviceLocationAddress: serviceLocationAddress || null,
            virtualMeetingLink:
              fulfillmentType === "virtual" ? salon.virtual_meeting_link : null,
            clientTimezone: clientTimezone || "UTC",
          });
        }
      }
    } catch (clientNotifErr) {
      console.error(
        "[WIDGET BOOKING] Contextual client email trigger failed:",
        clientNotifErr,
      );
    }

    return created({
      success: true,
      bookingId: result.bookingId,
      checkoutUrl,
      message:
        widgetSettings.success_message || "Your booking has been confirmed!",
      booking: {
        id: result.bookingId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        salonName: salon.name,
        services: serviceDetails.map((s) => ({
          id: s.serviceId,
          name: s.name,
          price: s.price,
          duration: s.duration,
          staffId: s.staffId,
        })),
        // Backward-compat: keep a single `service` object for older clients
        service: {
          id: serviceDetails[0]?.serviceId,
          price: serviceDetails[0]?.price,
          duration: serviceDetails[0]?.duration,
        },
      },
    });
  } catch (err) {
    if (err.message === "Unauthorized") {
      return unauthorized({
        code: "UNAUTHORIZED",
        message: "Please sign in to complete your booking",
      });
    }
    if (err instanceof BookingError) {
      return error({ code: err.code, message: err.message }, err.httpStatus);
    }
    console.error("Widget booking error:", err);
    return error(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to create booking" },
      500,
    );
  }
}
