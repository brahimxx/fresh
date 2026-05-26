import { decodeId } from '@/lib/id';
import { getOne, query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, notFound, forbidden } from '@/lib/response';

// Helper to check staff access
async function checkStaffAccess(staffId, userId, role) {
  if (role === 'admin') return true;
  
  const staff = await getOne(
    `SELECT s.*, sal.owner_id 
     FROM staff s
     JOIN salons sal ON sal.id = s.salon_id
     WHERE s.id = ?`,
    [staffId]
  );
  
  if (!staff) return null;
  
  // Owner of the salon or the staff member themselves
  if (staff.owner_id === userId || staff.user_id === userId) return staff;
  
  // Manager at the same salon
  const manager = await getOne(
    `SELECT id FROM staff 
     WHERE salon_id = ? AND user_id = ? AND role IN ('manager', 'owner') AND is_active = 1`,
    [staff.salon_id, userId]
  );
  
  return manager ? staff : null;
}

// GET /api/staff/[staffId] - Get staff member details
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawStaffId } = await params;
  const staffId = decodeId(rawStaffId);

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return notFound('Staff member not found or access denied');
    }

    // Get user details
    const user = await getOne(
      `SELECT first_name, last_name, email, phone, avatar_url 
       FROM users WHERE id = ?`,
      [staff.user_id]
    );

    return success({
      id: staff.id,
      salonId: staff.salon_id,
      userId: staff.user_id,
      firstName: staff.first_name || user?.first_name,
      lastName: staff.last_name || user?.last_name,
      email: user?.email,
      phone: user?.phone,
      phoneSecondary: staff.phone_secondary,
      role: staff.role,
      title: staff.title,
      bio: staff.bio,
      avatarUrl: staff.avatar_url || user?.avatar_url,
      color: staff.color,
      displayOrder: staff.display_order,
      country: staff.country,
      birthday: staff.birthday,
      startDate: staff.start_date,
      endDate: staff.end_date,
      employmentType: staff.employment_type,
      notes: staff.notes,
      isActive: staff.is_active,
      isVisible: staff.is_visible,
      canPhysical: staff.can_physical,
      canMobile: staff.can_mobile,
      canVirtual: staff.can_virtual,
      homeLat: staff.home_lat != null ? Number(staff.home_lat) : null,
      homeLng: staff.home_lng != null ? Number(staff.home_lng) : null,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') {
      return error('Unauthorized', 401);
    }
    console.error('Get staff member error:', err);
    return error('Failed to get staff member', 500);
  }
}

