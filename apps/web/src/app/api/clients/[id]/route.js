import pool, { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  success,
  error,
  unauthorized,
  notFound,
  forbidden,
} from "@/lib/response";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Any active staff member of the salon may read/edit its clients.
// (Consistent with /api/clients/route.js — managers AND receptionists.)
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

// Strip whitespace / dashes / dots so "0555 12-34" and "055512-34"
// resolve to the same string for duplicate detection.
function normalizePhone(raw) {
  if (!raw) return null;
  return String(raw).replace(/[\s\-\.]/g, "").trim() || null;
}

// GET /api/clients/[id] - Get client details
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get("salon_id") || searchParams.get("salonId");

    const client = await getOne(
      "SELECT id, first_name, last_name, email, phone, gender, date_of_birth, address, city, postal_code, created_at FROM users WHERE id = ?",
      [id]
    );

    if (!client) {
      return notFound("Client not found");
    }

    let salonData = null;
    if (salonId) {
      salonData = await getOne(
        "SELECT * FROM salon_clients WHERE salon_id = ? AND client_id = ?",
        [salonId, id]
      );
    }

    return success({
      id: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      phone: client.phone,
      gender: client.gender,
      dateOfBirth: client.date_of_birth,
      address: client.address,
      city: client.city,
      postalCode: client.postal_code,
      notes: salonData?.notes || null,
      createdAt: client.created_at,
      salonStats: salonData
        ? {
          firstVisitDate: salonData.first_visit_date,
          lastVisitDate: salonData.last_visit_date,
          totalVisits: salonData.total_visits,
        }
        : null,
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Get client error:", err);
    return error("Failed to get client", 500);
  }
}

