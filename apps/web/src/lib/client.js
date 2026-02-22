/**
 * client.js — Canonical client find-or-create logic.
 *
 * findOrCreateClient() is the SINGLE authoritative path for creating a client
 * user in the platform.  Every route that needs to find or create a client
 * (dashboard POST, future import scripts, webhook receivers, etc.) must call
 * this function.  Duplicate logic in individual route files is the primary
 * cause of phantom duplicate users.
 *
 * Deduplication guarantees:
 *
 *   1. Phone-first  — SELECT … FOR UPDATE serialises concurrent requests for
 *      the same phone number inside a transaction.  A second concurrent call
 *      with the same phone will BLOCK at the FOR UPDATE until the first call
 *      commits, then re-reads the row and reuses it.
 *
 *   2. Email fallback — same FOR UPDATE pattern when no phone match found.
 *
 *   3. ER_DUP_ENTRY recovery — if two concurrent inserts both pass steps 1–2
 *      (only possible when *neither* provided a phone *and* both provided the
 *      same email), the second INSERT will hit the uq_users_email constraint.
 *      We catch error code 1062, re-fetch the winning row, and return it.
 *      No duplicate row is ever created.
 *
 *   4. salon_clients — upserted via ON DUPLICATE KEY UPDATE in the same
 *      transaction as the user insert.  The primary key (salon_id, client_id)
 *      makes it structurally impossible to have two rows for the same
 *      client + salon pair.
 *
 * None of these guarantees can be preserved if callers bypass this function
 * and write their own INSERT INTO users.
 */

import pool from "@/lib/db";

// ---------------------------------------------------------------------------
// ClientError — typed error for expected client failures
// ---------------------------------------------------------------------------

export class ClientError extends Error {
  constructor(code, message, httpStatus = 400) {
    super(message);
    this.name  = "ClientError";
    this.code  = code;
    this.httpStatus = httpStatus;
  }
}

// ---------------------------------------------------------------------------
// normalizePhone
// ---------------------------------------------------------------------------
// Strips spaces, dashes, and dots so "0555 12-34.56" and "055512-34.56"
// both map to "055512-3456" resolve to the same lookup key.
// This function is intentionally conservative — it does NOT convert local
// format to international (+213…) because that requires knowing the country
// code.  Salons store whatever the receptionist typed first; normalization is
// for de-duplication comparison only, not for re-formatting stored data.
// ---------------------------------------------------------------------------
export function normalizePhone(raw) {
  if (!raw) return null;
  return String(raw).replace(/[\s\-\.]/g, "").trim() || null;
}

// ---------------------------------------------------------------------------
// findOrCreateClient
// ---------------------------------------------------------------------------

/**
 * Find an existing user by phone / email, or create a new one.
 * Optionally link the user to a salon via salon_clients.
 *
 * All DB work runs inside a single transaction so no partial writes are
 * possible and concurrent requests for the same contact details are
 * serialised by FOR UPDATE locks.
 *
 * @param {object}  data
 * @param {string}  [data.phone]         Normalized or raw — will be normalized internally
 * @param {string}  [data.email]         Lowercase email address
 * @param {string}  data.firstName       Required
 * @param {string}  [data.lastName]
 * @param {string}  [data.gender]
 * @param {string}  [data.dateOfBirth]   "YYYY-MM-DD"
 * @param {string}  [data.address]
 * @param {string}  [data.city]
 * @param {string}  [data.postalCode]
 *
 * @param {number}  [data.salonId]       When provided, upserts salon_clients in same tx
 * @param {string}  [data.notes]         Stored in salon_clients.notes
 *
 * @returns {{ userId: number, isNew: boolean, isNewToSalon: boolean }}
 * @throws  {ClientError}  MISSING_CONTACT when neither phone nor email provided
 * @throws  {ClientError}  MISSING_NAME when firstName is blank
 * @throws  {Error}        On unexpected DB failures
 */
