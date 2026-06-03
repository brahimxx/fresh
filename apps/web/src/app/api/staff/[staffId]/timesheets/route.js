import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';
import { decodeId } from '@/lib/id';

// GET /api/staff/[staffId]/timesheets - Get timesheet history
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawId } = await params;
    const id = decodeId(rawId);

    // Get staff and verify access
    const staff = await getOne(
      `SELECT st.*, s.owner_id, u.first_name, u.last_name
       FROM staff st 
       JOIN salons s ON s.id = st.salon_id
       JOIN users u ON u.id = st.user_id
       WHERE st.id = ?`,
      [id]
    );

    if (!staff) {
      return error('Staff not found', 404);
    }

    // Staff can see their own, owners/managers can see their salon's staff
    if (session.role !== 'admin' && Number(staff.owner_id) !== Number(session.userId) && Number(staff.user_id) !== Number(session.userId)) {
      return forbidden('Not authorized to view this timesheet history');
    }

    const timesheets = await query(
      `SELECT ts.*, CONCAT(u.first_name, ' ', u.last_name) as approved_by_name
       FROM staff_timesheets ts
       LEFT JOIN users u ON u.id = ts.approved_by
       WHERE ts.staff_id = ? AND ts.deleted_at IS NULL
       ORDER BY ts.clock_in DESC`,
      [id]
    );

    return success(timesheets.map(ts => ({
      id: ts.id,
      staffId: ts.staff_id,
      salonId: ts.salon_id,
      clockIn: ts.clock_in,
      clockOut: ts.clock_out,
      breakDuration: ts.break_duration,
      totalHours: parseFloat(ts.total_hours || 0),
      notes: ts.notes,
      status: ts.status,
      approvedBy: ts.approved_by,
      approvedByName: ts.approved_by_name || null,
      approvedAt: ts.approved_at,
    })));
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get timesheets error:', err);
    return error('Failed to get timesheets', 500);
  }
}

// POST /api/staff/[staffId]/timesheets - Approve or manually create timesheet entries
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawId } = await params;
    const id = decodeId(rawId);

    // Get staff and verify access
    const staff = await getOne(
      `SELECT st.id, st.salon_id, st.user_id, s.owner_id
       FROM staff st 
       JOIN salons s ON s.id = st.salon_id
       WHERE st.id = ?`,
      [id]
    );

    if (!staff) {
      return error('Staff not found', 404);
    }

    // Only owner or admin can modify/approve timesheets
    if (session.role !== 'admin' && Number(staff.owner_id) !== Number(session.userId)) {
      return forbidden('Only the salon owner can modify or approve timesheet logs');
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'approve') {
      const { timesheetId } = body;
      if (!timesheetId) {
        return error('Timesheet ID is required for approval', 400);
      }

      await query(
        `UPDATE staff_timesheets 
         SET status = 'approved', approved_by = ?, approved_at = NOW() 
         WHERE id = ? AND staff_id = ?`,
        [session.userId, timesheetId, id]
      );

      return success({ message: 'Timesheet log approved successfully' });
    } 
    
    if (action === 'create') {
      const { clockIn, clockOut, breakDuration = 0, notes = '' } = body;
      
      if (!clockIn || !clockOut) {
        return error('Clock-in and Clock-out datetimes are required', 400);
      }

      const start = new Date(clockIn);
      const end = new Date(clockOut);
      const breakMins = parseInt(breakDuration);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return error('Invalid datetime format provided', 400);
      }

      if (end <= start) {
        return error('Clock-out time must be strictly after Clock-in time', 400);
      }

      if (isNaN(breakMins) || breakMins < 0) {
        return error('Break duration must be a non-negative integer', 400);
      }

      // Compute total hours: (end - start) in hours minus break hours
      const diffMs = end - start;
      const grossHours = diffMs / (1000 * 60 * 60);
      const netHours = Math.max(0, grossHours - (breakMins / 60));
      const totalHours = parseFloat(netHours.toFixed(2));

      await query(
        `INSERT INTO staff_timesheets 
         (staff_id, salon_id, clock_in, clock_out, break_duration, total_hours, notes, status, approved_by, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, NOW())`,
        [id, staff.salon_id, clockIn, clockOut, breakMins, totalHours, notes || null, session.userId]
      );

      return success({ message: 'Timesheet log entry added successfully' });
    }

    if (action === 'edit') {
      const { timesheetId, clockIn, clockOut, breakDuration = 0, notes = '' } = body;
      
      if (!timesheetId || !clockIn || !clockOut) {
        return error('Timesheet ID, Clock-in, and Clock-out are required', 400);
      }

      const start = new Date(clockIn);
      const end = new Date(clockOut);
      const breakMins = parseInt(breakDuration);

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start || isNaN(breakMins) || breakMins < 0) {
        return error('Invalid timesheet data provided', 400);
      }

      const diffMs = end - start;
      const grossHours = diffMs / (1000 * 60 * 60);
      const netHours = Math.max(0, grossHours - (breakMins / 60));
      const totalHours = parseFloat(netHours.toFixed(2));

      await query(
        `UPDATE staff_timesheets 
         SET clock_in = ?, clock_out = ?, break_duration = ?, total_hours = ?, notes = ?
         WHERE id = ? AND staff_id = ? AND deleted_at IS NULL`,
        [clockIn, clockOut, breakMins, totalHours, notes || null, timesheetId, id]
      );

      return success({ message: 'Timesheet log entry updated successfully' });
    }

    if (action === 'delete') {
      const { timesheetId } = body;
      if (!timesheetId) {
        return error('Timesheet ID is required for deletion', 400);
      }

      await query(
        `UPDATE staff_timesheets 
         SET deleted_at = NOW() 
         WHERE id = ? AND staff_id = ?`,
        [timesheetId, id]
      );

      return success({ message: 'Timesheet log entry removed successfully' });
    }

    return error('Invalid action provided', 400);
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update timesheet error:', err);
    return error('Failed to process timesheet update', 500);
  }
}
