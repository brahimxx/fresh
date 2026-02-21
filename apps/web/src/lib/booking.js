/**
 * booking.js — Core booking creation logic.
 *
 * createSafeBooking() is the single authoritative entry point for ALL booking
 * creation in the platform (dashboard, widget, public API).  It guarantees:
 *
 *   1. Input is fully validated before any DB work.
 *   2. Staff working hours are checked (fast-fail, outside the transaction).
 *   3. A single MySQL transaction wraps every remaining check + insert.
 *   4. SELECT … FOR UPDATE locks conflicting rows so two concurrent requests
 *      cannot both pass the overlap check and both commit.
 *   5. Staff time-off is checked INSIDE the transaction (it can change
 *      concurrently, unlike working hours which are static config).
 *   6. The booking row and all related rows are inserted atomically.
 *   7. On any failure the transaction is always rolled back and the connection
 *      is always released back to the pool.
 *
 * Callers receive a typed BookingError on expected failures (conflict, unavailable,
 * invalid input) and a plain Error on unexpected DB failures.  Both are safe to
 * catch and convert to HTTP responses.
 */

import pool from "@/lib/db";

// ---------------------------------------------------------------------------
// BookingError — typed error for expected booking failures
// ---------------------------------------------------------------------------

export class BookingError extends Error {
  /**
   * @param {string} code        Machine-readable error code (e.g. 'BOOKING_CONFLICT')
   * @param {string} message     Human-readable message safe to show the client
   * @param {number} httpStatus  Suggested HTTP status code (default 409 Conflict)
   */
  constructor(code, message, httpStatus = 409) {
    super(message);
    this.name = "BookingError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// ---------------------------------------------------------------------------
// createSafeBooking
// ---------------------------------------------------------------------------

/**
 * Atomically create a booking with full safety guarantees.
 *
 * @param {object}  data
 * @param {number}  data.salonId
 * @param {number}  data.clientId
 * @param {number}  data.primaryStaffId     Primary staff on the bookings row
 * @param {string}  data.startDatetime      "YYYY-MM-DD HH:MM:SS" — local business time
 * @param {string}  data.endDatetime        "YYYY-MM-DD HH:MM:SS" — local business time
 * @param {Array}   data.services           [{ serviceId, staffId?, price, duration }]
 *                    staffId defaults to primaryStaffId when omitted.
 * @param {string}  [data.notes]
 * @param {string}  [data.source]           'marketplace' | 'direct' | 'widget'
 * @param {boolean} [data.isMarketplaceEnabled]  Whether to create platform_fees row
 *
 * @returns {{ bookingId: number, totalPrice: number, totalDuration: number, isNewClient: boolean }}
 * @throws  {BookingError}  on expected failures (conflict, unavailable, validation)
 * @throws  {Error}         on unexpected DB / infrastructure failures
 */
export async function createSafeBooking({
  salonId,
  clientId,
  primaryStaffId,
  startDatetime,
  endDatetime,
  services,
  notes = null,
  source = "direct",
  isMarketplaceEnabled = false,
}) {
  // ── Step 1: Input validation ──────────────────────────────────────────────

  if (!salonId || !clientId || !primaryStaffId || !startDatetime) {
    throw new BookingError(
      "MISSING_FIELDS",
      "salonId, clientId, primaryStaffId, and startDatetime are all required",
      400,
    );
  }

  if (!Array.isArray(services) || services.length === 0) {
    throw new BookingError(
      "NO_SERVICES",
      "At least one service is required",
      400,
    );
  }

  for (const svc of services) {
    if (!svc.serviceId) {
      throw new BookingError(
        "INVALID_SERVICE",
        "Each service must have a serviceId",
        400,
      );
    }
  }

  // Compute total duration from the services array — this is authoritative.
  // The caller's endDatetime is intentionally ignored: a malicious or stale
  // client could send start=10:00, end=23:00 to block the whole day.
  const totalDuration = services.reduce(
    (sum, s) => sum + Number(s.duration || 0),
    0,
  );
  const totalPrice = services.reduce(
    (sum, s) => sum + parseFloat(s.price || 0),
    0,
  );

  if (totalDuration <= 0) {
    throw new BookingError(
      "INVALID_DURATION",
      "Total service duration must be greater than 0",
      400,
    );
  }

  // Parse startDatetime as LOCAL calendar time (no trailing Z → not UTC).
  // Derive endDate from DB duration — never parse the caller's endDatetime.
  const startDate = parseMySQLDatetime(startDatetime);

  if (!startDate)
    throw new BookingError(
      "INVALID_DATETIME",
      "Invalid startDatetime — expected YYYY-MM-DD HH:MM:SS",
      400,
    );

  const endDate = new Date(startDate.getTime() + totalDuration * 60000);

  // Canonical "YYYY-MM-DD HH:MM:SS" strings used in every query parameter.
  // Use local-time getters (not toISOString) to avoid UTC offset shifts.
  const pad = (n) => String(n).padStart(2, "0");
  const startFmt = startDatetime.slice(0, 19).replace("T", " ");
  const endFmt = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())} ${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:${pad(endDate.getSeconds())}`;

  // Collect every unique staff member involved (primary + per-service overrides)
  const staffIds = [
    ...new Set([
      Number(primaryStaffId),
      ...services
        .map((s) => s.staffId)
        .filter(Boolean)
        .map(Number),
    ]),
  ];

  // ── Step 2: Working hours check (fast-fail, outside transaction) ──────────
  //
  // Working hours are static salon configuration — they never change during
  // the window of a booking request, so locking them is unnecessary overhead.
  // Running this check here lets us return a clear error before opening a
  // transaction and acquiring locks.

  const dayOfWeek = startDate.getDay(); // 0 = Sunday … 6 = Saturday
  const startTime = toTimeString(startDate); // "HH:MM:SS" from parsed local datetime
  const endTime = toTimeString(endDate);

  for (const staffId of staffIds) {
    const [whRows] = await pool.execute(
      `SELECT start_time, end_time
         FROM staff_working_hours
        WHERE staff_id = ?
          AND day_of_week = ?
        LIMIT 1`,
      [staffId, dayOfWeek],
    );

    const wh = whRows[0];

    if (!wh) {
      throw new BookingError(
        "STAFF_NOT_WORKING",
        `Staff #${staffId} does not have working hours set for this day`,
        409,
      );
    }

    // "HH:MM:SS" string comparison is lexicographically correct.
    // Split into two branches so the message describes the exact problem.
    if (startTime < wh.start_time) {
      throw new BookingError(
        "OUTSIDE_WORKING_HOURS",
        `Staff #${staffId} doesn't start working until ${formatTime(wh.start_time)}. ` +
          `Please choose a time at or after ${formatTime(wh.start_time)}.`,
        409,
      );
    }
    if (endTime > wh.end_time) {
      throw new BookingError(
        "SERVICE_EXCEEDS_SHIFT",
        `This service would end at ${formatTime(endTime)}, but staff #${staffId}'s shift ends at ${formatTime(wh.end_time)}. ` +
          `Please choose an earlier start time.`,
        409,
      );
    }
  }

  // ── Step 2b: Staff–service authorisation ─────────────────────────────────
  //
  // Each service must be explicitly assigned to the staff member who will
  // perform it.  We verify this in service_staff BEFORE opening a transaction
  // so we fail fast without ever acquiring locks.
  //
  // This is the authoritative check — it runs regardless of which route calls
  // createSafeBooking, so no caller can bypass it by omitting its own guard.

  for (const svc of services) {
    const effectiveStaffId = svc.staffId || primaryStaffId;

    const [ssRows] = await pool.execute(
      `SELECT 1 FROM service_staff
        WHERE service_id = ? AND staff_id = ?
        LIMIT 1`,
      [svc.serviceId, effectiveStaffId],
    );

    if (ssRows.length === 0) {
      throw new BookingError(
        "STAFF_SERVICE_MISMATCH",
        `Staff #${effectiveStaffId} is not authorised to perform service #${svc.serviceId}`,
        400,
      );
    }
  }

  // ── Steps 3–7: Transaction with row locking ───────────────────────────────
  //
  // A single connection is held for the duration of the transaction so that
  // our FOR UPDATE locks are visible to the same session.

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // ── Step 3: Booking conflict — SELECT … FOR UPDATE ────────────────────
    //
    // FOR UPDATE places an exclusive row lock on every row that matches the
    // WHERE clause.  Any concurrent transaction attempting to lock the same
    // rows (i.e. a second request for the same staff+time) will BLOCK until
    // our transaction commits or rolls back.  This is the mechanism that
    // makes double-booking under concurrency impossible.
    //
    // Overlap formula (the canonical two-interval overlap test):
    //   existing.start_datetime < new_end
    //   AND existing.end_datetime > new_start
    //
    // We check BOTH bookings.staff_id (primary staff assignment) AND
    // booking_services.staff_id (per-service staff assignment) so that widget
    // bookings (which store staff on booking_services) and dashboard bookings
    // (which store staff on bookings) are both caught.
    //
    // Only active bookings block time: status IN ('pending','confirmed')
    // AND deleted_at IS NULL.

    for (const staffId of staffIds) {
      const [conflicts] = await conn.execute(
        `SELECT b.id
           FROM bookings b
          WHERE b.status IN ('pending', 'confirmed')
            AND b.deleted_at IS NULL
            AND b.start_datetime < ?
            AND b.end_datetime   > ?
            AND (
                  b.staff_id = ?
                  OR EXISTS (
                    SELECT 1
                      FROM booking_services bs
                     WHERE bs.booking_id = b.id
                       AND bs.staff_id   = ?
                  )
                )
          FOR UPDATE`,
        [endFmt, startFmt, staffId, staffId],
      );

      if (conflicts.length > 0) {
        throw new BookingError(
          "BOOKING_CONFLICT",
          `Staff #${staffId} already has a booking that overlaps ${formatTime(startTime)}–${formatTime(endTime)}`,
          409,
        );
      }
    }

    // ── Step 4: Staff time off (inside transaction) ───────────────────────
    //
    // Time off can be granted by an admin concurrently with a client booking,
    // so it MUST be checked inside the transaction (not before it).
    //
    // Overlap formula: time_off.start < booking.end AND time_off.end > booking.start

    for (const staffId of staffIds) {
      const [leaveRows] = await conn.execute(
        `SELECT id
           FROM staff_time_off
          WHERE staff_id       = ?
            AND start_datetime < ?
            AND end_datetime   > ?
          LIMIT 1`,
        [staffId, endFmt, startFmt],
      );

      if (leaveRows.length > 0) {
        throw new BookingError(
          "STAFF_ON_LEAVE",
          `Staff #${staffId} is on approved time off during this period`,
          409,
        );
      }
    }

    // ── Step 5: Working hours already validated pre-transaction (Step 2) ──

    // ── Step 6: Insert booking row ────────────────────────────────────────

    const [bookingResult] = await conn.execute(
      `INSERT INTO bookings
         (salon_id, client_id, staff_id, start_datetime, end_datetime,
          status, source, notes, created_at)
       VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, NOW())`,
      [salonId, clientId, primaryStaffId, startFmt, endFmt, source, notes],
    );

    const bookingId = bookingResult.insertId;

    // Insert booking_services — each service with its own staff assignment.
    // Defaults to primaryStaffId when the service has no per-service override.
    for (const svc of services) {
      await conn.execute(
        `INSERT INTO booking_services
           (booking_id, service_id, staff_id, price, duration_minutes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          bookingId,
          svc.serviceId,
          svc.staffId || primaryStaffId,
          svc.price,
          svc.duration,
        ],
      );
    }

    // Upsert salon_clients — track whether this client is new to this salon
    const [existingRows] = await conn.execute(
      `SELECT salon_id
         FROM salon_clients
        WHERE salon_id  = ?
          AND client_id = ?
        LIMIT 1`,
      [salonId, clientId],
    );

    const isNewClient = existingRows.length === 0;

    if (isNewClient) {
      await conn.execute(
        `INSERT INTO salon_clients
           (salon_id, client_id, first_visit_date, last_visit_date, total_visits)
         VALUES (?, ?, NOW(), NOW(), 1)`,
        [salonId, clientId],
      );

      // Platform acquisition fee for new clients via marketplace
      if (source === "marketplace" && isMarketplaceEnabled) {
        await conn.execute(
          `INSERT INTO platform_fees
             (booking_id, salon_id, type, amount, is_paid)
           VALUES (?, ?, 'new_client', ?, 0)`,
          [bookingId, salonId, (totalPrice * 0.2).toFixed(2)],
        );
      }
    } else {
      await conn.execute(
        `UPDATE salon_clients
            SET last_visit_date = NOW(),
                total_visits    = total_visits + 1
          WHERE salon_id  = ?
            AND client_id = ?`,
        [salonId, clientId],
      );
    }

    // ── Step 7: Commit ────────────────────────────────────────────────────
    await conn.commit();

    return { bookingId, totalPrice, totalDuration, isNewClient };
  } catch (err) {
    // Always rollback on ANY error — BookingError (expected) or DB error (unexpected).
    // This guarantees the transaction is never left open.
    await conn.rollback();
    throw err;
  } finally {
    // Always return the connection to the pool, even if rollback itself threw.
    conn.release();
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Parse "YYYY-MM-DD HH:MM:SS" (or ISO-8601) as a LOCAL calendar Date.
 * We avoid treating the string as UTC (no trailing Z) so that getDay() and
 * time comparisons against staff_working_hours (stored in local business time)
 * are always correct regardless of the Node.js server's timezone setting.
 *
 * @param   {string} str
 * @returns {Date|null}
 */
function parseMySQLDatetime(str) {
  if (!str) return null;
  // Accept both "YYYY-MM-DD HH:MM:SS" and ISO-8601 with/without Z
  const normalised = String(str)
    .trim()
    .replace("T", " ")
    .replace("Z", "")
    .slice(0, 19);
  const match = normalised.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const d = new Date(year, month - 1, day, hour, minute, second);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Extract "HH:MM:SS" from a Date without any timezone conversion.
 * @param {Date} date
 * @returns {string}
 */
function toTimeString(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * Format "HH:MM:SS" → "HH:MM" for human-readable error messages.
 * @param {string} t
 * @returns {string}
 */
function formatTime(t) {
  return String(t).slice(0, 5);
}
