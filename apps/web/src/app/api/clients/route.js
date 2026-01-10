import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  success,
  error,
  created,
  unauthorized,
  forbidden,
} from "@/lib/response";

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === "admin") return true;
  const salon = await getOne("SELECT owner_id FROM salons WHERE id = ?", [
    salonId,
  ]);
  if (salon && salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// POST /api/clients - Create a walk-in client
export async function POST(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    // Handle both camelCase and snake_case field names
    const salonId = body.salonId || body.salon_id;
    const firstName = body.firstName || body.first_name;
    const lastName = body.lastName || body.last_name;
    const email = body.email;
    const phone = body.phone;
    const gender = body.gender;
    const dateOfBirth = body.dateOfBirth || body.date_of_birth;
    const address = body.address;
    const city = body.city;
    const postalCode = body.postalCode || body.postal_code;
    const notes = body.notes;

    if (!salonId || !firstName) {
      return error("Salon ID and first name are required", 400);
    }

    const hasAccess = await checkSalonAccess(
      salonId,
      session.userId,
      session.role
    );
    if (!hasAccess) {
      return forbidden("Not authorized to create clients for this salon");
    }

    // Check if user exists by email
    let userId;
    if (email) {
      const existingUser = await getOne(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );
      if (existingUser) {
        userId = existingUser.id;
        // Update existing user's profile info
        await query(
          `UPDATE users SET 
            first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            phone = COALESCE(?, phone),
            gender = COALESCE(?, gender),
            date_of_birth = COALESCE(?, date_of_birth),
            address = COALESCE(?, address),
            city = COALESCE(?, city),
            postal_code = COALESCE(?, postal_code),
            updated_at = NOW()
          WHERE id = ?`,
          [
            firstName,
            lastName || null,
            phone || null,
            gender || null,
            dateOfBirth || null,
            address || null,
            city || null,
            postalCode || null,
            userId,
          ]
        );
      }
    }

    // Create new user if not exists
    if (!userId) {
      // Generate placeholder email if none provided
      const userEmail =
        email ||
        `client_${Date.now()}_${Math.random()
          .toString(36)
          .slice(-4)}@placeholder.local`;
      const result = await query(
        `INSERT INTO users (email, phone, first_name, last_name, gender, date_of_birth, address, city, postal_code, role, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'client', '', NOW(), NOW())`,
        [
          userEmail,
          phone || null,
          firstName,
          lastName || null,
          gender || null,
          dateOfBirth || null,
          address || null,
          city || null,
          postalCode || null,
        ]
      );
      userId = result.insertId;
    }

    // Add to salon_clients
    const existingClient = await getOne(
      "SELECT * FROM salon_clients WHERE salon_id = ? AND client_id = ?",
      [salonId, userId]
    );

    if (!existingClient) {
      await query(
        "INSERT INTO salon_clients (salon_id, client_id, first_visit_date, last_visit_date, total_visits, notes) VALUES (?, ?, NOW(), NOW(), 0, ?)",
        [salonId, userId, notes || null]
      );
    }

    return created({
      id: userId,
      firstName,
      lastName,
      email,
      phone,
      salonId,
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Create client error:", err);
    return error("Failed to create client", 500);
  }
}

// GET /api/clients - List clients (for specific salon)
export async function GET(request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const salonId = searchParams.get("salon_id") || searchParams.get("salonId");

    if (!salonId) {
      return error("Salon ID is required");
    }

    const hasAccess = await checkSalonAccess(
      salonId,
      session.userId,
      session.role
    );
    if (!hasAccess) {
      return forbidden("Not authorized to view clients");
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const offset = (page - 1) * limit;

    let sql = `
      SELECT sc.*, u.first_name, u.last_name, u.email, u.phone, u.gender, u.date_of_birth, u.address, u.city, u.postal_code
      FROM salon_clients sc
      JOIN users u ON u.id = sc.client_id
      WHERE sc.salon_id = ?
    `;
    const params = [salonId];

    if (search) {
      sql +=
        " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY sc.last_visit_date DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const clients = await query(sql, params);

    const [{ total }] = await query(
      "SELECT COUNT(*) as total FROM salon_clients WHERE salon_id = ?",
      [salonId]
    );

    return success({
      clients: clients.map((c) => ({
        id: c.client_id,
        firstName: c.first_name,
        lastName: c.last_name,
        email: c.email,
        phone: c.phone,
        gender: c.gender,
        dateOfBirth: c.date_of_birth,
        address: c.address,
        city: c.city,
        postalCode: c.postal_code,
        notes: c.notes,
        firstVisitDate: c.first_visit_date,
        lastVisitDate: c.last_visit_date,
        totalVisits: c.total_visits,
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
    return error("Failed to list clients", 500);
  }
}
