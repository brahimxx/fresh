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
      startDatetime: String(b.start_datetime).replace(' ', 'T'),
      endDatetime: String(b.end_datetime).replace(' ', 'T'),
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

    // ── Round 1: four independent fetches in parallel ──────────────────────
    // services, staff, salon config, and client all carry no inter-dependency
    // so we fire them all at once and wait once.
    const [services, staffRecord, salon, clientRecord] = await Promise.all([
      query(
        `SELECT id, name, duration_minutes, buffer_time_minutes, price
           FROM services
          WHERE id IN (${serviceIds.map(() => "?").join(",")})
            AND salon_id = ? AND is_active = 1 AND deleted_at IS NULL`,
        [...serviceIds, salonId],
      ),
      getOne(
        "SELECT id FROM staff WHERE id = ? AND salon_id = ? AND is_active = 1",
        [staffId, salonId],
      ),
      getOne(
        "SELECT is_marketplace_enabled FROM salons WHERE id = ? AND deleted_at IS NULL",
        [salonId],
      ),
      getOne(
        "SELECT id FROM users WHERE id = ? AND role != 'deleted'",
        [clientId],
      ),
    ]);

    // Deduplicate serviceIds to prevent false-positive length mismatch
    const uniqueServiceIds = [...new Set(serviceIds.map(Number))];

    // Fail fast — ordered cheapest/most-likely-wrong first
    if (!salon) {
      return error({ code: "SALON_NOT_FOUND", message: "Salon not found" }, 404);
    }
    if (!clientRecord) {
      return error(
        { code: "CLIENT_NOT_FOUND", message: "Client not found" },
        400,
      );
    }
    if (services.length !== uniqueServiceIds.length) {
      return error(
        { code: "INVALID_SERVICES", message: "One or more services not found or inactive" },
        400,
      );
    }
    if (!staffRecord) {
      return error(
        {
          code: "STAFF_UNAVAILABLE",
          message: "Staff member not found, inactive, or does not belong to this salon",
        },
        400,
      );
    }

    // ── Round 2: staff–service authorisation (needs uniqueServiceIds from round 1) ─
    const staffServices = await query(
      `SELECT service_id FROM service_staff
        WHERE staff_id = ? AND service_id IN (${uniqueServiceIds.map(() => "?").join(",")})`,
      [staffId, ...uniqueServiceIds],
    );

    if (staffServices.length !== uniqueServiceIds.length) {
      return error(
        {
          code: "STAFF_SERVICE_MISMATCH",
          message: "Staff member is not authorised to perform one or more of the selected services",
        },
        400,
      );
    }

    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalBuffer  = services.reduce((sum, s) => sum + (s.buffer_time_minutes || 0), 0);
    const totalPrice   = services.reduce((sum, s) => sum + parseFloat(s.price), 0);

    // Normalise startDatetime to "YYYY-MM-DD HH:MM:SS" — no UTC conversion.
    const startDatetimeFormatted = startDatetime.slice(0, 19).replace("T", " ");

    // Derive endDatetime for the response; booking.js recomputes it internally.
    const pad = (n) => String(n).padStart(2, "0");
    const startDate = new Date(String(startDatetime).replace(" ", "T"));
    const endDate   = new Date(startDate.getTime() + (totalDuration + totalBuffer) * 60000);
    const endDatetimeFormatted = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())} ${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:${pad(endDate.getSeconds())}`;

    // Dashboard / direct bookings are always confirmed — a receptionist creating
    // a booking in person never needs approval.  auto_confirm_bookings only
    // applies to public-facing sources (widget, marketplace).
    const resolvedSource = source || "direct";
    let status;
    if (resolvedSource === "direct") {
      status = "confirmed";
    } else {
      const salonSettings = await getOne(
        "SELECT auto_confirm_bookings FROM salon_settings WHERE salon_id = ?",
        [salonId],
      );
      status = (salonSettings && salonSettings.auto_confirm_bookings) ? "confirmed" : "pending";
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
        bufferTime: s.buffer_time_minutes || 0,
      })),
      notes: notes || null,
      status,
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
      status,
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
