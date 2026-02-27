import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  success,
  error,
  created,
  unauthorized,
  forbidden,
} from "@/lib/response";
import { findOrCreateClient, normalizePhone, ClientError } from "@/lib/client";

// ---------------------------------------------------------------------------
// checkSalonAccess
// ---------------------------------------------------------------------------
// Admin: full access.
// Owner: access to own salons.
// Staff: ANY active staff member of the salon can create/view clients.
//        Managers and regular staff (receptionists) both work here daily.
// ---------------------------------------------------------------------------
async function checkSalonAccess(salonId, userId, role) {
  const salon = await getOne(
    "SELECT owner_id FROM salons WHERE id = ? AND deleted_at IS NULL",
    [salonId],
  );
  if (!salon) return false;
  if (role === "admin") return true;
  if (salon.owner_id === userId) return true;

  // Any active staff member (manager OR receptionist) can manage this salon's clients.
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1",
    [salonId, userId],
  );
  return !!staff;
}

// ---------------------------------------------------------------------------
// normalizePhone — re-exported from lib/client for use in GET search
// ---------------------------------------------------------------------------
// (imported above from lib/client)

// POST /api/clients - Create or retrieve a walk-in / manual client
//
// All deduplication logic lives in lib/client.js → findOrCreateClient().
// This handler is responsible only for HTTP concerns: parsing, auth, access
// control, and shaping the response.  It must never contain its own INSERT
// INTO users — that is what causes phantom duplicates.
export async function POST(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();

    // Accept both camelCase (frontend) and snake_case (scripts / external callers)
    const salonId = Number(body.salonId || body.salon_id) || null;
    const firstName = (body.firstName || body.first_name || "").trim() || null;
    const lastName = (body.lastName || body.last_name || "").trim() || null;
    const email = (body.email || "").trim().toLowerCase() || null;
    const phone = normalizePhone(body.phone);
    const gender = body.gender || null;
    const dateOfBirth = body.dateOfBirth || body.date_of_birth || null;
    const address = (body.address || "").trim() || null;
    const city = (body.city || "").trim() || null;
    const postalCode = (body.postalCode || body.postal_code || "").trim() || null;
    const notes = (body.notes || "").trim() || null;

    // ── Validation ──────────────────────────────────────────────────────────

    if (!salonId) {
      return error({ code: "MISSING_SALON", message: "salonId is required" }, 400);
    }
    if (!firstName) {
      return error({ code: "MISSING_NAME", message: "first_name is required" }, 400);
    }
    if (!phone && !email) {
      return error({ code: "MISSING_CONTACT", message: "phone or email is required" }, 400);
    }

    // ── Access control ───────────────────────────────────────────────────────

    const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden("Not authorized to create clients for this salon");
    }

    // ── Find or create — fully delegated to lib/client.js ───────────────────
    //
    // findOrCreateClient() owns ALL dedup logic: phone FOR UPDATE → email
    // FOR UPDATE → INSERT with ER_DUP_ENTRY recovery → salon_clients upsert.
    // Nothing in this route touches users directly.
    const { userId, isNew, isNewToSalon } = await findOrCreateClient({
      phone,
      email,
      firstName,
      lastName,
      gender,
      dateOfBirth,
      address,
      city,
      postalCode,
      salonId,
      notes,
    });

    // ── Return fresh DB state ────────────────────────────────────────────────
    const user = await getOne(
      `SELECT id, first_name, last_name, email, phone,
              gender, date_of_birth, address, city, postal_code
         FROM users
        WHERE id = ?`,
      [userId],
    );

    return created({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      dateOfBirth: user.date_of_birth,
      address: user.address,
      city: user.city,
      postalCode: user.postal_code,
      salonId,
      isNew,         // true → new user created
      isNewToSalon,  // true → first visit to this salon
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    if (err instanceof ClientError) {
      return error({ code: err.code, message: err.message }, err.httpStatus);
    }
    console.error("Create client error:", err);
    return error({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create client" }, 500);
  }
}

// GET /api/clients?salonId=3&search=term&page=1&limit=20
//
// Fast client search for the salon dashboard.
//
// Search routing:
//   Phone pattern  → searches ONLY users.phone   (hits idx_users_phone)
//   Email pattern  → searches ONLY users.email   (hits uq_users_email)
//   Name pattern   → searches first_name OR last_name (hits idx_users_first_name
//                    / idx_users_last_name independently; MySQL picks the cheaper)
//
// All LIKE patterns use 'term%' (prefix), never '%term%' (leading wildcard).
// Prefix LIKE can use a B-tree index; a leading wildcard forces a full scan.
// Receptionists always type from the beginning of a phone number or name, so
// prefix matching covers 100% of real-world search behaviour.
//
// COUNT(*) OVER() is a window function evaluated before LIMIT — it returns the
// total matching row count without a second round-trip to the database.
export async function GET(request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const salonId = searchParams.get("salon_id") || searchParams.get("salonId");
    if (!salonId) {
      return error({ code: "MISSING_SALON", message: "salonId is required" }, 400);
    }

    const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden("Not authorized to view clients for this salon");
    }

    // Cap at 50 — the dashboard autocomplete never needs more than that in one
    // shot, and an uncapped limit is an accidental DDoS vector.
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    // Truncate search term — a 500-char search string is never legitimate.
    const rawSearch = (searchParams.get("search") || "").trim().slice(0, 100);

    // ── Query strategy ─────────────────────────────────────────────────────
    //
    // The driving table choice determines which index is hit FIRST and has a
    // large impact on performance at scale.
    //
    // Phone / email search → drive FROM users
    //   idx_users_phone (phone)   → range scan on 1-5 matched rows max
    //   uq_users_email  (email)   → same (unique index, prefix LIKE)
    //   Then JOIN salon_clients ON client_id + salon_id + is_active filter.
    //
    //   This is O(matches on phone/email) — near-instant regardless of how
    //   many clients the salon has.
    //
    // Name search or no search → drive FROM salon_clients
    //   idx_salon_clients_active (salon_id, is_active, last_visit_date)
    //   → range scan on only the active rows for this salon, already sorted
    //     by last_visit_date for ORDER BY without filesort.
    //   Then JOIN users and optionally filter first_name / last_name LIKE.
    //
    //   This is O(active salon clients) with no extra sort — ideal for
    //   the default list (no search term) and name searches.
    //
    // All LIKE patterns use 'term%' (prefix), never '%term%'.
    // Prefix LIKE can use a B-tree index; leading wildcard forces full scan.
    //
    // COUNT(*) OVER() returns the total matching rows in the same round-trip,
    // eliminating a second COUNT query.
    //
    // Detection rules:
    //   Phone   → only digits, spaces, dashes, dots, or leading '+'
    //   Email   → contains '@'
    //   Name    → everything else

    const isPhone = rawSearch.length > 0 && /^[\d\s\+\-\.]+$/.test(rawSearch);
    const isEmail = rawSearch.includes("@");

    let sql, queryParams;

    const SELECT_COLS = `
        u.id              AS id,
        u.first_name,
        u.last_name,
        u.phone,
        u.email,
        sc.last_visit_date,
        sc.total_visits,
        sc.first_visit_date,
        COUNT(*) OVER()   AS total`;

    if (isPhone || isEmail) {
      // ── Fast path: drive from users ────────────────────────────────────
      // idx_users_phone or uq_users_email narrows to a handful of rows, then
      // the JOIN to salon_clients filters by salon + active in one lookup.
      const userCondition = isPhone
        ? `u.phone LIKE ?`
        : `u.email LIKE ?`;
      const searchParam = isPhone
        ? `${normalizePhone(rawSearch)}%`
        : `${rawSearch}%`;

      sql = `
        SELECT ${SELECT_COLS}
          FROM users u
          JOIN salon_clients sc
            ON sc.client_id  = u.id
           AND sc.salon_id   = ?
           AND sc.is_active  = 1
         WHERE u.deleted_at IS NULL
           AND ${userCondition}
         ORDER BY sc.last_visit_date DESC
         LIMIT ? OFFSET ?`;
      queryParams = [salonId, searchParam, limit, offset];

    } else {
      // ── Default path: drive from salon_clients ─────────────────────────
      // idx_salon_clients_active (salon_id, is_active, last_visit_date)
      // covers the filter and the ORDER BY with no filesort.
      const conditions = [
        "sc.salon_id  = ?",
        "sc.is_active = 1",
        "u.deleted_at IS NULL",
      ];
      const params = [salonId];

      if (rawSearch) {
        // Name search — idx_users_first_name / idx_users_last_name on the
        // joined rows.  MySQL will choose the cheaper range scan per column.
        conditions.push("(u.first_name LIKE ? OR u.last_name LIKE ?)");
        params.push(`${rawSearch}%`, `${rawSearch}%`);
      }

      sql = `
        SELECT ${SELECT_COLS}
          FROM salon_clients sc
          JOIN users u ON u.id = sc.client_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY sc.last_visit_date DESC
         LIMIT ? OFFSET ?`;
      queryParams = [...params, limit, offset];
    }

    const rows = await query(sql, queryParams);

    const total = rows.length > 0 ? Number(rows[0].total) : 0;

    return success({
      clients: rows.map((r) => ({
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name,
        phone: r.phone,
        email: r.email,
        lastVisitDate: r.last_visit_date,
        firstVisitDate: r.first_visit_date,
        totalVisits: r.total_visits,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("List clients error:", err);
    return error({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list clients" }, 500);
  }
}