// PUT /api/staff/[staffId] - Update staff member
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawStaffId } = await params;
  const staffId = decodeId(rawStaffId);
    const body = await request.json();

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return forbidden('Not authorized to update this staff member');
    }

    // ── Role hierarchy enforcement ──────────────────────────────────────────
    const ROLE_RANK = { staff: 1, receptionist: 2, manager: 3, owner: 4 };
    const targetRole = staff.role;

    // Determine the acting user's role at this salon
    let actorRole = null;
    if (session.role === 'admin') {
      actorRole = 'admin';
    } else if (staff.owner_id === session.userId) {
      actorRole = 'owner';
    } else {
      const actorStaff = await getOne(
        'SELECT role FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
        [staff.salon_id, session.userId]
      );
      actorRole = actorStaff?.role || null;
    }

    // Non-admin, non-owner cannot edit someone at or above their rank (unless editing themselves)
    const isSelf = staff.user_id === session.userId;
    if (actorRole !== 'admin' && actorRole !== 'owner' && !isSelf) {
      if ((ROLE_RANK[targetRole] || 0) >= (ROLE_RANK[actorRole] || 0)) {
        return forbidden('You cannot edit a team member at or above your role');
      }
    }

    // Nobody can change their own role (except admin)
    if (isSelf && body.role !== undefined && body.role !== staff.role && actorRole !== 'admin') {
      return forbidden('You cannot change your own role');
    }

    // Only owner or admin can change someone's role
    if (body.role !== undefined && body.role !== staff.role && actorRole !== 'owner' && actorRole !== 'admin') {
      return forbidden('Only the salon owner can change roles');
    }

    // Cannot change the owner's role
    if (targetRole === 'owner' && body.role !== undefined && body.role !== 'owner' && actorRole !== 'admin') {
      return forbidden('The owner role cannot be changed');
    }

    const {
      firstName,
      lastName,
      phone,
      phoneSecondary,
      email,
      title,
      bio,
      color,
      country,
      birthday,
      startDate,
      endDate,
      employmentType,
      notes,
      isActive,
      isVisible,
      role,
      canPhysical,
      canMobile,
      canVirtual,
      homeLat,
      homeLng,
    } = body;

    // ── Update users table (phone, email) with uniqueness checks ────────────
    if (phone !== undefined || email !== undefined) {
      const userUpdates = [];
      const userValues = [];

      if (phone !== undefined) {
        // Check phone uniqueness
        if (phone && phone.trim()) {
          const phoneConflict = await getOne(
            'SELECT id FROM users WHERE phone = ? AND id != ? AND deleted_at IS NULL LIMIT 1',
            [phone.trim(), staff.user_id]
          );
          if (phoneConflict) {
            return error({ code: 'PHONE_TAKEN', message: 'This phone number is already used by another account' }, 409);
          }
        }
        userUpdates.push('phone = ?');
        userValues.push(phone ? phone.trim() : null);
      }

      if (email !== undefined) {
        // Check email uniqueness
        if (email && email.trim()) {
          const emailConflict = await getOne(
            'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
            [email.trim().toLowerCase(), staff.user_id]
          );
          if (emailConflict) {
            return error({ code: 'EMAIL_TAKEN', message: 'This email is already used by another account' }, 409);
          }
        }
        userUpdates.push('email = ?');
        userValues.push(email ? email.trim().toLowerCase() : null);
      }

      if (userUpdates.length > 0) {
        userValues.push(staff.user_id);
        await query(
          `UPDATE users SET ${userUpdates.join(', ')}, updated_at = NOW() WHERE id = ?`,
          userValues
        );
      }
    }

    // ── Update staff table ──────────────────────────────────────────────────
    const updates = [];
    const values = [];

    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName);
    }
    if (phoneSecondary !== undefined) {
      updates.push('phone_secondary = ?');
      values.push(phoneSecondary);
    }
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }
    if (country !== undefined) {
      updates.push('country = ?');
      values.push(country);
    }
    if (birthday !== undefined) {
      updates.push('birthday = ?');
      values.push(birthday);
    }
    if (startDate !== undefined) {
      updates.push('start_date = ?');
      values.push(startDate);
    }
    if (endDate !== undefined) {
      updates.push('end_date = ?');
      values.push(endDate);
    }
    if (employmentType !== undefined) {
      updates.push('employment_type = ?');
      values.push(employmentType);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }
    if (isVisible !== undefined) {
      updates.push('is_visible = ?');
      values.push(isVisible ? 1 : 0);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (canPhysical !== undefined) {
      updates.push('can_physical = ?');
      values.push(canPhysical ? 1 : 0);
    }
    if (canMobile !== undefined) {
      updates.push('can_mobile = ?');
      values.push(canMobile ? 1 : 0);
    }
    if (canVirtual !== undefined) {
      updates.push('can_virtual = ?');
      values.push(canVirtual ? 1 : 0);
    }
    if (homeLat !== undefined) {
      updates.push('home_lat = ?');
      values.push(homeLat !== null && homeLat !== '' ? homeLat : null);
    }
    if (homeLng !== undefined) {
      updates.push('home_lng = ?');
      values.push(homeLng !== null && homeLng !== '' ? homeLng : null);
    }

    if (updates.length > 0) {
      values.push(staffId);
      await query(
        `UPDATE staff SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }

    // Get updated staff member
    const updatedStaff = await getOne(
      `SELECT s.*, u.first_name as user_first_name, u.last_name as user_last_name, 
              u.email, u.phone, u.avatar_url as user_avatar_url 
       FROM staff s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
      [staffId]
    );

    return success({
      id: updatedStaff.id,
      salonId: updatedStaff.salon_id,
      userId: updatedStaff.user_id,
      firstName: updatedStaff.first_name || updatedStaff.user_first_name,
      lastName: updatedStaff.last_name || updatedStaff.user_last_name,
      email: updatedStaff.email,
      phone: updatedStaff.phone,
      phoneSecondary: updatedStaff.phone_secondary,
      role: updatedStaff.role,
      title: updatedStaff.title,
      bio: updatedStaff.bio,
      avatarUrl: updatedStaff.avatar_url || updatedStaff.user_avatar_url,
      color: updatedStaff.color,
      displayOrder: updatedStaff.display_order,
      country: updatedStaff.country,
      birthday: updatedStaff.birthday,
      startDate: updatedStaff.start_date,
      endDate: updatedStaff.end_date,
      employmentType: updatedStaff.employment_type,
      notes: updatedStaff.notes,
      isActive: updatedStaff.is_active,
      isVisible: updatedStaff.is_visible,
      canPhysical: updatedStaff.can_physical,
      canMobile: updatedStaff.can_mobile,
      canVirtual: updatedStaff.can_virtual,
      homeLat: updatedStaff.home_lat != null ? Number(updatedStaff.home_lat) : null,
      homeLng: updatedStaff.home_lng != null ? Number(updatedStaff.home_lng) : null,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') {
      return error('Unauthorized', 401);
    }
    console.error('Update staff member error:', err);
    return error('Failed to update staff member', 500);
  }
}

// DELETE /api/staff/[staffId] - Delete/deactivate staff member
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawStaffId } = await params;
  const staffId = decodeId(rawStaffId);

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return forbidden('Not authorized to delete this staff member');
    }

    // ── Role hierarchy enforcement ──────────────────────────────────────────
    const ROLE_RANK = { staff: 1, receptionist: 2, manager: 3, owner: 4 };
    const targetRole = staff.role;

    // Cannot delete yourself
    if (staff.user_id === session.userId) {
      return forbidden('You cannot remove yourself from the team');
    }

    // Cannot delete the salon owner
    if (targetRole === 'owner') {
      return forbidden('The salon owner cannot be removed');
    }

    // Determine actor's role
    let actorRole = null;
    if (session.role === 'admin') {
      actorRole = 'admin';
    } else if (staff.owner_id === session.userId) {
      actorRole = 'owner';
    } else {
      const actorStaff = await getOne(
        'SELECT role FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
        [staff.salon_id, session.userId]
      );
      actorRole = actorStaff?.role || null;
    }

    // Non-admin, non-owner cannot delete someone at or above their rank
    if (actorRole !== 'admin' && actorRole !== 'owner') {
      if ((ROLE_RANK[targetRole] || 0) >= (ROLE_RANK[actorRole] || 0)) {
        return forbidden('You cannot remove a team member at or above your role');
      }
    }

    // Soft delete - just mark as inactive
    await query(
      'UPDATE staff SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [staffId]
    );

    return success({ message: 'Staff member deactivated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') {
      return error('Unauthorized', 401);
    }
    console.error('Delete staff member error:', err);
    return error('Failed to delete staff member', 500);
  }
}
