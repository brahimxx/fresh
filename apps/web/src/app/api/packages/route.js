import { query } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/response";

// GET /api/packages - List all packages for the salon
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
    const active = searchParams.get("active");

    let whereClause = "WHERE salon_id = ?";
    const params = [auth.salonId];

    if (search) {
      whereClause += " AND (name LIKE ? OR description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (active !== null && active !== undefined && active !== "") {
      whereClause += " AND is_active = ?";
      params.push(active === "true" ? 1 : 0);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM packages ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    // Get packages
    const packages = await query(
      `SELECT * FROM packages ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return successResponse({
      packages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return errorResponse("Failed to fetch packages", 500);
  }
}

// POST /api/packages - Create a new package
export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const {
      name,
      description,
      original_price,
      discounted_price,
      validity_days,
      max_uses,
      is_active = true,
      image_url,
    } = body;

    // Validation
    if (!name || name.trim() === "") {
      return errorResponse("Package name is required", 400);
    }

    if (!original_price || isNaN(parseFloat(original_price))) {
      return errorResponse("Original price is required", 400);
    }

    if (!discounted_price || isNaN(parseFloat(discounted_price))) {
      return errorResponse("Discounted price is required", 400);
    }

    const result = await query(
      `INSERT INTO packages (salon_id, name, description, original_price, discounted_price, validity_days, max_uses, is_active, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auth.salonId,
        name.trim(),
        description || null,
        parseFloat(original_price),
        parseFloat(discounted_price),
        validity_days ? parseInt(validity_days) : null,
        max_uses ? parseInt(max_uses) : null,
        is_active ? 1 : 0,
        image_url || null,
      ]
    );

    const newPackage = await query("SELECT * FROM packages WHERE id = ?", [
      result.insertId,
    ]);

    return successResponse({ package: newPackage[0] }, 201);
  } catch (error) {
    console.error("Error creating package:", error);
    return errorResponse("Failed to create package", 500);
  }
}
