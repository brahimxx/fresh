import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// Helper to check booking access
async function checkBookingAccess(bookingId, userId, role) {
  const booking = await getOne(
    `SELECT b.*, s.owner_id
     FROM bookings b
     JOIN salons s ON s.id = b.salon_id
     WHERE b.id = ?`,
    [bookingId]
  );

  if (!booking) return { access: false, booking: null };

  if (role === 'admin') return { access: true, booking };
  if (booking.client_id === userId) return { access: true, booking };
  if (booking.owner_id === userId) return { access: true, booking };

  // Check if staff member
  const staff = await getOne(
    'SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
    [booking.salon_id, userId]
  );
  if (staff) return { access: true, booking };

  return { access: false, booking: null };
}

// GET /api/bookings/[id] - Get booking details
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const { access, booking } = await checkBookingAccess(id, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to view this booking');
    }

    // Get client info
    const client = await getOne(
      'SELECT id, first_name, last_name, email, phone FROM users WHERE id = ?',
      [booking.client_id]
    );

    // Get staff info
    let staff = null;
    if (booking.staff_id) {
      staff = await getOne(
        `SELECT st.id, st.role, u.first_name, u.last_name
         FROM staff st
         JOIN users u ON u.id = st.user_id
         WHERE st.id = ?`,
        [booking.staff_id]
      );
    }

    // Get salon info
    const salon = await getOne('SELECT id, name, address, city, phone FROM salons WHERE id = ?', [booking.salon_id]);

    // Get booking services
    const services = await query(
      `SELECT bs.*, sv.name as service_name
       FROM booking_services bs
       JOIN services sv ON sv.id = bs.service_id
       WHERE bs.booking_id = ?`,
      [id]
    );

    // Get payment info
    const payment = await getOne('SELECT * FROM payments WHERE booking_id = ?', [id]);

    return success({
      id: booking.id,
      salon: {
        id: salon.id,
        name: salon.name,
        address: salon.address,
        city: salon.city,
        phone: salon.phone,
      },
      client: {
        id: client.id,
        firstName: client.first_name,
        lastName: client.last_name,
        email: client.email,
        phone: client.phone,
      },
      staff: staff
        ? {
            id: staff.id,
            firstName: staff.first_name,
            lastName: staff.last_name,
            role: staff.role,
          }
        : null,
      startDatetime: booking.start_datetime,
      endDatetime: booking.end_datetime,
      status: booking.status,
      source: booking.source,
      createdAt: booking.created_at,
      services: services.map((s) => ({
        id: s.service_id,
        name: s.service_name,
        price: s.price,
        duration: s.duration_minutes,
      })),
      payment: payment
        ? {
            id: payment.id,
            amount: payment.amount,
            method: payment.method,
            status: payment.status,
            createdAt: payment.created_at,
          }
        : null,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get booking error:', err);
    return error('Failed to get booking', 500);
  }
}

// PUT /api/bookings/[id] - Update booking status
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const { access, booking } = await checkBookingAccess(id, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to update this booking');
    }

    const body = await request.json();
    const { status, staffId, startDatetime } = body;

    // Validate status transition
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled', 'no_show'],
      completed: [],
      cancelled: [],
      no_show: [],
    };

    if (status && !validTransitions[booking.status]?.includes(status)) {
      return error(`Cannot transition from ${booking.status} to ${status}`);
    }

    // Build update query
    const updates = [];
    const updateParams = [];

    if (status) {
      updates.push('status = ?');
      updateParams.push(status);
    }

    if (staffId) {
      updates.push('staff_id = ?');
      updateParams.push(staffId);
    }

    if (startDatetime) {
      // Recalculate end datetime
      const services = await query(
        'SELECT duration_minutes FROM booking_services WHERE booking_id = ?',
        [id]
      );
      const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
      const startDate = new Date(startDatetime);
      const endDate = new Date(startDate.getTime() + totalDuration * 60000);
      const endDatetime = endDate.toISOString().slice(0, 19).replace('T', ' ');

      updates.push('start_datetime = ?', 'end_datetime = ?');
      updateParams.push(startDatetime, endDatetime);
    }

    if (updates.length === 0) {
      return error('No updates provided');
    }

    updateParams.push(id);
    await query(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`, updateParams);

    const updatedBooking = await getOne('SELECT * FROM bookings WHERE id = ?', [id]);

    return success({
      id: updatedBooking.id,
      staffId: updatedBooking.staff_id,
      startDatetime: updatedBooking.start_datetime,
      endDatetime: updatedBooking.end_datetime,
      status: updatedBooking.status,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update booking error:', err);
    return error('Failed to update booking', 500);
  }
}

// DELETE /api/bookings/[id] - Cancel booking
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const { access, booking } = await checkBookingAccess(id, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to cancel this booking');
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return error('Cannot cancel a booking that is already completed or cancelled');
    }

    // Check cancellation policy
    const settings = await getOne('SELECT * FROM salon_settings WHERE salon_id = ?', [booking.salon_id]);
    if (settings) {
      const bookingStart = new Date(booking.start_datetime);
      const now = new Date();
      const hoursUntilBooking = (bookingStart - now) / (1000 * 60 * 60);

      if (hoursUntilBooking < settings.cancellation_policy_hours && session.role === 'client') {
        // Could apply cancellation fee here
        // For now, just warn or allow with fee
      }
    }

    await query("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);

    return success({ message: 'Booking cancelled successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Cancel booking error:', err);
    return error('Failed to cancel booking', 500);
  }
}
