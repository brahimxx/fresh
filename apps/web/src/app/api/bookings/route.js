import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  success,
  error,
  created,
  unauthorized,
  forbidden,
} from "@/lib/response";
import {
  validate,
  createBookingSchema,
  formatValidationErrors,
} from "@/lib/validate";
import { createSafeBooking, BookingError } from "@/lib/booking";

// GET /api/bookings - Get bookings (filtered by user role)
export async function GET(request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const salonId = searchParams.get("salonId");
    const staffId = searchParams.get("staffId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const offset = (page - 1) * limit;

    let sql = `
      SELECT b.*,
             u.first_name as client_first_name, u.last_name as client_last_name, u.email as client_email, u.phone as client_phone,
             s.name as salon_name,
             COALESCE(st.first_name, su.first_name) as staff_first_name,
             COALESCE(st.last_name, su.last_name) as staff_last_name
      FROM bookings b
      JOIN users u ON u.id = b.client_id
      JOIN salons s ON s.id = b.salon_id
      LEFT JOIN staff st ON st.id = b.staff_id
      LEFT JOIN users su ON su.id = st.user_id
      WHERE 1=1
    `;
    const params = [];

    // Role-based filtering
    if (session.role === "client") {
      sql += " AND b.client_id = ?";
      params.push(session.userId);
    } else if (session.role === "owner") {
      sql += " AND s.owner_id = ?";
      params.push(session.userId);
    } else if (session.role === "staff") {
      // Staff can see bookings assigned to them
      sql += " AND st.user_id = ?";
      params.push(session.userId);
    }

    if (salonId) {
      sql += " AND b.salon_id = ?";
      params.push(salonId);
    }

    if (staffId) {
      sql += " AND b.staff_id = ?";
      params.push(staffId);
    }

    if (status) {
      sql += " AND b.status = ?";
      params.push(status);
    }

    if (startDate) {
      sql += " AND b.start_datetime >= ?";
      params.push(startDate);
    }

    if (endDate) {
      sql += " AND b.end_datetime <= ?";
      params.push(endDate);
    }

    sql += " ORDER BY b.start_datetime DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const bookings = await query(sql, params);

    // Get booking services for each booking
    const bookingIds = bookings.map((b) => b.id);
    let bookingServices = [];
    if (bookingIds.length > 0) {
      // HIGH-1: Validate all IDs are integers to prevent SQL injection
      if (!bookingIds.every((id) => Number.isInteger(id) && id > 0)) {
        throw new Error("Invalid booking IDs detected");
      }
      bookingServices = await query(
        `SELECT bs.*, sv.name as service_name, bs.staff_id
         FROM booking_services bs
         JOIN services sv ON sv.id = bs.service_id
         WHERE bs.booking_id IN (${bookingIds.map(() => "?").join(",")})`,
        bookingIds,
      );
    }

    const result = bookings.map((b) => ({
      id: b.id,
      salonId: b.salon_id,
      salonName: b.salon_name,
      client: {
        id: b.client_id,
        firstName: b.client_first_name,
        lastName: b.client_last_name,
        email: b.client_email,
        phone: b.client_phone,
      },
      staff: b.staff_id
        ? {
            id: b.staff_id,
            firstName: b.staff_first_name,
            lastName: b.staff_last_name,
          }
        : null,
      startDatetime: b.start_datetime,
      endDatetime: b.end_datetime,
      status: b.status,
      source: b.source,
      createdAt: b.created_at,
      services: bookingServices
        .filter((bs) => bs.booking_id === b.id)
        .map((bs) => ({
          id: bs.service_id,
          name: bs.service_name,
          price: bs.price,
          duration: bs.duration_minutes,
          staffId: bs.staff_id,
        })),
    }));

    return success({ bookings: result });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Get bookings error:", err);
    return error("Failed to get bookings", 500);
  }
}

