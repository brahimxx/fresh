import { decodeId } from '@/lib/id';
import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error, created, forbidden } from "@/lib/response";
import { checkSalonAccess } from '@/lib/permissions-server';



// GET /api/staff - Get all staff (optionally filtered by salon_id)
export async function GET(request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const rawSalonId = searchParams.get("salon_id");
    const salonId = rawSalonId ? decodeId(rawSalonId) : null;

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
        canPhysical: !!s.can_physical,
        canMobile: !!s.can_mobile,
        canVirtual: !!s.can_virtual,
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
      canPhysical,
      canMobile,
      canVirtual,
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

    // ── Role hierarchy enforcement ──────────────────────────────────────────
    // Managers can only create staff/receptionist, not other managers or owners
    const ROLE_RANK = { staff: 1, receptionist: 2, manager: 3, owner: 4 };
    const requestedRole = role || 'staff';

    if (session.role !== 'admin') {
      const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salon_id]);
      const isOwner = salon && Number(salon.owner_id) === Number(session.userId);

      if (!isOwner) {
        // Non-owner: can only create roles below their own
        const actorStaff = await getOne(
          'SELECT role FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
          [salon_id, session.userId]
        );
        const actorRank = ROLE_RANK[actorStaff?.role] || 0;
        const targetRank = ROLE_RANK[requestedRole] || 0;

        if (targetRank >= actorRank) {
          return forbidden('You cannot create a team member at or above your role');
        }
      }

      // Nobody except admin can create an owner-role staff
      if (requestedRole === 'owner' && !isOwner) {
        return forbidden('Only the salon owner can assign the owner role');
      }
    }

    // ── Phone uniqueness check ──────────────────────────────────────────────
    if (phone && phone.trim()) {
      const phoneConflict = await getOne(
        'SELECT id FROM users WHERE phone = ? AND deleted_at IS NULL LIMIT 1',
        [phone.trim()]
      );
      if (phoneConflict) {
        // Check if this user is already being linked (by email)
        if (!email || !(await getOne('SELECT id FROM users WHERE email = ? AND phone = ?', [email, phone.trim()]))) {
          return error({ code: 'PHONE_TAKEN', message: 'This phone number is already used by another account' }, 409);
        }
      }
    }

    let user;

    if (email) {
      // Check if user already exists
      user = await getOne("SELECT id FROM users WHERE email = ?", [email]);

      if (!user) {
        // Create a new user with a temporary password (they'll need to set it via invite)
        const tempPassword = Math.random().toString(36).slice(-12);
        const bcrypt = await import("bcryptjs");
        const passwordHash = await bcrypt.hash(tempPassword, 12);

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
      const passwordHash = await bcrypt.hash(tempPassword, 12);

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
      `INSERT INTO staff (salon_id, user_id, role, title, bio, phone_secondary, color, country, birthday, start_date, end_date, employment_type, notes, is_active, is_visible, can_physical, can_mobile, can_virtual)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
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
        canPhysical !== undefined ? (canPhysical ? 1 : 0) : 1,
        canMobile !== undefined ? (canMobile ? 1 : 0) : 0,
        canVirtual !== undefined ? (canVirtual ? 1 : 0) : 0,
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
      canPhysical: !!newStaff.can_physical,
      canMobile: !!newStaff.can_mobile,
      canVirtual: !!newStaff.can_virtual,
    });
  } catch (err) {
    console.error("Create staff error:", err);
    return error("Failed to create staff member", 500);
  }
}
