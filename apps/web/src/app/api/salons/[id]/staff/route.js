import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  success,
  error,
  created,
  unauthorized,
  notFound,
  forbidden,
} from "@/lib/response";

// Helper to check if user owns the salon or is manager
async function checkSalonAccess(salonId, userId, role) {
  if (role === "admin") return true;
  const salon = await getOne("SELECT owner_id FROM salons WHERE id = ?", [
    salonId,
  ]);
  if (salon && salon.owner_id === userId) return true;
  // Check if user is a manager at this salon
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// GET /api/salons/[id]/staff - Get salon staff
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const staff = await query(
      `SELECT st.id, st.role, st.is_active, st.user_id,
              u.first_name, u.last_name, u.email, u.phone
       FROM staff st
       JOIN users u ON u.id = st.user_id
       WHERE st.salon_id = ? AND st.is_active = 1
       ORDER BY st.role DESC, u.first_name`,
      [id]
    );

    // Get service IDs for each staff member
    const staffWithServices = await Promise.all(
      staff.map(async (s) => {
        const serviceIds = await query(
          `SELECT service_id FROM service_staff WHERE staff_id = ?`,
          [s.id]
        );

        return {
          id: s.id,
          userId: s.user_id,
          firstName: s.first_name,
          lastName: s.last_name,
          email: s.email,
          phone: s.phone,
          role: s.role,
          isActive: s.is_active,
          service_ids: serviceIds.map((sid) => sid.service_id),
        };
      })
    );

    return success({
      staff: staffWithServices,
    });
  } catch (err) {
    console.error("Get salon staff error:", err);
    return error("Failed to get salon staff", 500);
  }
}

// POST /api/salons/[id]/staff - Add staff to salon
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden("Not authorized to manage staff");
    }

    const body = await request.json();
    const { userId, role = "staff" } = body;

    if (!userId) {
      return error("User ID is required");
    }

    // Check if user exists
    const user = await getOne(
      "SELECT id, first_name, last_name FROM users WHERE id = ?",
      [userId]
    );
    if (!user) {
      return notFound("User not found");
    }

    // Check if already staff at this salon
    const existingStaff = await getOne(
      "SELECT id FROM staff WHERE salon_id = ? AND user_id = ?",
      [id, userId]
    );
    if (existingStaff) {
      return error("User is already staff at this salon", 409);
    }

    const result = await query(
      "INSERT INTO staff (salon_id, user_id, role, is_active) VALUES (?, ?, ?, 1)",
      [id, userId, role]
    );

    return created({
      id: result.insertId,
      userId,
      firstName: user.first_name,
      lastName: user.last_name,
      role,
      isActive: true,
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Add staff error:", err);
    return error("Failed to add staff", 500);
  }
}
