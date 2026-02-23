import { query, getOne, transaction } from '@/lib/db';
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

    if (newStaffId) {
      const validStaff = await getOne(
        'SELECT id FROM staff WHERE id = ? AND salon_id = ? AND is_active = 1',
        [newStaffId, booking.salon_id]
      );
      if (!validStaff) {
        return error('The selected staff member does not exist or does not belong to this salon', 400);
      }
    }

    // Prepare formatters
    const pad = (n) => String(n).padStart(2, "0");
    const formatLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    // Execute atomic reschedule
    const result = await transaction(async (connection) => {
      // Lock the booking row
      const [lockedBookings] = await connection.query(
        'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
        [id]
      );

      if (!lockedBookings.length) {
        throw new Error('Booking not found during transaction');
      }

      const lockedBooking = lockedBookings[0];

      if (['completed', 'cancelled', 'no_show'].includes(lockedBooking.status)) {
        throw new Error(`Cannot reschedule a ${lockedBooking.status} booking`);
      }

      // Get booking duration and buffer
      const [durations] = await connection.query(
        `SELECT SUM(bs.duration_minutes) as total_duration, SUM(s.buffer_time_minutes) as total_buffer
         FROM booking_services bs
         JOIN services s ON s.id = bs.service_id
         WHERE bs.booking_id = ?`,
        [id]
      );
      const duration = durations[0];
      const totalDuration = parseInt(duration.total_duration || 60);
      const totalBuffer = parseInt(duration.total_buffer || 0);
      const newEnd = new Date(newStart.getTime() + (totalDuration + totalBuffer) * 60000);

      const staffId = newStaffId || lockedBooking.staff_id;
      const startDatetimeFormatted = formatLocal(newStart);
      const endDatetimeFormatted = formatLocal(newEnd);

      // 1. Time Off Check
      const [timeOffs] = await connection.query(
        `SELECT id FROM staff_time_off
         WHERE staff_id = ?
         AND start_datetime < ? AND end_datetime > ?
         FOR UPDATE`,
        [staffId, endDatetimeFormatted, startDatetimeFormatted]
      );

      if (timeOffs.length > 0) {
        throw new Error('Staff member has time off during this slot');
      }

      // 2. Working Hours Check
      const dayOfWeek = newStart.getDay();
      const timeString = `${pad(newStart.getHours())}:${pad(newStart.getMinutes())}:00`;
      const endTimeString = `${pad(newEnd.getHours())}:${pad(newEnd.getMinutes())}:00`;

      const [staffHours] = await connection.query(
        `SELECT start_time, end_time FROM staff_working_hours WHERE staff_id = ? AND day_of_week = ?`,
        [staffId, dayOfWeek]
      );

      let isWorking = false;
      if (staffHours.length > 0) {
        isWorking = timeString >= staffHours[0].start_time && endTimeString <= staffHours[0].end_time;
      } else {
        // Fallback to salon business hours
        const [businessHours] = await connection.query(
          `SELECT open_time as start_time, close_time as end_time FROM business_hours WHERE salon_id = ? AND day_of_week = ? AND is_closed = 0`,
          [lockedBooking.salon_id, dayOfWeek]
        );
        if (businessHours.length > 0) {
          isWorking = timeString >= businessHours[0].start_time && endTimeString <= businessHours[0].end_time;
        }
      }

      if (!isWorking) {
        throw new Error('Staff member is not working during this time slot');
      }

      // 3. Check existing booking overlap (Conflict Check)
      const [conflicts] = await connection.query(
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
         ) FOR UPDATE`,
        [id, endDatetimeFormatted, startDatetimeFormatted, staffId, staffId]
      );

      if (conflicts.length > 0) {
        throw new Error('The selected time slot is not available');
      }

      // Save old timing for records/audit if needed, then update
      await connection.query(
        `UPDATE bookings SET 
          start_datetime = ?, 
          end_datetime = ?,
          staff_id = ?,
          status = 'pending'
         WHERE id = ?`,
        [startDatetimeFormatted, endDatetimeFormatted, staffId, id]
      );

      // Create notification atomically
      const notifyUserId = isClient ? booking.owner_id : booking.client_id;
      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, data, created_at)
         VALUES (?, 'booking_rescheduled', 'Booking Rescheduled', ?, ?, NOW())`,
        [
          notifyUserId,
          `Booking has been rescheduled to ${newStart.toLocaleString()}`,
          JSON.stringify({ bookingId: id }),
        ]
      );

      return {
        startDatetimeFormatted,
        endDatetimeFormatted,
        staffId
      };
    });

    return success({
      message: 'Booking rescheduled successfully',
      booking: {
        id: parseInt(id),
        startTime: result.startDatetimeFormatted,
        endTime: result.endDatetimeFormatted,
        staffId: result.staffId,
        status: 'pending',
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();

    // Handle expected transaction errors cleanly
    if (
      err.message === 'The selected time slot is not available' ||
      err.message.startsWith('Cannot reschedule') ||
      err.message === 'Booking not found during transaction'
    ) {
      return error(err.message, 400);
    }

    console.error('Reschedule booking error:', err);
    return error('Failed to reschedule booking', 500);
  }
}
