import { decodeId } from "@/lib/id";
import { getOne } from "@/lib/db";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { checkSalonAccess } from '@/lib/permissions-server';
import {
  success,
  error,
  unauthorized,
  notFound,
  forbidden,
} from "@/lib/response";


// GET /api/clients/[id]/notes?salon_id=3
// Returns the single notes text stored on the salon_clients relationship row.
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const clientId = decodeId(rawId);
    const { searchParams } = new URL(request.url);

    const rawSalonId = searchParams.get("salon_id") || searchParams.get("salonId");
    const salonId = rawSalonId ? decodeId(rawSalonId) : null;

    if (!salonId) {
      return error({ code: "MISSING_SALON", message: "salon_id is required" }, 400);
    }

    const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
    if (!hasAccess) return forbidden("Not authorized");

    const row = await getOne(
      "SELECT notes FROM salon_clients WHERE salon_id = ? AND client_id = ?",
      [salonId, clientId],
    );

    if (!row) return notFound("Client not found in this salon");

    // Return as a single-element list for compatibility with the component's list rendering,
    // or null if no notes have been written yet.
    const notes = row.notes ? [{ id: 1, content: row.notes }] : [];
    return success(notes);
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Get client notes error:", err);
    return error({ code: "INTERNAL_SERVER_ERROR", message: "Failed to get notes" }, 500);
  }
}

// POST /api/clients/[id]/notes
// Appends or sets the notes text on the salon_clients row.
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const clientId = decodeId(rawId);
    const body = await request.json();

    const rawSalonId = body.salon_id || body.salonId;
    const salonId = rawSalonId ? decodeId(String(rawSalonId)) : null;
    const content = (body.content || "").trim();

    if (!salonId) {
      return error({ code: "MISSING_SALON", message: "salon_id is required" }, 400);
    }
    if (!content) {
      return error({ code: "MISSING_CONTENT", message: "content is required" }, 400);
    }

    const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
    if (!hasAccess) return forbidden("Not authorized");

    const row = await getOne(
      "SELECT notes FROM salon_clients WHERE salon_id = ? AND client_id = ?",
      [salonId, clientId],
    );
    if (!row) return notFound("Client not found in this salon");

    // Append to existing notes with a separator, or set fresh if empty.
    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const newEntry = `[${timestamp}] ${content}`;
    const updatedNotes = row.notes ? `${row.notes}\n\n${newEntry}` : newEntry;

    await pool.query(
      "UPDATE salon_clients SET notes = ?, updated_at = NOW() WHERE salon_id = ? AND client_id = ?",
      [updatedNotes, salonId, clientId],
    );

    return success({ id: 1, content: updatedNotes });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Add client note error:", err);
    return error({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add note" }, 500);
  }
}

// PUT /api/clients/[id]/notes
// Replaces the entire notes text (used for full edit).
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const clientId = decodeId(rawId);
    const body = await request.json();

    const rawSalonId = body.salon_id || body.salonId;
    const salonId = rawSalonId ? decodeId(String(rawSalonId)) : null;
    const content = body.content !== undefined ? String(body.content || "").trim() : undefined;

    if (!salonId) {
      return error({ code: "MISSING_SALON", message: "salon_id is required" }, 400);
    }

    const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
    if (!hasAccess) return forbidden("Not authorized");

    await pool.query(
      "UPDATE salon_clients SET notes = ?, updated_at = NOW() WHERE salon_id = ? AND client_id = ?",
      [content || null, salonId, clientId],
    );

    return success({ success: true });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Update client notes error:", err);
    return error({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update notes" }, 500);
  }
}
