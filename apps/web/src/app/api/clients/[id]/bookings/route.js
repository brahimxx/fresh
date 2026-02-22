import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  success,
  error,
  notFound,
  unauthorized,
  forbidden,
} from "@/lib/response";

// ---------------------------------------------------------------------------
// Access guard — mirrors the logic in /api/clients/route.js.
// Any active staff member of the salon (owner, manager, receptionist) may
// view the booking history for clients of that salon.
// ---------------------------------------------------------------------------
async function checkSalonAccess(salonId, userId, role) {
  if (role === "admin") return true;

  const salon = await getOne(
    "SELECT owner_id FROM salons WHERE id = ? AND deleted_at IS NULL",
    [salonId],
  );
  if (!salon) return false;
  if (salon.owner_id === userId) return true;

  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1",
    [salonId, userId],
  );
  return !!staff;
}

// ---------------------------------------------------------------------------
// GET /api/clients/[id]/bookings?salonId=3&page=1&limit=20
//
// Returns the booking history for a single client, scoped to one salon.
//
// Query strategy — two queries, zero serial N+1:
//
//   Query 1 — bookings
//     WHERE client_id = ? AND salon_id = ? AND deleted_at IS NULL
//     ORDER BY start_datetime DESC
//     Uses idx_bookings_client_id; client_id is highly selective so MySQL
//     will seek directly to this client's rows and filter salon_id cheaply.
//     COUNT(*) OVER() gives the pagination total in the same round-trip.
//
//   Query 2 — services for all returned booking IDs
//     WHERE booking_id IN (…)
//     Uses the PK (booking_id, service_id) — pure index scan, no heap reads.
//     Single round-trip regardless of how many bookings are returned.
//     Per-service staff is fetched here (booking_services.staff_id override),
//     not from bookings.staff_id, so multi-staff appointments are accurate.
//
// Why not a single JOIN with GROUP_CONCAT?
//   GROUP_CONCAT truncates at group_concat_max_len (default 1024 bytes) and
//   requires post-parsing JSON in application code.  Two clean queries are
//   faster, more readable, and give typed rows without any string parsing.
// ---------------------------------------------------------------------------
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);

    const salonId = searchParams.get("salon_id") || searchParams.get("salonId");

    if (!salonId) {
      return error({ code: "MISSING_SALON", message: "salonId is required" }, 400);
    }

    // ── Access control ────────────────────────────────────────────────────
    const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden("Not authorized to view bookings for this salon");
    }

    // ── Validate client belongs to this salon ─────────────────────────────
    // Prevents leaking booking history for a client_id that exists in users
    // but has never visited this salon.
    const relationship = await getOne(
      "SELECT client_id FROM salon_clients WHERE salon_id = ? AND client_id = ?",
      [salonId, clientId],
    );
    if (!relationship) {
      return notFound("Client not found in this salon");
    }

    // ── Pagination ────────────────────────────────────────────────────────
    const page   = Math.max(1, parseInt(searchParams.get("page")  || "1",  10));
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    // ── Query 1: bookings ─────────────────────────────────────────────────
    //
    // Staff name is taken from the bookings.staff_id (primary staff).
    // Per-service staff overrides are resolved in Query 2.
    //
    // Columns:
    //   b.id, b.start_datetime, b.end_datetime, b.status, b.source,
    //   b.notes, b.created_at, b.cancelled_at, b.cancellation_reason,
    //   st.id / first_name / last_name  (primary staff)
    //   COUNT(*) OVER()  (pagination total — no second round-trip)
    const bookings = await query(
      `SELECT
          b.id,
          b.start_datetime,
          b.end_datetime,
          b.status,
          b.source,
          b.notes,
          b.created_at,
          b.cancelled_at,
          b.cancellation_reason,
          st.id         AS staff_id,
          st.first_name AS staff_first_name,
          st.last_name  AS staff_last_name,
          COUNT(*) OVER() AS total
        FROM bookings b
        LEFT JOIN staff st ON st.id = b.staff_id
       WHERE b.client_id  = ?
         AND b.salon_id   = ?
         AND b.deleted_at IS NULL
       ORDER BY b.start_datetime DESC
       LIMIT ? OFFSET ?`,
      [clientId, salonId, limit, offset],
    );

    const total = bookings.length > 0 ? Number(bookings[0].total) : 0;

    if (bookings.length === 0) {
      return success({
        bookings: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    // ── Query 2: services for all returned bookings ───────────────────────
    //
    // Single IN() query — the PK (booking_id, service_id) covers this lookup
    // entirely. No heap reads, no additional index lookups.
    //
    // booking_services.staff_id is the per-service staff override.
    // It is NULL when the service was performed by the booking's primary staff
    // (the common case for single-staff salons), in which case we fall back to
    // the primary staff stored on the booking row.
    const bookingIds = bookings.map((b) => b.id);

    // Guard: all IDs must be positive integers — prevents injection through
    // a corrupted DB value reaching the IN() clause.
    if (!bookingIds.every((id) => Number.isInteger(Number(id)) && Number(id) > 0)) {
      throw new Error("Invalid booking IDs detected");
    }

    const services = await query(
      `SELECT
          bs.booking_id,
          bs.price,
          bs.duration_minutes,
          sv.id         AS service_id,
          sv.name       AS service_name,
          bs.staff_id   AS service_staff_id,
          st.first_name AS service_staff_first_name,
          st.last_name  AS service_staff_last_name
        FROM booking_services bs
        JOIN  services sv ON sv.id  = bs.service_id
        LEFT JOIN staff st ON st.id = bs.staff_id
       WHERE bs.booking_id IN (${bookingIds.map(() => "?").join(",")})`,
      bookingIds,
    );

    // Group services by booking_id in O(n) — one pass, no nested loops.
    const servicesByBooking = new Map();
    for (const svc of services) {
      const list = servicesByBooking.get(svc.booking_id) ?? [];
      list.push(svc);
      servicesByBooking.set(svc.booking_id, list);
    }

    // ── Assemble response ─────────────────────────────────────────────────
    const result = bookings.map((b) => {
      const svcs = servicesByBooking.get(b.id) ?? [];

      // Total price: sum of price snapshots stored at booking time.
      // These are immutable — they reflect what the client actually paid,
      // not the service's current price (which may have changed since).
      const totalPrice = svcs.reduce((sum, s) => sum + parseFloat(s.price || 0), 0);

      return {
        id:         b.id,
        startDatetime: String(b.start_datetime).replace(" ", "T"),
        endDatetime:   String(b.end_datetime).replace(" ", "T"),
        status:     b.status,
        source:     b.source,
        notes:      b.notes ?? null,
        createdAt:  b.created_at,
        cancelledAt: b.cancelled_at ?? null,
        cancellationReason: b.cancellation_reason ?? null,
        totalPrice: parseFloat(totalPrice.toFixed(2)),

        // Primary staff (books.staff_id) — who the appointment is under
        staff: b.staff_id
          ? {
              id:        b.staff_id,
              firstName: b.staff_first_name,
              lastName:  b.staff_last_name,
            }
          : null,

        // One entry per service line — price/duration are the immutable
        // snapshots stored at booking creation time, not current live values.
        services: svcs.map((s) => ({
          id:              s.service_id,
          name:            s.service_name,
          price:           parseFloat(s.price),
          durationMinutes: s.duration_minutes,
          // Per-service staff override — null means primary staff performed it
          staff: s.service_staff_id
            ? {
                id:        s.service_staff_id,
                firstName: s.service_staff_first_name,
                lastName:  s.service_staff_last_name,
              }
            : null,
        })),
      };
    });

    return success({
      bookings: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Client booking history error:", err);
    return error(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch booking history" },
      500,
    );
  }
}