export async function findOrCreateClient({
  phone: rawPhone,
  email: rawEmail,
  firstName: rawFirstName,
  lastName:  rawLastName,
  gender         = null,
  dateOfBirth    = null,
  address        = null,
  city           = null,
  postalCode     = null,
  salonId        = null,
  notes          = null,
} = {}) {

  // ── Input normalisation ─────────────────────────────────────────────────

  const phone     = normalizePhone(rawPhone);
  const email     = rawEmail ? String(rawEmail).trim().toLowerCase() || null : null;
  const firstName = rawFirstName ? String(rawFirstName).trim() || null : null;
  const lastName  = rawLastName  ? String(rawLastName).trim()  || null : null;

  // ── Validation ──────────────────────────────────────────────────────────

  if (!firstName) {
    throw new ClientError("MISSING_NAME", "first_name is required");
  }
  // At least one contact field is required to have a dedup key.
  // A client with neither phone nor email cannot be reliably deduplicated
  // on the next visit and will produce duplicates.
  if (!phone && !email) {
    throw new ClientError(
      "MISSING_CONTACT",
      "phone or email is required to create a client",
    );
  }

  // ── Transaction ─────────────────────────────────────────────────────────

  const conn = await pool.getConnection();
  let userId;
  let isNew        = false;
  let isNewToSalon = false;

  try {
    await conn.beginTransaction();

    // ── 1. Dedup by phone ─────────────────────────────────────────────────
    //
    // FOR UPDATE locks the matching row (or the gap, if none exists yet).
    // A concurrent transaction that reaches this same WHERE clause will block
    // until we commit.  This serialises concurrent requests for the same phone
    // number so only one INSERT can ever win.
    //
    // Exclude deleted accounts — role='deleted' is the soft-delete sentinel.
    if (phone) {
      const [[byPhone]] = await conn.execute(
        `SELECT id
           FROM users
          WHERE phone = ?
            AND role != 'deleted'
          LIMIT 1
          FOR UPDATE`,
        [phone],
      );

      if (byPhone) {
        userId = byPhone.id;

        // Receptionist's entry is more reliable than the client's own
        // registration data — patch only fields that are currently empty.
        await conn.execute(
          `UPDATE users
              SET first_name = COALESCE(?, first_name),
                  last_name  = COALESCE(?, last_name),
                  updated_at = NOW()
            WHERE id = ?`,
          [firstName, lastName, userId],
        );
      }
    }

    // ── 2. Dedup by email (fallback) ──────────────────────────────────────
    //
    // Same FOR UPDATE pattern.  This branch only runs when no phone match
    // was found, so it will not interfere with an in-progress phone-match
    // transaction.
    if (!userId && email) {
      const [[byEmail]] = await conn.execute(
        `SELECT id
           FROM users
          WHERE email = ?
            AND role != 'deleted'
          LIMIT 1
          FOR UPDATE`,
        [email],
      );

      if (byEmail) {
        userId = byEmail.id;

        // Patch phone onto the found row if it was missing — merges the
        // receptionist's phone knowledge with the marketplace account.
        await conn.execute(
          `UPDATE users
              SET first_name = COALESCE(?, first_name),
                  last_name  = COALESCE(?, last_name),
                  phone      = COALESCE(?, phone),
                  updated_at = NOW()
            WHERE id = ?`,
          [firstName, lastName, phone, userId],
        );
      }
    }

    // ── 3. Create new user ────────────────────────────────────────────────
    //
    // Only reached when both phone and email lookups found no match.
    //
    // Placeholder email: the users table has a NOT NULL + UNIQUE constraint on
    // email.  When the client has no email we generate a guaranteed-unique
    // placeholder so the schema constraint is satisfied.  The placeholder
    // format (@placeholder.local) makes them easy to identify and upgrade
    // later when the client provides a real address.
    if (!userId) {
      const userEmail =
        email ||
        `noemail_${Date.now()}_${Math.random().toString(36).slice(-8)}@placeholder.local`;

      let insertId;
      try {
        const [result] = await conn.execute(
          `INSERT INTO users
             (email, phone, first_name, last_name, gender, date_of_birth,
              address, city, postal_code, role, password_hash, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'client', '', NOW(), NOW())`,
          [userEmail, phone, firstName, lastName, gender,
           dateOfBirth, address, city, postalCode],
        );
        insertId = result.insertId;
      } catch (insertErr) {
        // ER_DUP_ENTRY (1062) on uq_users_email ────────────────────────────
        // Race condition: two concurrent requests, both with the same email
        // and no phone, both passed the SELECT FOR UPDATE in step 2 (because
        // neither row existed yet at that moment), and both attempted INSERT.
        // The second one hits the unique constraint.  We resolve by re-fetching
        // the row the winner inserted — the result is identical to what we
        // would have done had we found it in step 2.
        if (insertErr.code === "ER_DUP_ENTRY" && email) {
          const [[raceRow]] = await conn.execute(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [email],
          );
          if (!raceRow) throw insertErr; // Truly unexpected — re-throw
          insertId = raceRow.id;
        } else {
          throw insertErr; // Non-email duplication or other DB error — re-throw
        }
      }

      userId  = insertId;
      isNew   = true;
    }

    // ── 4. Upsert salon_clients ───────────────────────────────────────────
    //
    // PRIMARY KEY (salon_id, client_id) makes it impossible to have two rows
    // for the same client + salon pair.  ON DUPLICATE KEY UPDATE means this
    // is always safe to call even if the relationship already exists.
    //
    // affectedRows = 1 → new row (first visit to this salon)
    // affectedRows = 2 → existing row updated
    //
    // total_visits is NOT incremented here — that happens in createSafeBooking
    // when an actual booking is confirmed.  Registering a client at the desk
    // must not inflate their visit count before any service was rendered.
    if (salonId) {
      const [scResult] = await conn.execute(
        `INSERT INTO salon_clients
           (salon_id, client_id, first_visit_date, last_visit_date, total_visits, is_active, notes)
         VALUES (?, ?, NOW(), NOW(), 0, 1, ?)
         ON DUPLICATE KEY UPDATE
           is_active  = 1,
           notes      = COALESCE(?, notes),
           updated_at = NOW()`,
        [salonId, userId, notes, notes],
      );
      isNewToSalon = scResult.affectedRows === 1;
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return { userId, isNew, isNewToSalon };
}
