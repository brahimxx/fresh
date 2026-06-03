import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';
import { decodeId } from '@/lib/id';
import { parseISO, eachDayOfInterval, format, getDay, startOfDay, endOfDay } from 'date-fns';

export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawId } = await params;
    const id = decodeId(rawId);

    // Get staff and verify access
    const staff = await getOne(
      `SELECT st.id, st.salon_id, s.owner_id
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
      return forbidden('Only the salon owner can auto-fill timesheet logs');
    }

    const body = await request.json();
    const { startDate, endDate, defaultBreakMinutes = 0 } = body;

    if (!startDate || !endDate) {
      return error('Start date and end date are required', 400);
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return error('Invalid date range provided', 400);
    }

    const breakMins = parseInt(defaultBreakMinutes);
    if (isNaN(breakMins) || breakMins < 0) {
      return error('Break duration must be a non-negative integer', 400);
    }

    // 1. Fetch staff roster
    const shifts = await query(
      `SELECT day_of_week, start_time, end_time 
       FROM staff_working_hours 
       WHERE staff_id = ?`,
      [id]
    );

    if (shifts.length === 0) {
      return error('Staff member has no working hours configured. Cannot auto-fill.', 400);
    }

    // Map shifts by day of week
    const shiftMap = {};
    shifts.forEach(s => {
      shiftMap[s.day_of_week] = s;
    });

    // 2. Fetch existing timesheets for this date range to prevent duplicates
    const startStr = format(startOfDay(start), "yyyy-MM-dd HH:mm:ss");
    const endStr = format(endOfDay(end), "yyyy-MM-dd HH:mm:ss");

    const existingLogs = await query(
      `SELECT clock_in 
       FROM staff_timesheets 
       WHERE staff_id = ? 
       AND deleted_at IS NULL 
       AND clock_in >= ? AND clock_in <= ?`,
      [id, startStr, endStr]
    );

    const existingDates = new Set(existingLogs.map(log => {
      const d = new Date(log.clock_in);
      return format(d, 'yyyy-MM-dd');
    }));

    // 3. Iterate through dates and generate new logs
    const days = eachDayOfInterval({ start, end });
    const logsToInsert = [];
    const now = new Date();

    for (const day of days) {
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // Skip if timesheet already exists for this date
      if (existingDates.has(dateStr)) continue;

      const dayOfWeek = getDay(day); // 0 (Sunday) to 6 (Saturday)
      const shift = shiftMap[dayOfWeek];

      // Skip if staff doesn't work on this day
      if (!shift) continue;

      // Construct Date objects for clock in/out to calculate hours
      const clockInStr = `${dateStr}T${shift.start_time}`;
      const clockOutStr = `${dateStr}T${shift.end_time}`;
      
      const clockInDate = new Date(clockInStr);
      const clockOutDate = new Date(clockOutStr);
      
      // Calculate gross hours from the date differences
      const diffMs = clockOutDate - clockInDate;
      const grossHours = diffMs / (1000 * 60 * 60);
      const netHours = Math.max(0, grossHours - (breakMins / 60));
      const totalHours = parseFloat(netHours.toFixed(2));

      // Ensure clock out is after clock in
      if (clockOutDate <= clockInDate) continue;

      logsToInsert.push([
        id,
        staff.salon_id,
        format(clockInDate, 'yyyy-MM-dd HH:mm:ss'),
        format(clockOutDate, 'yyyy-MM-dd HH:mm:ss'),
        breakMins,
        totalHours,
        'Auto-filled from schedule.',
        'approved',
        session.userId,
        format(now, 'yyyy-MM-dd HH:mm:ss')
      ]);
    }

    if (logsToInsert.length === 0) {
      return success({ 
        message: 'No timesheets were generated. They either already exist or the staff has no shifts scheduled during this period.',
        count: 0
      });
    }

    // 4. Bulk Insert
    await transaction(async (conn) => {
      await conn.query(
        `INSERT INTO staff_timesheets 
         (staff_id, salon_id, clock_in, clock_out, break_duration, total_hours, notes, status, approved_by, approved_at)
         VALUES ?`,
        [logsToInsert]
      );
    });

    return success({ 
      message: `Successfully auto-filled ${logsToInsert.length} timesheet${logsToInsert.length === 1 ? '' : 's'}.`,
      count: logsToInsert.length
    });

  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Auto-fill timesheets error:', err);
    return error('Failed to auto-fill timesheets', 500);
  }
}