// PUT /api/clients/[id]?salonId=3
//
// Updates name, phone, email, and/or notes for a client.
//
// Fields use explicit-presence semantics:
//   • Field present in body → update to that value (including null = clear)
//   • Field absent from body → leave unchanged in DB
// This is intentional: COALESCE(?, col) is correct for INSERT dedup but wrong
// for an edit endpoint where clearing a field must be expressible.
//
// Phone / email conflict checks run inside a transaction with FOR UPDATE so
// that two concurrent updates cannot both pass the uniqueness check and both
// commit, leaving the DB in an inconsistent state.
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: clientId } = await params;
    const body = await request.json();

    const salonId = body.salonId || body.salon_id || null;

    // ── Access control ───────────────────────────────────────────────────
    // A staff member must supply salonId so we can verify they belong to
    // the same salon as this client.  Admins and the client themselves do
    // not need it.
    if (session.role !== "admin" && session.userId !== parseInt(clientId, 10)) {
      if (!salonId) {
        return error(
          { code: "MISSING_SALON", message: "salonId is required" },
          400,
        );
      }
      const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
      if (!hasAccess) {
        return forbidden("Not authorized to update clients for this salon");
      }
    }

    // ── Confirm the client exists ────────────────────────────────────────
    const existing = await getOne(
      "SELECT id, phone, email FROM users WHERE id = ? AND deleted_at IS NULL",
      [clientId],
    );
    if (!existing) {
      return notFound("Client not found");
    }

    // ── Parse only fields explicitly present in the request body ─────────
    // undefined  → field was not sent → do not touch the DB column
    // null       → field was sent as null → clear the column
    // <string>   → update to this value
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

    const firstName = has("firstName") ? (String(body.firstName || "").trim() || null)
      : has("first_name") ? (String(body.first_name || "").trim() || null)
        : undefined;

    const lastName = has("lastName") ? (String(body.lastName || "").trim() || null)
      : has("last_name") ? (String(body.last_name || "").trim() || null)
        : undefined;

    const newPhone = has("phone") ? normalizePhone(body.phone) : undefined;
    const newEmail = has("email") ? (String(body.email || "").trim().toLowerCase() || null) : undefined;
    const notes = has("notes") ? (String(body.notes || "").trim() || null) : undefined;

    // ── Transaction: conflict checks → UPDATE ────────────────────────────
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock this user's row: any concurrent update to the same client
      // will block here until we commit, preventing split-brain conflicts.
      await conn.execute(
        "SELECT id FROM users WHERE id = ? FOR UPDATE",
        [clientId],
      );

      // ── Phone conflict check ─────────────────────────────────────────
      // Only run if phone is being changed to a non-null, different value.
      // Skipping when unchanged avoids a pointless index lookup on every save.
      if (newPhone !== undefined && newPhone !== null && newPhone !== existing.phone) {
        const [[phoneConflict]] = await conn.execute(
          `SELECT id FROM users
            WHERE phone = ?
              AND id    != ?
              AND deleted_at IS NULL
            LIMIT 1`,
          [newPhone, clientId],
        );
        if (phoneConflict) {
          await conn.rollback();
          return error(
            {
              code: "PHONE_TAKEN",
              message: "This phone number is already registered to another client",
            },
            409,
          );
        }
      }

      // ── Email conflict check ─────────────────────────────────────────
      // uq_users_email is a hard unique constraint — an UPDATE to a
      // duplicate email throws ER_DUP_ENTRY (→ 500) without this guard.
      if (newEmail !== undefined && newEmail !== null && newEmail !== existing.email) {
        const [[emailConflict]] = await conn.execute(
          `SELECT id FROM users
            WHERE email = ?
              AND id   != ?
            LIMIT 1`,
          [newEmail, clientId],
        );
        if (emailConflict) {
          await conn.rollback();
          return error(
            {
              code: "EMAIL_TAKEN",
              message: "This email address is already registered to another account",
            },
            409,
          );
        }
      }

      // ── Build SET clause — only columns that were sent ───────────────
      // An edit form that only surfaces name + phone must not zero out
      // email, address, or any other column the form never rendered.
      const setClauses = [];
      const setParams = [];

      if (firstName !== undefined) { setClauses.push("first_name = ?"); setParams.push(firstName); }
      if (lastName !== undefined) { setClauses.push("last_name  = ?"); setParams.push(lastName); }
      if (newPhone !== undefined) { setClauses.push("phone      = ?"); setParams.push(newPhone); }
      if (newEmail !== undefined) { setClauses.push("email      = ?"); setParams.push(newEmail); }

      if (setClauses.length > 0) {
        setClauses.push("updated_at = NOW()");
        await conn.execute(
          `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`,
          [...setParams, clientId],
        );
      }

      // ── Notes live in salon_clients (per-salon, not per-user) ────────
      if (notes !== undefined && salonId) {
        await conn.execute(
          `UPDATE salon_clients
              SET notes      = ?,
                  updated_at = NOW()
            WHERE salon_id  = ?
              AND client_id = ?`,
          [notes, salonId, clientId],
        );
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    // ── Return fresh DB state ────────────────────────────────────────────
    // Two fast PK-lookup round-trips fired in parallel.
    const [updatedClient, salonData] = await Promise.all([
      getOne(
        `SELECT id, first_name, last_name, email, phone,
                gender, date_of_birth, address, city, postal_code
           FROM users WHERE id = ?`,
        [clientId],
      ),
      salonId
        ? getOne(
          "SELECT notes FROM salon_clients WHERE salon_id = ? AND client_id = ?",
          [salonId, clientId],
        )
        : Promise.resolve(null),
    ]);

    return success({
      id: updatedClient.id,
      firstName: updatedClient.first_name,
      lastName: updatedClient.last_name,
      email: updatedClient.email,
      phone: updatedClient.phone,
      gender: updatedClient.gender,
      dateOfBirth: updatedClient.date_of_birth,
      address: updatedClient.address,
      city: updatedClient.city,
      postalCode: updatedClient.postal_code,
      notes: salonData?.notes ?? null,
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Update client error:", err);
    return error(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to update client" },
      500,
    );
  }
}

// DELETE /api/clients/[id] - Remove client from salon
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get("salon_id") || searchParams.get("salonId");

    if (!salonId) {
      return error("Salon ID is required", 400);
    }

    // Check salon access — any active staff member may remove a client link
    const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden("Not authorized to remove clients from this salon");
    }

    // Soft-delete: mark inactive instead of removing the row.
    //
    // Hard DELETE would orphan the booking history — bookings.client_id still
    // points at users.id so the FK is fine, but every report and history view
    // would show a client that no longer exists in the CRM.  Soft-delete
    // keeps the row (and its booking history) intact while hiding the client
    // from all active CRM lists.  The client is automatically re-activated
    // if they book again or are re-added via findOrCreateClient.
    const result = await query(
      "UPDATE salon_clients SET is_active = 0, updated_at = NOW() WHERE salon_id = ? AND client_id = ?",
      [salonId, id],
    );

    if (result.affectedRows === 0) {
      return error({ code: "CLIENT_NOT_FOUND", message: "Client not found in this salon" }, 404);
    }

    return success({ message: "Client deactivated from salon" });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Delete client error:", err);
    return error("Failed to remove client", 500);
  }
}
