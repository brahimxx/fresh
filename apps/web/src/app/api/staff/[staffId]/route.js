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
    const { staffId } = await params;

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return notFound('Staff member not found or access denied');
    }

    // Get user details
    const user = await getOne(
      `SELECT first_name, last_name, email, phone 
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
      avatarUrl: staff.avatar_url,
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
    const { staffId } = await params;
    const body = await request.json();

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return forbidden('Not authorized to update this staff member');
    }

    const {
      firstName,
      lastName,
      phoneSecondary,
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
    } = body;

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
              u.email, u.phone 
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
      avatarUrl: updatedStaff.avatar_url,
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
    const { staffId } = await params;

    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return forbidden('Not authorized to delete this staff member');
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
