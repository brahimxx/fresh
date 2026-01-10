import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/response";

// GET /api/campaigns - List all campaigns for the salon
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
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    let whereClause = "WHERE salon_id = ?";
    const params = [auth.salonId];

    if (search) {
      whereClause += " AND (name LIKE ? OR subject LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += " AND status = ?";
      params.push(status);
    }

    if (type) {
      whereClause += " AND type = ?";
      params.push(type);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM campaigns ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    // Get campaigns
    const campaigns = await query(
      `SELECT * FROM campaigns ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return successResponse({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return errorResponse("Failed to fetch campaigns", 500);
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const {
      name,
      type = "email",
      subject,
      content,
      target_audience = "all",
      status = "draft",
      scheduled_at,
    } = body;

    // Validation
    if (!name || name.trim() === "") {
      return errorResponse("Campaign name is required", 400);
    }

    if (!content || content.trim() === "") {
      return errorResponse("Campaign content is required", 400);
    }

    // Validate type
    const validTypes = ["email", "sms", "push"];
    if (!validTypes.includes(type)) {
      return errorResponse("Invalid campaign type", 400);
    }

    // Validate target audience
    const validAudiences = ["all", "new", "returning", "inactive"];
    if (!validAudiences.includes(target_audience)) {
      return errorResponse("Invalid target audience", 400);
    }

    // Validate status
    const validStatuses = [
      "draft",
      "scheduled",
      "sending",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return errorResponse("Invalid status", 400);
    }

    const result = await query(
      `INSERT INTO campaigns (salon_id, name, type, subject, content, target_audience, status, scheduled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auth.salonId,
        name.trim(),
        type,
        subject || null,
        content.trim(),
        target_audience,
        status,
        scheduled_at || null,
      ]
    );

    const newCampaign = await query("SELECT * FROM campaigns WHERE id = ?", [
      result.insertId,
    ]);

    return successResponse({ campaign: newCampaign[0] }, 201);
  } catch (error) {
    console.error("Error creating campaign:", error);
    return errorResponse("Failed to create campaign", 500);
  }
}
