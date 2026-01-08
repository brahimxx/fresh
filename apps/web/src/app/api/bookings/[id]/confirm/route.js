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

// POST /api/bookings/[id]/confirm - Confirm a booking
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const { access, booking } = await checkBookingAccess(id, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to confirm this booking');
    }

    if (booking.status !== 'pending') {
      return error(`Cannot confirm booking with status: ${booking.status}`);
    }

    await query("UPDATE bookings SET status = 'confirmed' WHERE id = ?", [id]);

    // TODO: Send confirmation notification to client

    return success({
      id: booking.id,
      status: 'confirmed',
      message: 'Booking confirmed successfully',
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Confirm booking error:', err);
    return error('Failed to confirm booking', 500);
  }
}
