import { decodeId } from '@/lib/id';
import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canSeeAllBookings } from "@/lib/permissions";
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
import { sendNotification } from "@/lib/notifications";

// GET /api/bookings - Get bookings (filtered by user role)
export async function GET(request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const rawSalonId = searchParams.get("salonId");
    const salonId = rawSalonId ? decodeId(rawSalonId) : null;
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
             COALESCE(st.last_name, su.last_name) as staff_last_name,
             p.method as payment_method,
             p.status as payment_status_real,
             p.amount as payment_amount,
             sc.is_active as client_is_active
      FROM bookings b
      JOIN users u ON u.id = b.client_id
      JOIN salons s ON s.id = b.salon_id
      LEFT JOIN staff st ON st.id = b.staff_id
      LEFT JOIN users su ON su.id = st.user_id
      LEFT JOIN payments p ON p.booking_id = b.id
      LEFT JOIN salon_clients sc ON sc.salon_id = b.salon_id AND sc.client_id = b.client_id
      WHERE b.deleted_at IS NULL
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
      // "staff" in users.role includes managers and receptionists too.
      // Check the staff table to see if this user is a manager/receptionist at the requested salon.
      if (salonId) {
        const staffRecord = await getOne(
          "SELECT role, permissions FROM staff WHERE user_id = ? AND salon_id = ? AND is_active = 1",
          [session.userId, salonId]
        );
        
        let shouldFilterToOwn = true;
        if (staffRecord) {
          const parsedPerms = staffRecord.permissions 
            ? (typeof staffRecord.permissions === 'string' ? JSON.parse(staffRecord.permissions) : staffRecord.permissions) 
            : null;
            
          // If the permissions engine grants "View all bookings" via role or custom override, don't filter.
          if (canSeeAllBookings(staffRecord.role, parsedPerms)) {
            shouldFilterToOwn = false;
          }
        }
        
        if (shouldFilterToOwn) {
          sql += " AND st.user_id = ?";
          params.push(session.userId);
        }
      } else {
        // No salon specified — staff can only see their own bookings across all salons
        sql += " AND st.user_id = ?";
        params.push(session.userId);
      }
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

    sql += " ORDER BY b.created_at DESC LIMIT ? OFFSET ?";
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

    const result = bookings.map((b) => {
      const bServices = bookingServices.filter((bs) => bs.booking_id === b.id);
      const computedTotal = bServices.reduce((sum, bs) => sum + parseFloat(bs.price || 0), 0) + parseFloat(b.travel_fee_amount || 0);

      return {
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
        clientIsActive: b.client_is_active !== null ? b.client_is_active === 1 : true,
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
        fulfillmentType: b.fulfillment_type || 'physical',
        serviceLocationAddress: b.service_location_address,
        serviceLat: b.service_lat ? parseFloat(b.service_lat) : null,
        serviceLng: b.service_lng ? parseFloat(b.service_lng) : null,
        travelFeeAmount: parseFloat(b.travel_fee_amount || 0),
        travelDistanceKm: b.travel_distance_km ? parseFloat(b.travel_distance_km) : null,
        totalPrice: b.payment_amount !== null && b.payment_amount !== undefined ? parseFloat(b.payment_amount) : computedTotal,
        paymentMethod: b.payment_method,
        paymentStatus: b.payment_status_real || b.payment_status,
        createdAt: b.created_at,
        services: bServices.map((bs) => ({
          id: bs.service_id,
          name: bs.service_name,
          price: bs.price,
          duration: bs.duration_minutes,
          staffId: bs.staff_id,
          startDatetime: bs.start_datetime ? String(bs.start_datetime).replace(' ', 'T') : null,
          endDatetime: bs.end_datetime ? String(bs.end_datetime).replace(' ', 'T') : null,
        })),
      };
    });

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
      staffAssignments,
      startDatetime,
      notes,
      source,
      discountCode,
      giftCardCode,
      // Fulfillment fields (optional — defaults to physical if omitted)
      fulfillmentType = 'physical',
      serviceLocationAddress = null,
      serviceLocationLat = null,
      serviceLocationLng = null,
      clientTimezone = null,
      virtualMeetingLink = null,
      forceOverride = false,
    } = validation.data;

    // Get services to calculate total duration and price
    if (serviceIds.length === 0) {
      return error(
        { code: "NO_SERVICES", message: "At least one service is required" },
        400,
      );
    }

