import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// PUT /api/bookings/[id]/assign-staff - Reassign staff to booking
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

    // Only salon owner, manager, or admin can reassign staff
    const isOwner = booking.owner_id === session.userId;
    const isAdmin = session.role === 'admin';

    let isManager = false;
    if (!isOwner && !isAdmin) {
      const staff = await getOne(
        "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
        [booking.salon_id, session.userId]
      );
      isManager = !!staff;
    }

    if (!isOwner && !isAdmin && !isManager) {
      return forbidden('Not authorized to assign staff');
    }

    // Check if booking can be modified
    if (['completed', 'cancelled', 'no_show'].includes(booking.status)) {
      return error(`Cannot modify a ${booking.status} booking`);
    }

    const body = await request.json();
    const { staffId } = body;

    if (!staffId) {
      return error('Staff ID is required');
    }

    // Verify staff exists and belongs to the salon
    const newStaff = await getOne(
      'SELECT st.id, u.first_name, u.last_name FROM staff st JOIN users u ON u.id = st.user_id WHERE st.id = ? AND st.salon_id = ? AND st.is_active = 1',
      [staffId, booking.salon_id]
    );

    if (!newStaff) {
      return error('Staff not found or inactive', 404);
    }

    // Check if staff can perform the booked services
    const services = await query('SELECT service_id FROM booking_services WHERE booking_id = ?', [id]);

    for (const svc of services) {
      const canPerform = await getOne(
        'SELECT id FROM service_staff WHERE staff_id = ? AND service_id = ?',
        [staffId, svc.service_id]
      );
      if (!canPerform) {
        return error(`Staff cannot perform all booked services`);
      }
    }

    // Check for conflicts
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
      [id, booking.end_datetime, booking.start_datetime, staffId, staffId]
    );

    if (conflict) {
      return error('Staff has a conflicting booking at this time');
    }

    // Update booking
    await query('UPDATE bookings SET staff_id = ? WHERE id = ?', [staffId, id]);

    // Notify the client
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data, created_at)
       VALUES (?, 'staff_changed', 'Staff Assignment Changed', ?, ?, NOW())`,
      [
        booking.client_id,
        `Your appointment will now be with ${newStaff.first_name} ${newStaff.last_name}`,
        JSON.stringify({ bookingId: id, staffId }),
      ]
    );

    return success({
      message: 'Staff assigned successfully',
      booking: {
        id: parseInt(id),
        staffId,
        staffName: `${newStaff.first_name} ${newStaff.last_name}`,
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Assign staff error:', err);
    return error('Failed to assign staff', 500);
  }
}
