import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error, created, forbidden } from "@/lib/response";

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === "admin") return true;
  const salon = await getOne("SELECT owner_id FROM salons WHERE id = ?", [
    salonId,
  ]);
  if (!salon) return false;
  if (salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role IN ('manager') AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// GET /api/discounts - Get all discounts
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get("salon_id");
    const status = searchParams.get("status");

    let sql = `SELECT * FROM discounts WHERE 1=1`;
    const params = [];

    if (salonId) {
      sql += " AND salon_id = ?";
      params.push(salonId);
    }

    if (status === "active") {
      sql +=
        " AND is_active = 1 AND (end_date IS NULL OR end_date >= CURDATE())";
    } else if (status === "inactive") {
      sql += " AND is_active = 0";
    } else if (status === "expired") {
      sql += " AND end_date < CURDATE()";
    }

    sql += " ORDER BY created_at DESC";

    const discounts = await query(sql, params);

    return success({
      data: discounts.map((d) => ({
        id: d.id,
        salonId: d.salon_id,
        code: d.code,
        name: d.name,
        description: d.description,
        type: d.type,
        value: d.value,
        minPurchase: d.min_purchase,
        maxDiscount: d.max_discount,
        startDate: d.start_date,
        endDate: d.end_date,
        maxUses: d.max_uses,
        maxUsesPerClient: d.max_uses_per_client,
        currentUses: d.current_uses,
        isActive: d.is_active,
        appliesToServices: d.applies_to_services,
        appliesToProducts: d.applies_to_products,
        firstBookingOnly: d.first_booking_only,
      })),
    });
  } catch (err) {
    console.error("Get discounts error:", err);
    return error("Failed to get discounts", 500);
  }
}

// POST /api/discounts - Create a new discount
export async function POST(request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const {
      salon_id,
      code,
      name,
      description,
      type,
      value,
      min_purchase,
      max_discount,
      start_date,
      end_date,
      max_uses,
      max_uses_per_client,
      applies_to_services,
      applies_to_products,
      first_booking_only,
    } = body;

    if (!salon_id) {
      return error("salon_id is required", 400);
    }

    if (!code || !name) {
      return error("Code and name are required", 400);
    }

    // Check salon access
    const hasAccess = await checkSalonAccess(
      salon_id,
      session.userId,
      session.role
    );
    if (!hasAccess) {
      return forbidden("Not authorized to create discounts for this salon");
    }

    // Check for duplicate code
    const existing = await getOne(
      "SELECT id FROM discounts WHERE salon_id = ? AND code = ?",
      [salon_id, code]
    );
    if (existing) {
      return error("A discount with this code already exists", 400);
    }

    const result = await query(
      `INSERT INTO discounts (
        salon_id, code, name, description, type, value, 
        min_purchase, max_discount, start_date, end_date,
        max_uses, max_uses_per_client, applies_to_services,
        applies_to_products, first_booking_only, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        salon_id,
        code,
        name,
        description || null,
        type || "percentage",
        value || 0,
        min_purchase || null,
        max_discount || null,
        start_date || null,
        end_date || null,
        max_uses || null,
        max_uses_per_client || null,
        applies_to_services !== false ? 1 : 0,
        applies_to_products !== false ? 1 : 0,
        first_booking_only ? 1 : 0,
      ]
    );

    const newDiscount = await getOne("SELECT * FROM discounts WHERE id = ?", [
      result.insertId,
    ]);

    return created({
      id: newDiscount.id,
      code: newDiscount.code,
      name: newDiscount.name,
    });
  } catch (err) {
    console.error("Create discount error:", err);
    return error("Failed to create discount", 500);
  }
}
