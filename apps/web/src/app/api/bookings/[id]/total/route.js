import { getOne } from '@/lib/db';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden, notFound } from '@/lib/response';
import { calculateBookingTotal } from '@/lib/checkout';

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

// GET /api/bookings/[id]/total — Server-computed total breakdown
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: bookingId } = await params;

    const { access, booking } = await checkBookingAccess(bookingId, session.userId, session.role);
    if (!access) return forbidden('Not authorized');
    if (!booking) return notFound('Booking not found');

    const conn = await pool.getConnection();
    try {
      const breakdown = await calculateBookingTotal(bookingId, conn);
      return success({
        bookingId: Number(bookingId),
        status: booking.status,
        ...breakdown,
      });
    } finally {
      conn.release();
    }
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get booking total error:', err);
    return error('Failed to calculate total', 500);
  }
}
