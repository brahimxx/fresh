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
  const manager = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [staff.salon_id, userId]
  );
  return !!manager;
}

// GET /api/staff/[staffId]/time-off - Get staff time off
export async function GET(request, { params }) {
  try {
    const { staffId } = await params;
    const { searchParams } = new URL(request.url);
    const includePast = searchParams.get('includePast') === 'true';

    let sql = 'SELECT id, start_datetime, end_datetime, reason FROM staff_time_off WHERE staff_id = ?';
    const sqlParams = [staffId];

    if (!includePast) {
      sql += ' AND end_datetime >= NOW()';
    }

    sql += ' ORDER BY start_datetime';

    const timeOff = await query(sql, sqlParams);

    return success({
      timeOff: timeOff.map((to) => ({
        id: to.id,
        startDatetime: to.start_datetime,
        endDatetime: to.end_datetime,
        reason: to.reason,
      })),
    });
  } catch (err) {
    console.error('Get time off error:', err);
    return error('Failed to get time off', 500);
  }
}

// POST /api/staff/[staffId]/time-off - Add time off
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId } = await params;

    const canManage = await canManageStaff(staffId, session.userId, session.role);
    if (!canManage) {
      return forbidden('Not authorized to manage time off');
    }

    const body = await request.json();
    const { startDatetime, endDatetime, reason } = body;

    if (!startDatetime || !endDatetime) {
      return error('Start and end datetime are required');
    }

    const result = await query(
      'INSERT INTO staff_time_off (staff_id, start_datetime, end_datetime, reason) VALUES (?, ?, ?, ?)',
      [staffId, startDatetime, endDatetime, reason || null]
    );

    return created({
      id: result.insertId,
      startDatetime,
      endDatetime,
      reason,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Add time off error:', err);
    return error('Failed to add time off', 500);
  }
}

// DELETE /api/staff/[staffId]/time-off - Delete time off (pass timeOffId in body)
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId } = await params;

    const canManage = await canManageStaff(staffId, session.userId, session.role);
    if (!canManage) {
      return forbidden('Not authorized to manage time off');
    }

    const body = await request.json();
    const { timeOffId } = body;

    if (!timeOffId) {
      return error('Time off ID is required');
    }

    await query('DELETE FROM staff_time_off WHERE id = ? AND staff_id = ?', [timeOffId, staffId]);

    return success({ message: 'Time off deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete time off error:', err);
    return error('Failed to delete time off', 500);
  }
}