// ── Round 1: five independent fetches in parallel ──────────────────────
    // services, staff, salon config, client, and client status all carry no inter-dependency
    // so we fire them all at once and wait once.
    const [services, staffRecord, salon, clientRecord, salonClientRecord] = await Promise.all([
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
        `SELECT s.id, s.is_marketplace_enabled, s.owner_id, s.name, u.email as owner_email, u.first_name as owner_first_name
         FROM salons s 
         JOIN users u ON u.id = s.owner_id
         WHERE s.id = ? AND s.deleted_at IS NULL`,
        [salonId],
      ),
      getOne(
        "SELECT id, first_name, email FROM users WHERE id = ? AND deleted_at IS NULL",
        [clientId],
      ),
      getOne(
        "SELECT is_active FROM salon_clients WHERE client_id = ? AND salon_id = ?",
        [clientId, salonId]
      ),
    ]);

    // Check if the client is blacklisted at this salon
    if (salonClientRecord && salonClientRecord.is_active === 0 && source !== "direct" && source !== "manual") {
      return error(
        { 
          code: "CLIENT_BLACKLISTED", 
          message: "You are currently restricted from booking at this salon due to previous no-shows or cancellations. Please contact the salon directly." 
        }, 
        403
      );
    }

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
    if (staffId !== "ANYONE_VIRTUAL" && !staffRecord) {
      return error(
        {
          code: "STAFF_UNAVAILABLE",
          message: "Staff member not found, inactive, or does not belong to this salon",
        },
        400,
      );
    }

    // ── Round 2: staff–service authorisation (needs uniqueServiceIds from round 1) ─
    if (staffId !== "ANYONE_VIRTUAL") {
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
    }

    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalBuffer = services.reduce((sum, s) => sum + (s.buffer_time_minutes || 0), 0);
    const totalPrice = services.reduce((sum, s) => sum + parseFloat(s.price), 0);

    // Normalise startDatetime to "YYYY-MM-DD HH:MM:SS" — no UTC conversion.
    const startDatetimeFormatted = startDatetime.slice(0, 19).replace("T", " ");

    // Derive endDatetime for the response; booking.js recomputes it internally.
    const pad = (n) => String(n).padStart(2, "0");
    const startDate = new Date(String(startDatetime).replace(" ", "T"));
    const endDate = new Date(startDate.getTime() + (totalDuration + totalBuffer) * 60000);
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
      services: services.map((s) => {
        // Use per-service staff if available, otherwise fall back to global staffId
        var svcStaff = (staffAssignments && staffAssignments[String(s.id)])
          ? staffAssignments[String(s.id)]
          : staffId;
        return {
          serviceId: s.id,
          staffId: svcStaff,
          price: s.price,
          duration: s.duration_minutes,
          bufferTime: s.buffer_time_minutes || 0,
        };
      }),
      notes: notes || null,
      status,
      source,
      isMarketplaceEnabled: !!salon.is_marketplace_enabled,
      discountCode,
      giftCardCode,
      // Fulfillment params — passed through to booking row and booking_travel_fees
      fulfillmentType,
      serviceLocationAddress,
      serviceLat: serviceLocationLat,
      serviceLng: serviceLocationLng,
      clientTimezone,
      virtualMeetingLink,
      forceOverride,
    });

    const isConfirmed = status === "confirmed";
    const notificationTitle = isConfirmed
      ? `Booking Confirmed: ${services[0]?.name}${services.length > 1 ? ` & ${services.length - 1} more` : ''}`
      : `Booking Received (Pending Approval): ${services[0]?.name}`;

    const formattedServicesHTML = services.map(s => `<li>${s.name} (${s.duration_minutes}m)</li>`).join('');
    const notificationBody = `
      <p>Hi ${clientRecord.first_name || 'there'},</p>
      <p>Your booking has been ${isConfirmed ? 'confirmed' : 'received and is awaiting salon approval'}.</p>
      <p><strong>When:</strong> ${startDatetimeFormatted}</p>
      <p><strong>Services:</strong></p>
      <ul>${formattedServicesHTML}</ul>
      <p>Thank you for booking with Fresh!</p>
    `;

    // Fire & Forget Notification (To Client)
    sendNotification({
      userId: clientId,
      email: clientRecord.email,
      type: 'email',
      title: notificationTitle,
      message: notificationBody,
      data: { bookingId: result.bookingId, status }
    });

    // Fire & Forget Notification (To Salon Owner)
    if (status === 'pending') {
      const ownerNotificationTitle = `New Booking Request (Pending): ${clientRecord.first_name}`;
      const ownerNotificationBody = `
        <p>Hi ${salon.owner_first_name || 'there'},</p>
        <p>You have received a new booking at ${salon.name} that requires your approval.</p>
        <p><strong>Client:</strong> ${clientRecord.first_name}</p>
        <p><strong>When:</strong> ${startDatetimeFormatted}</p>
        <p><strong>Services:</strong></p>
        <ul>${formattedServicesHTML}</ul>
        <p>Please log in to your dashboard to confirm or decline this request.</p>
      `;

      sendNotification({
        userId: salon.owner_id,
        email: salon.owner_email,
        type: 'email',
        title: ownerNotificationTitle,
        message: ownerNotificationBody,
        data: { bookingId: result.bookingId, status }
      });
    }

    return created({
      id: result.bookingId,
      salonId,
      clientId,
      staffId,
      startDatetime: startDatetimeFormatted,
      endDatetime: endDatetimeFormatted,
      status,
      source,
      fulfillmentType,
      totalDuration,
      totalPrice,
      discountAmount: result.discountAmount,
      giftCardAmountUsed: result.giftCardAmountUsed,
      finalAmountDue: result.finalAmountDue,
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
