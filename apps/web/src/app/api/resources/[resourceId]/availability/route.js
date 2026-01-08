import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// GET /api/resources/[resourceId]/availability - Get resource availability
export async function GET(request, { params }) {
  try {
    const { resourceId } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const resource = await getOne('SELECT * FROM resources WHERE id = ?', [resourceId]);

    if (!resource) {
      return notFound('Resource not found');
    }

    // Get bookings that use this resource on the specified date
    const bookings = await query(
      `SELECT b.start_datetime, b.end_datetime 
       FROM bookings b
       JOIN booking_resources br ON br.booking_id = b.id
       WHERE br.resource_id = ? AND DATE(b.start_datetime) = ? 
       AND b.status NOT IN ('cancelled', 'no_show')
       ORDER BY b.start_datetime`,
      [resourceId, date]
    );

    // Get salon working hours for the resource's salon
    const settings = await getOne(
      'SELECT working_hours_start, working_hours_end FROM salon_settings WHERE salon_id = ?',
      [resource.salon_id]
    );

    return success({
      resourceId: resource.id,
      date,
      workingHours: {
        start: settings?.working_hours_start || '09:00:00',
        end: settings?.working_hours_end || '18:00:00',
      },
      bookedSlots: bookings.map((b) => ({
        start: b.start_datetime,
        end: b.end_datetime,
      })),
    });
  } catch (err) {
    console.error('Get resource availability error:', err);
    return error('Failed to get resource availability', 500);
  }
}

// POST /api/resources/[resourceId]/availability - Block resource time
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { resourceId } = await params;

    const resource = await getOne(
      'SELECT r.*, s.owner_id FROM resources r JOIN salons s ON s.id = r.salon_id WHERE r.id = ?',
      [resourceId]
    );

    if (!resource) {
      return notFound('Resource not found');
    }

    if (session.role !== 'admin' && resource.owner_id !== session.userId) {
      return forbidden('Not authorized');
    }

    const body = await request.json();
    const { startTime, endTime, reason } = body;

    if (!startTime || !endTime) {
      return error('Start time and end time are required');
    }

    await query(
      `INSERT INTO resource_blocks (resource_id, start_time, end_time, reason, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [resourceId, startTime, endTime, reason || 'Maintenance']
    );

    return success({ message: 'Resource blocked successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Block resource error:', err);
    return error('Failed to block resource', 500);
  }
}
