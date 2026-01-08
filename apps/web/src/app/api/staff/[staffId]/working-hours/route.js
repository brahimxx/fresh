import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';

// Helper to check if user can manage this staff
async function canManageStaff(staffId, userId, role) {
  if (role === 'admin') return true;
  const staff = await getOne(
    `SELECT st.*, s.owner_id 
     FROM staff st 
     JOIN salons s ON s.id = st.salon_id 
     WHERE st.id = ?`,
    [staffId]
  );
  if (!staff) return false;
  if (staff.owner_id === userId) return true;
  if (staff.user_id === userId) return true;
  // Check if manager at same salon
  const manager = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [staff.salon_id, userId]
  );
  return !!manager;
}

// GET /api/staff/[staffId]/working-hours - Get staff working hours
export async function GET(request, { params }) {
  try {
    const { staffId } = await params;

    const workingHours = await query(
      'SELECT id, day_of_week, start_time, end_time FROM staff_working_hours WHERE staff_id = ? ORDER BY day_of_week',
      [staffId]
    );

    return success({
      workingHours: workingHours.map((wh) => ({
        id: wh.id,
        dayOfWeek: wh.day_of_week,
        startTime: wh.start_time,
        endTime: wh.end_time,
      })),
    });
  } catch (err) {
    console.error('Get working hours error:', err);
    return error('Failed to get working hours', 500);
  }
}

// POST /api/staff/[staffId]/working-hours - Add working hours
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId } = await params;

    const canManage = await canManageStaff(staffId, session.userId, session.role);
    if (!canManage) {
      return forbidden('Not authorized to manage working hours');
    }

    const body = await request.json();
    const { dayOfWeek, startTime, endTime } = body;

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return error('Day of week, start time, and end time are required');
    }

    // Check for existing entry for this day
    const existing = await getOne(
      'SELECT id FROM staff_working_hours WHERE staff_id = ? AND day_of_week = ?',
      [staffId, dayOfWeek]
    );

    if (existing) {
      // Update existing
      await query(
        'UPDATE staff_working_hours SET start_time = ?, end_time = ? WHERE id = ?',
        [startTime, endTime, existing.id]
      );
      return success({
        id: existing.id,
        dayOfWeek,
        startTime,
        endTime,
      });
    }

    const result = await query(
      'INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
      [staffId, dayOfWeek, startTime, endTime]
    );

    return created({
      id: result.insertId,
      dayOfWeek,
      startTime,
      endTime,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Add working hours error:', err);
    return error('Failed to add working hours', 500);
  }
}

// PUT /api/staff/[staffId]/working-hours - Bulk update working hours
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId } = await params;

    const canManage = await canManageStaff(staffId, session.userId, session.role);
    if (!canManage) {
      return forbidden('Not authorized to manage working hours');
    }

    const body = await request.json();
    const { workingHours } = body;

    if (!Array.isArray(workingHours)) {
      return error('Working hours must be an array');
    }

    // Delete existing working hours
    await query('DELETE FROM staff_working_hours WHERE staff_id = ?', [staffId]);

    // Insert new working hours
    for (const wh of workingHours) {
      await query(
        'INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
        [staffId, wh.dayOfWeek, wh.startTime, wh.endTime]
      );
    }

    const updatedHours = await query(
      'SELECT id, day_of_week, start_time, end_time FROM staff_working_hours WHERE staff_id = ? ORDER BY day_of_week',
      [staffId]
    );

    return success({
      workingHours: updatedHours.map((wh) => ({
        id: wh.id,
        dayOfWeek: wh.day_of_week,
        startTime: wh.start_time,
        endTime: wh.end_time,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update working hours error:', err);
    return error('Failed to update working hours', 500);
  }
}
