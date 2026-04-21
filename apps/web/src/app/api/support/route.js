import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/response";

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit')) || 50;
    
    let sql = "SELECT * FROM support_tickets WHERE user_id = ?";
    let params = [session.userId];

    if (status && status !== 'all') {
      sql += " AND status = ?";
      params.push(status);
    }

    sql += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);

    const tickets = await query(sql, params);

    return successResponse(tickets);
  } catch (error) {
    console.error("Fetch support tickets error:", error);
    return errorResponse("Failed to fetch support tickets", 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { subject, description, priority = "normal" } = body;

    if (!subject || !description) {
      return errorResponse("Subject and description are required", 400);
    }

    // Validate enum priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    const ticketPriority = validPriorities.includes(priority) ? priority : 'normal';

    const result = await query(
      "INSERT INTO support_tickets (user_id, subject, description, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'open', NOW(), NOW())",
      [session.userId, subject, description, ticketPriority]
    );

    const newTicket = await query("SELECT * FROM support_tickets WHERE id = ?", [result.insertId]);

    return successResponse(newTicket[0]);
  } catch (error) {
    console.error("Create support ticket error:", error);
    return errorResponse("Failed to create support ticket", 500);
  }
}
