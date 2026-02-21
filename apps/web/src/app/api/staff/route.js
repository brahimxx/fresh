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
    [salonId, userId],
  );
  return !!staff;
}

// GET /api/staff - Get all staff (optionally filtered by salon_id)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get("salon_id");

    let sql = `
      SELECT s.*, u.first_name, u.last_name, u.email, u.phone
      FROM staff s
      JOIN users u ON u.id = s.user_id
      WHERE s.is_active = 1
    `;
    const params = [];

    if (salonId) {
      sql += " AND s.salon_id = ?";
      params.push(salonId);
    }

    sql += " ORDER BY s.display_order ASC, u.first_name ASC";

    const staffMembers = await query(sql, params);

    // Get service assignments for all staff members
    const staffIds = staffMembers.map((s) => s.id);
    let serviceAssignments = [];

    if (staffIds.length > 0) {
      serviceAssignments = await query(
        `SELECT staff_id, service_id 
         FROM service_staff 
         WHERE staff_id IN (${staffIds.map(() => "?").join(",")})`,
        staffIds,
      );
    }

    // Group service IDs by staff ID
    const servicesByStaff = {};
    serviceAssignments.forEach((assignment) => {
      if (!servicesByStaff[assignment.staff_id]) {
        servicesByStaff[assignment.staff_id] = [];
      }
      servicesByStaff[assignment.staff_id].push(assignment.service_id);
    });

    return success({
      data: staffMembers.map((s) => ({
        id: s.id,
        salonId: s.salon_id,
        userId: s.user_id,
        firstName: s.first_name,
        lastName: s.last_name,
        email: s.email,
        phone: s.phone,
        role: s.role,
        title: s.title,
        bio: s.bio,
        avatarUrl: s.avatar_url,
        color: s.color,
        displayOrder: s.display_order,
        isActive: s.is_active,
        isVisible: s.is_visible,
        service_ids: servicesByStaff[s.id] || [],
      })),
    });
  } catch (err) {
    console.error("Get staff error:", err);
    return error("Failed to get staff", 500);
  }
}

// POST /api/staff - Create a new staff member
export async function POST(request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const {
      salon_id,
      email,
      name,
      first_name,
      last_name,
      phone,
      phoneSecondary,
      role,
      title,
      bio,
      color,
      country,
      birthday,
      startDate,
      endDate,
      employmentType,
      notes,
      isVisible,
      serviceIds,
      emergencyContact,
    } = body;

    if (!salon_id) {
      return error("salon_id is required", 400);
    }

    // Handle name field - can be either "name" or "first_name/last_name"
    let firstName = first_name;
    let lastName = last_name;

    if (name && !firstName) {
      const nameParts = name.trim().split(" ");
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ") || null;
    }

    if (!firstName) {
      return error("Name is required", 400);
    }

    // Check salon access
    const hasAccess = await checkSalonAccess(
      salon_id,
      session.userId,
      session.role,
    );
    if (!hasAccess) {
      return forbidden("Not authorized to add staff to this salon");
    }

    let user;

    if (email) {
      // Check if user already exists
      user = await getOne("SELECT id FROM users WHERE email = ?", [email]);

      if (!user) {
        // Create a new user with a temporary password (they'll need to set it via invite)
        const tempPassword = Math.random().toString(36).slice(-12);
        const bcrypt = await import("bcryptjs");
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const userResult = await query(
          `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
         VALUES (?, ?, ?, ?, ?, 'staff')`,
          [email, passwordHash, firstName, lastName || null, phone || null],
        );
        user = { id: userResult.insertId };
      }
    } else {
      // Create user without email (using a placeholder)
      const placeholderEmail = `staff_${Date.now()}_${Math.random()
        .toString(36)
        .slice(-4)}@placeholder.local`;
      const tempPassword = Math.random().toString(36).slice(-12);
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const userResult = await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
         VALUES (?, ?, ?, ?, ?, 'staff')`,
        [
          placeholderEmail,
          passwordHash,
          firstName,
          lastName || null,
          phone || null,
        ],
      );
      user = { id: userResult.insertId };
    }

    // Check if staff already exists for this salon
    const existingStaff = await getOne(
      "SELECT id FROM staff WHERE salon_id = ? AND user_id = ?",
      [salon_id, user.id],
    );

    if (existingStaff) {
      return error("This user is already a team member of this salon", 400);
    }

    // Create staff entry
    const result = await query(
      `INSERT INTO staff (salon_id, user_id, role, title, bio, phone_secondary, color, country, birthday, start_date, end_date, employment_type, notes, is_active, is_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        salon_id,
        user.id,
        role || "staff",
        title || null,
        bio || null,
        phoneSecondary || null,
        color || "#3B82F6",
        country || null,
        birthday || null,
        startDate || null,
        endDate || null,
        employmentType || "employee",
        notes || null,
        isVisible !== false ? 1 : 0,
      ],
    );

    const staffId = result.insertId;

    // Add service assignments if provided
    if (serviceIds && serviceIds.length > 0) {
      const serviceValues = serviceIds.map((serviceId) => [serviceId, staffId]);
      await query(`INSERT INTO service_staff (service_id, staff_id) VALUES ?`, [
        serviceValues,
      ]);
    }

    // Add emergency contact if provided
    if (emergencyContact && emergencyContact.contactName) {
      await query(
        `INSERT INTO staff_emergency_contacts (staff_id, contact_name, relationship, phone_primary, email, is_primary)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [
          staffId,
          emergencyContact.contactName,
          emergencyContact.relationship || null,
          emergencyContact.phonePrimary || null,
          emergencyContact.email || null,
        ],
      );
    }

    const newStaff = await getOne(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.phone
       FROM staff s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
      [staffId],
    );

    return created({
      id: newStaff.id,
      salonId: newStaff.salon_id,
      userId: newStaff.user_id,
      firstName: newStaff.first_name,
      lastName: newStaff.last_name,
      email: newStaff.email,
      phone: newStaff.phone,
      role: newStaff.role,
      title: newStaff.title,
      bio: newStaff.bio,
      avatarUrl: newStaff.avatar_url,
      color: newStaff.color,
      isActive: newStaff.is_active,
      isVisible: newStaff.is_visible,
    });
  } catch (err) {
    console.error("Create staff error:", err);
    return error("Failed to create staff member", 500);
  }
}
