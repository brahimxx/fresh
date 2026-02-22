import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// PUT /api/bookings/[id]/reschedule - Reschedule a booking
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const booking = await getOne(
      'SELECT b.*, s.owner_id FROM bookings b JOIN salons s ON s.id = b.salon_id WHERE b.id = ?',
      [id]
    );

    if (!booking) {
      return error('Booking not found', 404);
    }

    // Check authorization (client, salon owner, or staff)
    const isClient = booking.client_id === session.userId;
    const isOwner = booking.owner_id === session.userId;
    const isAdmin = session.role === 'admin';

    let isStaff = false;
    if (!isClient && !isOwner && !isAdmin) {
      const staff = await getOne(
        'SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
        [booking.salon_id, session.userId]
      );
      isStaff = !!staff;
    }

    if (!isClient && !isOwner && !isAdmin && !isStaff) {
      return forbidden('Not authorized to reschedule this booking');
    }

    // Check if booking can be rescheduled
    if (['completed', 'cancelled', 'no_show'].includes(booking.status)) {
      return error(`Cannot reschedule a ${booking.status} booking`);
    }

    const body = await request.json();
    const { newStartTime, newStaffId } = body;

    if (!newStartTime) {
      return error('New start time is required');
    }

    const newStart = new Date(String(newStartTime).replace(' ', 'T'));
    const now = new Date();

    if (newStart <= now) {
      return error('New time must be in the future');
    }

    // Get booking duration and buffer
    const [duration] = await query(
      `SELECT SUM(bs.duration_minutes) as total_duration, SUM(s.buffer_time_minutes) as total_buffer
       FROM booking_services bs
       JOIN services s ON s.id = bs.service_id
       WHERE bs.booking_id = ?`,
      [id]
    );
    const totalDuration = parseInt(duration.total_duration || 60);
    const totalBuffer = parseInt(duration.total_buffer || 0);
    const newEnd = new Date(newStart.getTime() + (totalDuration + totalBuffer) * 60000);

    // Check staff availability
    const staffId = newStaffId || booking.staff_id;

    // Format as local time
    const pad = (n) => String(n).padStart(2, "0");
    const startDatetimeFormatted = `${newStart.getFullYear()}-${pad(newStart.getMonth() + 1)}-${pad(newStart.getDate())} ${pad(newStart.getHours())}:${pad(newStart.getMinutes())}:${pad(newStart.getSeconds())}`;
    const endDatetimeFormatted = `${newEnd.getFullYear()}-${pad(newEnd.getMonth() + 1)}-${pad(newEnd.getDate())} ${pad(newEnd.getHours())}:${pad(newEnd.getMinutes())}:${pad(newEnd.getSeconds())}`;

    const conflict = await getOne(
      `SELECT b.id FROM bookings b
       WHERE b.id != ?
       AND b.status IN ('pending', 'confirmed')
       AND b.deleted_at IS NULL
       AND b.start_datetime < ? AND b.end_datetime > ?
       AND (
         b.staff_id = ?
         OR EXISTS (
           SELECT 1 FROM booking_services bs
           WHERE bs.booking_id = b.id AND bs.staff_id = ?
         )
       )`,
      [id, endDatetimeFormatted, startDatetimeFormatted, staffId, staffId]
    );

    if (conflict) {
      return error('The selected time slot is not available');
    }

    // Update booking
    await query(
      `UPDATE bookings SET 
        start_datetime = ?, 
        end_datetime = ?,
        staff_id = ?,
        status = 'pending'
       WHERE id = ?`,
      [startDatetimeFormatted, endDatetimeFormatted, staffId, id]
    );

    // Create notification
    const notifyUserId = isClient ? booking.owner_id : booking.client_id;
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data, created_at)
       VALUES (?, 'booking_rescheduled', 'Booking Rescheduled', ?, ?, NOW())`,
      [
        notifyUserId,
        `Booking has been rescheduled to ${newStart.toLocaleString()}`,
        JSON.stringify({ bookingId: id }),
      ]
    );

    return success({
      message: 'Booking rescheduled successfully',
      booking: {
        id: parseInt(id),
        startTime: startDatetimeFormatted,
        endTime: endDatetimeFormatted,
        staffId,
        status: 'pending',
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Reschedule booking error:', err);
    return error('Failed to reschedule booking', 500);
  }
}
