import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/response";

export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", 401);

    const { ticketId } = await params;

    const ticket = await query(
      "SELECT * FROM support_tickets WHERE id = ? AND user_id = ?",
      [ticketId, session.userId]
    );

    if (!ticket || ticket.length === 0) {
      return errorResponse("Ticket not found", 404);
    }

    return successResponse(ticket[0]);
  } catch (error) {
    console.error("Fetch support ticket detail error:", error);
    return errorResponse("Failed to fetch ticket", 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", 401);

    const { ticketId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return errorResponse("Status is required", 400);
    }

    // Ensure it belongs to the user
    const existing = await query(
      "SELECT id FROM support_tickets WHERE id = ? AND user_id = ?",
      [ticketId, session.userId]
    );

    if (!existing || existing.length === 0) {
      return errorResponse("Ticket not found", 404);
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return errorResponse("Invalid status provided", 400);
    }

    await query(
      "UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, ticketId]
    );

    const updated = await query("SELECT * FROM support_tickets WHERE id = ?", [ticketId]);

    return successResponse(updated[0]);
  } catch (error) {
    console.error("Update support ticket error:", error);
    return errorResponse("Failed to update ticket", 500);
  }
}
