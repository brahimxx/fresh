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
 * @param {Array}   data.services           [{ serviceId, staffId?, price, duration, bufferTime? }]
 *                    staffId defaults to primaryStaffId when omitted.
 * @param {string}  [data.notes]
 * @param {string}  [data.status]           'pending' | 'confirmed' (default: 'confirmed')
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
  status = "confirmed",
  source = "direct",
  isMarketplaceEnabled = false,
  discountCode = null,
  giftCardCode = null,
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
    // Price snapshots must be non-negative — a negative price would corrupt totals
    if (parseFloat(svc.price ?? 0) < 0) {
      throw new BookingError(
        "INVALID_PRICE",
        `Service #${svc.serviceId} has an invalid price`,
        400,
      );
    }
  }

  // Compute total duration and buffer from the services array — this is authoritative.
  // The caller's endDatetime is intentionally ignored: a malicious or stale
  // client could send start=10:00, end=23:00 to block the whole day.
  const totalDuration = services.reduce(
    (sum, s) => sum + Number(s.duration || 0),
    0,
  );
  const totalBuffer = services.reduce(
    (sum, s) => sum + Number(s.bufferTime || 0),
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
  // Derive endDate from DB duration + buffer — never parse the caller's endDatetime.
  const startDate = parseMySQLDatetime(startDatetime);

  if (!startDate)
    throw new BookingError(
      "INVALID_DATETIME",
      "Invalid startDatetime — expected YYYY-MM-DD HH:MM:SS",
      400,
    );

  const endDate = new Date(startDate.getTime() + (totalDuration + totalBuffer) * 60000);

  // Explicit start < end assertion (implicit from totalDuration > 0, but made
  // explicit so any future code path that changes duration logic fails loudly).
  if (endDate <= startDate) {
    throw new BookingError(
      "INVALID_DURATION",
      "Computed end time is not after start time",
      400,
    );
  }

  // Reject bookings that start more than 24 h in the past — catches clocks
  // skewed by timezone bugs or stale retries, without blocking same-day
  // retrospective corrections a receptionist might legitimately need.
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  if (startDate.getTime() < Date.now() - ONE_DAY_MS) {
    throw new BookingError(
      "DATETIME_TOO_FAR_IN_PAST",
      "Booking start time cannot be more than 24 hours in the past",
      400,
    );
  }

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

  // ── Step 2b: Staff–service authorisation (batch) ───────────────────────
  //
  // Build a single query covering all unique (effectiveStaffId, serviceId) pairs.
  // This replaces the previous serial loop (1 query per service → 1 query total).

  const svcPairs = services.map((svc) => ({
    staffId:   Number(svc.staffId || primaryStaffId),
    serviceId: Number(svc.serviceId),
  }));
  // Deduplicate (same pair can appear if client sends duplicates)
  const uniquePairs = [...new Map(svcPairs.map((p) => [`${p.staffId}:${p.serviceId}`, p])).values()];

  if (uniquePairs.length > 0) {
    const whereClauses = uniquePairs.map(() => "(staff_id = ? AND service_id = ?)").join(" OR ");
    const [ssRows] = await pool.execute(
      `SELECT staff_id, service_id FROM service_staff WHERE ${whereClauses}`,
      uniquePairs.flatMap((p) => [p.staffId, p.serviceId]),
    );
    const found = new Set(ssRows.map((r) => `${r.staff_id}:${r.service_id}`));
    for (const { staffId: sId, serviceId: svId } of uniquePairs) {
      if (!found.has(`${sId}:${svId}`)) {
        throw new BookingError(
          "STAFF_SERVICE_MISMATCH",
          `Staff #${sId} is not authorised to perform service #${svId}`,
          400,
        );
      }
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
    
    // ── Step 5.5: Discounts & Gift Cards (locked read & atomic update) ──
    let amountSaved = 0;
    let appliedDiscount = null;

    if (discountCode) {
      const [discountRows] = await conn.execute(
        `SELECT id, type, value, min_purchase, max_discount, max_uses, current_uses
           FROM discounts
          WHERE salon_id = ?
            AND code = ?
            AND is_active = 1
            AND (start_date IS NULL OR start_date <= CURDATE())
            AND (end_date IS NULL OR end_date >= CURDATE())
          FOR UPDATE`,
        [salonId, discountCode]
      );

      appliedDiscount = discountRows[0];
      if (!appliedDiscount) {
        throw new BookingError("INVALID_DISCOUNT", "The provided discount code is invalid or expired", 400);
      }

      if (appliedDiscount.max_uses && appliedDiscount.current_uses >= appliedDiscount.max_uses) {
        throw new BookingError("DISCOUNT_LIMIT_REACHED", "This discount code has reached its maximum usage limit", 400);
      }

      const minPurchase = parseFloat(appliedDiscount.min_purchase || 0);
      if (minPurchase > 0 && totalPrice < minPurchase) {
        throw new BookingError("DISCOUNT_MIN_PURCHASE", `Minimum purchase of ${minPurchase} required to use this code`, 400);
      }

      if (appliedDiscount.type === 'fixed') {
        amountSaved = Math.min(parseFloat(appliedDiscount.value), totalPrice);
      } else {
        amountSaved = totalPrice * (parseFloat(appliedDiscount.value) / 100);
      }

      const maxDiscount = parseFloat(appliedDiscount.max_discount || 0);
      if (maxDiscount > 0 && amountSaved > maxDiscount) {
        amountSaved = maxDiscount;
      }
    }

    let giftCardAmountUsed = 0;
    let appliedGiftCard = null;
    const totalAfterDiscount = totalPrice - amountSaved;

    if (giftCardCode && totalAfterDiscount > 0) {
      const [gcRows] = await conn.execute(
        `SELECT id, remaining_balance
           FROM gift_cards
          WHERE code = ?
            AND status = 'active'
            AND remaining_balance > 0
            AND (expires_at IS NULL OR expires_at > NOW())
          FOR UPDATE`,
        [giftCardCode]
      );

      appliedGiftCard = gcRows[0];
      if (!appliedGiftCard) {
        throw new BookingError("INVALID_GIFT_CARD", "The provided gift card is invalid, expired, or depleted", 400);
      }

      const balance = parseFloat(appliedGiftCard.remaining_balance);
      giftCardAmountUsed = Math.min(balance, totalAfterDiscount);
    }
    
    const finalAmountDue = Math.max(0, totalAfterDiscount - giftCardAmountUsed);

    // ── Step 6: Insert booking row ────────────────────────────────────────

    const [bookingResult] = await conn.execute(
      `INSERT INTO bookings
         (salon_id, client_id, staff_id, start_datetime, end_datetime,
          status, source, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [salonId, clientId, primaryStaffId, startFmt, endFmt, status, source, notes],
    );

    const bookingId = bookingResult.insertId;

    // Insert all booking_services in one multi-row statement instead of a
    // serial loop — N round-trips → 1 round-trip regardless of service count.
    const bsRows = services.map((svc) => [
      bookingId,
      svc.serviceId,
      svc.staffId || primaryStaffId,
      svc.price,
      svc.duration,
    ]);
    const bsPlaceholders = bsRows.map(() => "(?, ?, ?, ?, ?)").join(", ");
    await conn.execute(
      `INSERT INTO booking_services
         (booking_id, service_id, staff_id, price, duration_minutes)
       VALUES ${bsPlaceholders}`,
      bsRows.flat(),
    );

    // Insert discount record and update usage
    if (appliedDiscount) {
      await conn.execute(
        `INSERT INTO booking_discounts
           (booking_id, discount_id, discount_code, discount_type, discount_value, amount_saved)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [bookingId, appliedDiscount.id, discountCode, appliedDiscount.type, appliedDiscount.value, amountSaved.toFixed(2)]
      );

      await conn.execute(
        `UPDATE discounts SET current_uses = current_uses + 1 WHERE id = ?`,
        [appliedDiscount.id]
      );
    }

    // Insert gift card record and update balance
    if (appliedGiftCard) {
      await conn.execute(
        `INSERT INTO booking_gift_cards
           (booking_id, gift_card_id, amount_used)
         VALUES (?, ?, ?)`,
        [bookingId, appliedGiftCard.id, giftCardAmountUsed.toFixed(2)]
      );

      await conn.execute(
        `UPDATE gift_cards
            SET remaining_balance = remaining_balance - ?,
                status = CASE WHEN remaining_balance - ? <= 0 THEN 'used' ELSE status END
          WHERE id = ?`,
        [giftCardAmountUsed.toFixed(2), giftCardAmountUsed.toFixed(2), appliedGiftCard.id]
      );
    }

    // Upsert salon_clients atomically — eliminates the SELECT + branch:
    //   affectedRows = 1 → new row inserted (new client)
    //   affectedRows = 2 → duplicate key, existing row updated
    const [scResult] = await conn.execute(
      `INSERT INTO salon_clients
         (salon_id, client_id, first_visit_date, last_visit_date, total_visits, is_active)
       VALUES (?, ?, NOW(), NOW(), 1, 1)
       ON DUPLICATE KEY UPDATE
         is_active       = 1,
         last_visit_date = NOW(),
         total_visits    = total_visits + 1`,
      [salonId, clientId],
    );

    const isNewClient = scResult.affectedRows === 1;

    // Platform acquisition fee for first-time marketplace clients
    if (isNewClient && source === "marketplace" && isMarketplaceEnabled) {
      await conn.execute(
        `INSERT INTO platform_fees
           (booking_id, salon_id, type, amount, is_paid)
         VALUES (?, ?, 'new_client', ?, 0)`,
        [bookingId, salonId, (totalPrice * 0.2).toFixed(2)],
      );
    }

    // ── Step 7: Commit ────────────────────────────────────────────────────
    await conn.commit();

    return { 
      bookingId, 
      totalPrice, 
      totalDuration, 
      isNewClient,
      discountAmount: amountSaved,
      giftCardAmountUsed,
      finalAmountDue
    };
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
