import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/response";

// GET /api/waitlist - List all waitlist entries for the salon
export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const offset = (page - 1) * limit;
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    let whereClause = "WHERE w.salon_id = ?";
    const params = [auth.salonId];

    if (status) {
      whereClause += " AND w.status = ?";
      params.push(status);
    }

    if (date) {
      whereClause += " AND w.preferred_date = ?";
      params.push(date);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM waitlist w ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    // Get waitlist entries with client, service, and staff info
    const waitlist = await query(
      `SELECT 
        w.*,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        u.email as client_email,
        u.phone as client_phone,
        s.name as service_name,
        st.first_name as staff_first_name,
        st.last_name as staff_last_name
       FROM waitlist w
       LEFT JOIN users u ON w.client_id = u.id
       LEFT JOIN services s ON w.service_id = s.id
       LEFT JOIN staff st ON w.staff_id = st.id
       ${whereClause}
       ORDER BY w.preferred_date ASC, w.preferred_time_start ASC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return successResponse({
      waitlist,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching waitlist:", error);
    return errorResponse("Failed to fetch waitlist", 500);
  }
}

// POST /api/waitlist - Add a client to the waitlist
export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const {
      client_id,
      service_id,
      staff_id,
      preferred_date,
      preferred_time_start,
      preferred_time_end,
      notes,
      status = "pending",
    } = body;

    // Validation
    if (!client_id) {
      return errorResponse("Client is required", 400);
    }

    if (!preferred_date) {
      return errorResponse("Preferred date is required", 400);
    }

    // Validate status
    const validStatuses = [
      "pending",
      "notified",
      "booked",
      "expired",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return errorResponse("Invalid status", 400);
    }

    const result = await query(
      `INSERT INTO waitlist (salon_id, client_id, service_id, staff_id, preferred_date, preferred_time_start, preferred_time_end, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auth.salonId,
        client_id,
        service_id || null,
        staff_id || null,
        preferred_date,
        preferred_time_start || null,
        preferred_time_end || null,
        notes || null,
        status,
      ]
    );

    const newEntry = await query(
      `SELECT 
        w.*,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        u.email as client_email,
        s.name as service_name,
        st.first_name as staff_first_name,
        st.last_name as staff_last_name
       FROM waitlist w
       LEFT JOIN users u ON w.client_id = u.id
       LEFT JOIN services s ON w.service_id = s.id
       LEFT JOIN staff st ON w.staff_id = st.id
       WHERE w.id = ?`,
      [result.insertId]
    );

    return successResponse({ waitlistEntry: newEntry[0] }, 201);
  } catch (error) {
    console.error("Error adding to waitlist:", error);
    return errorResponse("Failed to add to waitlist", 500);
  }
}
