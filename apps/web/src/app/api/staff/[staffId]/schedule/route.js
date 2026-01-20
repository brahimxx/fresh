import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

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

// Day name to number mapping (0 = Sunday)
const DAY_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// GET /api/staff/[staffId]/schedule - Get staff schedule
export async function GET(request, { params }) {
  try {
    const { staffId } = await params;

    const workingHours = await query(
      'SELECT day_of_week, start_time, end_time FROM staff_working_hours WHERE staff_id = ? ORDER BY day_of_week',
      [staffId]
    );

    // Convert to schedule format expected by UI
    const schedule = workingHours.map((wh) => {
      // Convert day number back to day name
      const dayName = Object.keys(DAY_MAP).find((key) => DAY_MAP[key] === wh.day_of_week);
      
      return {
        day_of_week: dayName,
        is_working: true,
        start_time: wh.start_time,
        end_time: wh.end_time,
        break_start: null,
        break_end: null,
      };
    });

    return success(schedule);
  } catch (err) {
    console.error('Get schedule error:', err);
    return error('Failed to get schedule', 500);
  }
}

// PUT /api/staff/[staffId]/schedule - Update staff schedule
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId } = await params;

    const canManage = await canManageStaff(staffId, session.userId, session.role);
    if (!canManage) {
      return forbidden('Not authorized to manage schedule');
    }

    const body = await request.json();
    const { schedule } = body;

    if (!Array.isArray(schedule)) {
      return error('Schedule must be an array');
    }

    // Delete existing working hours
    await query('DELETE FROM staff_working_hours WHERE staff_id = ?', [staffId]);

    // Insert new working hours (only for enabled days)
    for (const day of schedule) {
      if (day.is_working && day.start_time && day.end_time) {
        const dayOfWeek = DAY_MAP[day.day_of_week];
        if (dayOfWeek !== undefined) {
          await query(
            'INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
            [staffId, dayOfWeek, day.start_time, day.end_time]
          );
        }
      }
    }

    // Return updated schedule
    const updatedHours = await query(
      'SELECT day_of_week, start_time, end_time FROM staff_working_hours WHERE staff_id = ? ORDER BY day_of_week',
      [staffId]
    );

    const updatedSchedule = updatedHours.map((wh) => {
      const dayName = Object.keys(DAY_MAP).find((key) => DAY_MAP[key] === wh.day_of_week);
      return {
        day_of_week: dayName,
        is_working: true,
        start_time: wh.start_time,
        end_time: wh.end_time,
        break_start: null,
        break_end: null,
      };
    });

    return success(updatedSchedule);
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update schedule error:', err);
    return error('Failed to update schedule', 500);
  }
}
