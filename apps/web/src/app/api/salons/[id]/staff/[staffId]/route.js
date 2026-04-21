import { query, getOne } from '@/lib/db';
import { decodeId } from '@/lib/id';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';
import { PERMISSION_KEYS } from '@/lib/permissions';

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  if (salon && salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// GET /api/salons/[id]/staff/[staffId] - Get specific staff member
export async function GET(request, { params }) {
  try {
    const rawParams = await params;
    const id = decodeId(rawParams.id);
    const staffId = decodeId(rawParams.staffId);

    const staff = await getOne(
      `SELECT st.*, st.first_name as st_first_name, st.last_name as st_last_name, u.first_name, u.last_name, u.email, u.phone
       FROM staff st
       JOIN users u ON u.id = st.user_id
       WHERE st.id = ? AND st.salon_id = ?`,
      [staffId, id]
    );

    if (!staff) {
      return notFound('Staff member not found');
    }

    // Get working hours
    const workingHours = await query(
      'SELECT id, day_of_week, start_time, end_time FROM staff_working_hours WHERE staff_id = ? ORDER BY day_of_week',
      [staffId]
    );

    // Get time off
    const timeOff = await query(
      'SELECT id, start_datetime, end_datetime, reason FROM staff_time_off WHERE staff_id = ? AND end_datetime >= NOW() ORDER BY start_datetime',
      [staffId]
    );

    // Get services this staff can perform
    const services = await query(
      `SELECT s.id, s.name, s.duration_minutes, s.price
       FROM service_staff ss
       JOIN services s ON s.id = ss.service_id
       WHERE ss.staff_id = ?`,
      [staffId]
    );

    // Parse permissions JSON
    const parsedPermissions = staff.permissions
      ? (typeof staff.permissions === 'string' ? JSON.parse(staff.permissions) : staff.permissions)
      : null;

    return success({
      id: staff.id,
      userId: staff.user_id,
      firstName: staff.st_first_name || staff.first_name,
      lastName: staff.st_last_name || staff.last_name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      isActive: staff.is_active,
      permissions: parsedPermissions,
      workingHours: workingHours.map((wh) => ({
        id: wh.id,
        dayOfWeek: wh.day_of_week,
        startTime: wh.start_time,
        endTime: wh.end_time,
      })),
      timeOff: timeOff.map((to) => ({
        id: to.id,
        startDatetime: to.start_datetime,
        endDatetime: to.end_datetime,
        reason: to.reason,
      })),
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        duration: s.duration_minutes,
        price: s.price,
      })),
    });
  } catch (err) {
    console.error('Get staff member error:', err);
    return error('Failed to get staff member', 500);
  }
}

// PUT /api/salons/[id]/staff/[staffId] - Update staff member
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const rawParams = await params;
    const id = decodeId(rawParams.id);
    const staffId = decodeId(rawParams.staffId);

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to update staff');
    }

    const body = await request.json();
    const { role, isActive, permissions } = body;

    // If permissions are being set, only the salon owner can do this
    if (permissions !== undefined) {
      const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [id]);
      if (!salon || salon.owner_id !== session.userId) {
        // Admins can also set permissions
        if (session.role !== 'admin') {
          return forbidden('Only the salon owner can edit staff permissions');
        }
      }

      // Validate permission keys
      if (permissions !== null && typeof permissions === 'object') {
        const validKeys = Object.keys(PERMISSION_KEYS);
        for (const key of Object.keys(permissions)) {
          if (!validKeys.includes(key)) {
            return error(`Invalid permission key: ${key}`, 400);
          }
          if (typeof permissions[key] !== 'boolean') {
            return error(`Permission value must be boolean for key: ${key}`, 400);
          }
        }
      }
    }

    // Build update query dynamically
    const updates = [];
    const updateParams = [];

    if (role !== undefined) {
      updates.push('role = ?');
      updateParams.push(role);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      updateParams.push(isActive);
    }
    if (permissions !== undefined) {
      updates.push('permissions = ?');
      updateParams.push(permissions === null ? null : JSON.stringify(permissions));
    }

    if (updates.length > 0) {
      updateParams.push(staffId, id);
      await query(
        `UPDATE staff SET ${updates.join(', ')} WHERE id = ? AND salon_id = ?`,
        updateParams
      );
    }

    const staff = await getOne(
      `SELECT st.*, st.first_name as st_first_name, st.last_name as st_last_name, u.first_name, u.last_name
       FROM staff st
       JOIN users u ON u.id = st.user_id
       WHERE st.id = ?`,
      [staffId]
    );

    const parsedPerms = staff.permissions
      ? (typeof staff.permissions === 'string' ? JSON.parse(staff.permissions) : staff.permissions)
      : null;

    return success({
      id: staff.id,
      userId: staff.user_id,
      firstName: staff.st_first_name || staff.first_name,
      lastName: staff.st_last_name || staff.last_name,
      role: staff.role,
      isActive: staff.is_active,
      permissions: parsedPerms,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update staff error:', err);
    return error('Failed to update staff', 500);
  }
}

// DELETE /api/salons/[id]/staff/[staffId] - Remove staff from salon
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const rawParams = await params;
    const id = decodeId(rawParams.id);
    const staffId = decodeId(rawParams.staffId);

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to remove staff');
    }

    // Clear schedule data (config/join tables — hard-delete acceptable)
    await query('DELETE FROM staff_working_hours WHERE staff_id = ?', [staffId]);
    await query('DELETE FROM staff_time_off WHERE staff_id = ?', [staffId]);
    await query('DELETE FROM service_staff WHERE staff_id = ?', [staffId]);
    // Soft-delete the staff record itself
    await query('UPDATE staff SET is_active = 0 WHERE id = ? AND salon_id = ?', [staffId, id]);

    return success({ message: 'Staff member removed successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Remove staff error:', err);
    return error('Failed to remove staff', 500);
  }
}
