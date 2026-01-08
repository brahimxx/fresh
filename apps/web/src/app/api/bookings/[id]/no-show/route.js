import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

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
  if (booking.owner_id === userId) return { access: true, booking };

  const staff = await getOne(
    'SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
    [booking.salon_id, userId]
  );
  if (staff) return { access: true, booking };

  return { access: false, booking: null };
}

// POST /api/bookings/[id]/no-show - Mark booking as no-show
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const { access, booking } = await checkBookingAccess(id, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to mark this booking as no-show');
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return error(`Cannot mark as no-show for booking with status: ${booking.status}`);
    }

    await query("UPDATE bookings SET status = 'no_show' WHERE id = ?", [id]);

    // Check for no-show fee in salon settings
    const settings = await getOne('SELECT no_show_fee FROM salon_settings WHERE salon_id = ?', [booking.salon_id]);

    let feeApplied = null;
    if (settings && settings.no_show_fee > 0) {
      // Create a platform fee for no-show
      await query(
        "INSERT INTO platform_fees (booking_id, salon_id, type, amount, is_paid) VALUES (?, ?, 'new_client', ?, 0)",
        [id, booking.salon_id, settings.no_show_fee]
      );
      feeApplied = settings.no_show_fee;
    }

    return success({
      id: booking.id,
      status: 'no_show',
      noShowFee: feeApplied,
      message: 'Booking marked as no-show',
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('No-show booking error:', err);
    return error('Failed to mark as no-show', 500);
  }
}
