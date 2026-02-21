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

// POST /api/widget/[salonId]/book - Create booking from widget (requires authentication)
export async function POST(request, { params }) {
  try {
    // Require authentication
    const session = await requireAuth();
    const { salonId } = await params;

    const salon = await getOne(
      "SELECT id, name, is_marketplace_enabled FROM salons WHERE id = ?",
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

    const body = await request.json();
    const { services, startTime, notes } = body;

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

    // Verify all services exist and staff can perform them
    let totalDuration = 0;
    let totalPrice = 0;
    const serviceDetails = [];

    for (let svc of services) {
      const service = await getOne(
        "SELECT id, duration_minutes, price, name FROM services WHERE id = ? AND salon_id = ? AND is_active = 1",
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

      totalDuration += service.duration_minutes;
      totalPrice += parseFloat(service.price);
      serviceDetails.push({
        ...svc,
        duration: service.duration_minutes,
        price: service.price,
        name: service.name,
      });
    }

    // Calculate end time from DB service durations — totalDuration is computed
    // from DB records above so this is authoritative, not frontend-controlled.
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(
      startDateTime.getTime() + totalDuration * 60000,
    );

    // Format as local time using getters — do NOT use toISOString() which
    // converts to UTC and would store the wrong hour for UTC+1 Algeria.
    const pad = (n) => String(n).padStart(2, "0");
    const startDatetimeFormatted = `${startDateTime.getFullYear()}-${pad(startDateTime.getMonth() + 1)}-${pad(startDateTime.getDate())} ${pad(startDateTime.getHours())}:${pad(startDateTime.getMinutes())}:${pad(startDateTime.getSeconds())}`;
    const endDatetimeFormatted = `${endDateTime.getFullYear()}-${pad(endDateTime.getMonth() + 1)}-${pad(endDateTime.getDate())} ${pad(endDateTime.getHours())}:${pad(endDateTime.getMinutes())}:${pad(endDateTime.getSeconds())}`;

    // Get unique staff IDs for conflict checking
    const staffIds = [...new Set(services.map((s) => s.staffId))];

    // Check working hours for all staff
    // Use the ORIGINAL startDateTime for day/time checks (not the UTC-adjusted version)
    const dayOfWeek = startDateTime.getDay();
    const timeStr = startDateTime.toTimeString().slice(0, 8); // HH:MM:SS in local Algeria time
    const endTimeStr = endDateTime.toTimeString().slice(0, 8);

    console.log(
      `[WIDGET BOOKING] Multiple services: ${serviceDetails.map((s) => s.name).join(", ")}`,
    );
    console.log(
      `[WIDGET BOOKING] Staff IDs: ${staffIds.join(", ")}, total duration: ${totalDuration} min`,
    );
    console.log(
      `[WIDGET BOOKING] Checking availability: day=${dayOfWeek}, time=${timeStr}-${endTimeStr}`,
    );

    for (let staffId of staffIds) {
      console.log(
        `[WIDGET BOOKING] Checking staff ${staffId} on day ${dayOfWeek}`,
      );

      // Check if staff works this day (without restrictive time conditions)
      let workingHours = await getOne(
        "SELECT start_time, end_time FROM staff_working_hours WHERE staff_id = ? AND day_of_week = ?",
        [staffId, dayOfWeek],
      );

      console.log(`[WIDGET BOOKING] Staff hours from DB:`, workingHours);

      if (!workingHours) {
        // Fallback to business hours
        console.log(
          `[WIDGET BOOKING] No staff hours, trying business hours for salon ${salonId}`,
        );
        workingHours = await getOne(
          "SELECT open_time as start_time, close_time as end_time FROM business_hours WHERE salon_id = ? AND day_of_week = ? AND is_closed = 0",
          [salonId, dayOfWeek],
        );
        console.log(`[WIDGET BOOKING] Business hours from DB:`, workingHours);
      }

      if (!workingHours) {
        console.error(
          `[WIDGET BOOKING] ❌ FAILED: Staff ${staffId} not working on day ${dayOfWeek}`,
        );
        return error(
          {
            code: "STAFF_UNAVAILABLE",
            message: `Staff ${staffId} is not working on this day`,
          },
          409,
        );
      }

      // Debug: show exact comparison values
      console.log(`[WIDGET BOOKING] Time comparison:`, {
        requestStart: timeStr,
        requestEnd: endTimeStr,
        shiftStart: workingHours.start_time,
        shiftEnd: workingHours.end_time,
        startTimeType: typeof timeStr,
        dbStartTimeType: typeof workingHours.start_time,
        startComparison: `${timeStr} < ${workingHours.start_time} = ${timeStr < workingHours.start_time}`,
        endComparison: `${endTimeStr} > ${workingHours.end_time} = ${endTimeStr > workingHours.end_time}`,
      });

      // Verify appointment time falls within working hours.
      // Split into two branches so the message describes the exact problem.
      if (timeStr < workingHours.start_time) {
        console.error(
          `[WIDGET BOOKING] ❌ FAILED: Staff ${staffId} doesn't start until ${workingHours.start_time}, requested ${timeStr}`,
        );
        return error(
          {
            code: "STAFF_UNAVAILABLE",
            message: `Staff doesn't start working until ${workingHours.start_time.slice(0, 5)}. Please choose a time at or after ${workingHours.start_time.slice(0, 5)}.`,
          },
          409,
        );
      }
      if (endTimeStr > workingHours.end_time) {
        console.error(
          `[WIDGET BOOKING] ❌ FAILED: Service exceeds shift — shift ends ${workingHours.end_time}, booking would end ${endTimeStr}`,
        );
        return error(
          {
            code: "SERVICE_EXCEEDS_SHIFT",
            message: `This service would end at ${endTimeStr.slice(0, 5)}, but the staff's shift ends at ${workingHours.end_time.slice(0, 5)}. Please choose an earlier start time.`,
          },
          409,
        );
      }

      console.log(
        `[WIDGET BOOKING] ✅ Staff ${staffId} is available: ${workingHours.start_time}-${workingHours.end_time}`,
      );
    }

    console.log(
      `[WIDGET BOOKING] Creating booking: ${startDatetimeFormatted} to ${endDatetimeFormatted}`,
    );

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
      })),
      notes: notes || null,
      source: "marketplace",
      isMarketplaceEnabled: !!salon.is_marketplace_enabled,
    });

    const { bookingId, isNewClient } = result;

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

    return created({
      success: true,
      bookingId: result.bookingId,
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
