import { query, getOne, transaction } from "@/lib/db";
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

// POST /api/widget/[salonId]/book - Create booking from widget (requires authentication)
export async function POST(request, { params }) {
  try {
    // Require authentication
    const session = await requireAuth();
    const { salonId } = await params;

    const salon = await getOne(
      "SELECT id, name, is_marketplace_enabled FROM salons WHERE id = ?",
      [salonId]
    );
    if (!salon) {
      return notFound("Salon not found");
    }

    const widgetSettings = await getOne(
      "SELECT * FROM widget_settings WHERE salon_id = ?",
      [salonId]
    );
    if (!widgetSettings || !widgetSettings.enabled) {
      return error({ code: 'WIDGET_DISABLED', message: "Booking widget is not available" }, 403);
    }

    const body = await request.json();

    // Validate input using Zod schema
    const validation = validate(widgetBookingSchema, body);
    if (!validation.success) {
      return error({ code: 'VALIDATION_ERROR', message: formatValidationErrors(validation.errors) }, 400);
    }

    const { serviceId, staffId, startTime, notes } = validation.data;

    // Use authenticated user's data
    const clientId = session.userId;

    // Verify service exists and belongs to salon
    const service = await getOne(
      "SELECT id, duration_minutes, price FROM services WHERE id = ? AND salon_id = ? AND is_active = 1",
      [serviceId, salonId]
    );
    if (!service) {
      return error({ code: 'SERVICE_UNAVAILABLE', message: "Service not found or inactive" }, 404);
    }

    // Verify staff can perform this service
    const staffCheck = await getOne(
      "SELECT service_id FROM service_staff WHERE service_id = ? AND staff_id = ?",
      [serviceId, staffId]
    );
    if (!staffCheck) {
      return error({ code: 'INVALID_STAFF', message: "Selected staff cannot perform this service" }, 400);
    }

    // Calculate end time
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(
      startDateTime.getTime() + service.duration_minutes * 60000
    );
    const startDatetimeFormatted = startDateTime
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
    const endDatetimeFormatted = endDateTime
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // Check working hours before transaction
    const dayOfWeek = startDateTime.getDay();
    const timeStr = startDateTime.toTimeString().slice(0, 8);
    const endTimeStr = endDateTime.toTimeString().slice(0, 8);

    // Check staff working hours, fallback to salon business hours
    let workingHours = await getOne(
      "SELECT start_time, end_time FROM staff_working_hours WHERE staff_id = ? AND day_of_week = ? AND start_time <= ? AND end_time >= ?",
      [staffId, dayOfWeek, timeStr, endTimeStr]
    );

    // Fallback to salon business hours if staff has no specific hours
    if (!workingHours) {
      workingHours = await getOne(
        "SELECT open_time as start_time, close_time as end_time FROM business_hours WHERE salon_id = ? AND day_of_week = ? AND is_closed = 0 AND open_time <= ? AND close_time >= ?",
        [salonId, dayOfWeek, timeStr, endTimeStr]
      );
    }

    if (!workingHours) {
      return error({ code: 'STAFF_UNAVAILABLE', message: "Staff is not working at this time" }, 409);
    }

    const result = await transaction(async (conn) => {
      // Lock and check for conflicts (prevents race condition)
      const [conflicts] = await conn.execute(
        `SELECT id FROM bookings 
         WHERE staff_id = ? 
         AND status NOT IN ('cancelled', 'no_show')
         AND start_datetime < ? AND end_datetime > ?
         FOR UPDATE`,
        [staffId, endDatetimeFormatted, startDatetimeFormatted]
      );

      if (conflicts.length > 0) {
        throw new Error("CONFLICT: This time slot is no longer available");
      }

      // Create or update salon_clients relationship
      const [existing] = await conn.execute(
        "SELECT salon_id FROM salon_clients WHERE salon_id = ? AND client_id = ?",
        [salonId, clientId]
      );

      const isNewClient = existing.length === 0;

      if (isNewClient) {
        await conn.execute(
          "INSERT INTO salon_clients (salon_id, client_id, first_visit_date, last_visit_date, total_visits) VALUES (?, ?, NOW(), NOW(), 1)",
          [salonId, clientId]
        );
      } else {
        await conn.execute(
          "UPDATE salon_clients SET last_visit_date = NOW(), total_visits = total_visits + 1 WHERE salon_id = ? AND client_id = ?",
          [salonId, clientId]
        );
      }

      // Create booking
      const [bookingResult] = await conn.execute(
        `INSERT INTO bookings (
          salon_id, client_id, staff_id, start_datetime, end_datetime, 
          status, source, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', 'marketplace', ?, NOW())`,
        [
          salonId,
          clientId,
          staffId,
          startDatetimeFormatted,
          endDatetimeFormatted,
          notes || null,
        ]
      );

      const bookingId = bookingResult.insertId;

      // Add booking service
      await conn.execute(
        "INSERT INTO booking_services (booking_id, service_id, price, duration_minutes) VALUES (?, ?, ?, ?)",
        [bookingId, serviceId, service.price, service.duration_minutes]
      );

      // Create platform fee if new client from marketplace
      if (isNewClient && salon.is_marketplace_enabled) {
        await conn.execute(
          "INSERT INTO platform_fees (booking_id, salon_id, type, amount, is_paid) VALUES (?, ?, 'new_client', ?, 0)",
          [bookingId, salonId, parseFloat(service.price) * 0.2]
        );
      }

      // Get user info for notification
      const [userRows] = await conn.execute(
        "SELECT first_name, last_name FROM users WHERE id = ?",
        [clientId]
      );
      const clientName = userRows[0]
        ? `${userRows[0].first_name} ${userRows[0].last_name}`
        : "A customer";

      // Create notification for salon owner
      await conn.execute(
        `INSERT INTO notifications (user_id, type, title, message, sent_at)
         SELECT s.owner_id, 'push', 'New Booking', ?, NOW()
         FROM salons s WHERE s.id = ?`,
        [
          `New booking from ${clientName} on ${startDateTime.toLocaleDateString()}`,
          salonId,
        ]
      );

      return {
        bookingId,
        clientId,
        isNewClient,
      };
    });

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
        service: {
          id: service.id,
          price: service.price,
          duration: service.duration_minutes,
        },
      },
    });
  } catch (err) {
    if (err.message === "Unauthorized") {
      return unauthorized({ code: 'UNAUTHORIZED', message: "Please sign in to complete your booking" });
    }
    if (err.message.startsWith("CONFLICT:")) {
      return error({ code: 'BOOKING_CONFLICT', message: err.message.replace("CONFLICT: ", "") }, 409);
    }
    console.error("Widget booking error:", err);
    return error({ code: 'INTERNAL_SERVER_ERROR', message: "Failed to create booking" }, 500);
  }
}