// POST /api/bookings - Create a new booking
export async function POST(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();

    // Validate input
    const validation = validate(createBookingSchema, body);
    if (!validation.success) {
      return error(
        {
          code: "VALIDATION_ERROR",
          message: formatValidationErrors(validation.errors),
        },
        400,
      );
    }

    const {
      salonId,
      clientId,
      staffId,
      serviceIds,
      startDatetime,
      endDatetime,
      notes,
      source,
    } = validation.data;

    // Get services to calculate total duration and price
    if (serviceIds.length === 0) {
      return error(
        { code: "NO_SERVICES", message: "At least one service is required" },
        400,
      );
    }

    const services = await query(
      `SELECT id, name, duration_minutes, price FROM services WHERE id IN (${serviceIds
        .map(() => "?")
        .join(",")}) AND salon_id = ? AND is_active = 1`,
      [...serviceIds, salonId],
    );

    if (services.length !== serviceIds.length) {
      return error(
        {
          code: "INVALID_SERVICES",
          message: "One or more services not found or inactive",
        },
        400,
      );
    }

    // Verify staff can perform these services
    const staffServices = await query(
      `SELECT service_id FROM service_staff WHERE staff_id = ? AND service_id IN (${serviceIds
        .map(() => "?")
        .join(",")})`,
      [staffId, ...serviceIds],
    );

    if (staffServices.length !== serviceIds.length) {
      return error(
        {
          code: "INVALID_STAFF_SERVICE",
          message: "Staff cannot perform one or more of the selected services",
        },
        400,
      );
    }

    const totalDuration = services.reduce(
      (sum, s) => sum + s.duration_minutes,
      0,
    );
    const totalPrice = services.reduce(
      (sum, s) => sum + parseFloat(s.price),
      0,
    );

    // Parse as local time — the frontend sends "YYYY-MM-DDTHH:mm:ss" (no Z/offset).
    // Node.js treats datetime strings without timezone as LOCAL time, so getDay()
    // and toTimeString() below both return the correct local values.
    const startDate = new Date(startDatetime);

    // Always derive end time from DB service durations — never trust the
    // frontend-provided endDatetime. The client could send a stale or incorrect
    // value; totalDuration is computed from DB records above.
    const pad = (n) => String(n).padStart(2, "0");
    const endDate = new Date(startDate.getTime() + totalDuration * 60000);
    const endDatetimeFormatted = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())} ${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:${pad(endDate.getSeconds())}`;
    // Pass through — do NOT call .toISOString() which converts to UTC.
    const startDatetimeFormatted = startDatetime.slice(0, 19).replace("T", " ");

    // Check staff working hours (outside transaction for faster fail)
    const dayOfWeek = startDate.getDay();
    const timeStr = startDate.toTimeString().slice(0, 8);
    const endTimeStr = endDate.toTimeString().slice(0, 8);

    console.log(
      `[BOOKING] Checking: staffId=${staffId}, day=${dayOfWeek}, start=${timeStr}, end=${endTimeStr}`,
    );

    // Check if staff works this day
    const workingHours = await getOne(
      "SELECT start_time, end_time FROM staff_working_hours WHERE staff_id = ? AND day_of_week = ?",
      [staffId, dayOfWeek],
    );

    if (!workingHours) {
      console.error(`[BOOKING ERROR] Staff not working on day ${dayOfWeek}`);
      return error(
        {
          code: "STAFF_UNAVAILABLE",
          message: "Staff is not working on this day",
        },
        409,
      );
    }

    // Verify appointment time falls within working hours.
    // Split into two branches so the message describes the exact problem.
    if (timeStr < workingHours.start_time) {
      console.error(
        `[BOOKING ERROR] Start before shift: staff works from ${workingHours.start_time}, requested ${timeStr}`,
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
        `[BOOKING ERROR] Service exceeds shift: shift ends ${workingHours.end_time}, booking would end ${endTimeStr}`,
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
      `[BOOKING] Working hours OK: ${workingHours.start_time}-${workingHours.end_time}`,
    );

    // Fetch salon to determine marketplace / platform-fee eligibility
    const salon = await getOne(
      "SELECT is_marketplace_enabled FROM salons WHERE id = ? AND deleted_at IS NULL",
      [salonId],
    );
    if (!salon) {
      return error(
        { code: "SALON_NOT_FOUND", message: "Salon not found" },
        404,
      );
    }

    // Delegate to createSafeBooking — it handles the full transaction:
    //   conflict check (FOR UPDATE), time-off check, insert, salon_clients upsert.
    const result = await createSafeBooking({
      salonId,
      clientId,
      primaryStaffId: staffId,
      startDatetime: startDatetimeFormatted,
      endDatetime: endDatetimeFormatted,
      services: services.map((s) => ({
        serviceId: s.id,
        staffId: staffId,
        price: s.price,
        duration: s.duration_minutes,
      })),
      notes: notes || null,
      source,
      isMarketplaceEnabled: !!salon.is_marketplace_enabled,
    });

    return created({
      id: result.bookingId,
      salonId,
      clientId,
      staffId,
      startDatetime: startDatetimeFormatted,
      endDatetime: endDatetimeFormatted,
      status: "confirmed",
      source,
      totalDuration,
      totalPrice,
      isNewClient: result.isNewClient,
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        duration: s.duration_minutes,
        price: s.price,
      })),
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    if (err instanceof BookingError) {
      return error({ code: err.code, message: err.message }, err.httpStatus);
    }
    console.error("Create booking error:", err);
    return error(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to create booking" },
      500,
    );
  }
}
