import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden, notFound } from '@/lib/response';

// POST /api/bookings/[id]/mark-paid — Mark a booking as paid (cash/manual)
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: bookingId } = await params;

    // Check access
    const booking = await getOne(
      `SELECT b.id, b.salon_id, b.status, s.owner_id
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       WHERE b.id = ? AND b.deleted_at IS NULL`,
      [bookingId]
    );

    if (!booking) return notFound('Booking not found');

    // Only owner, admin, or staff of the salon can mark as paid
    if (session.role !== 'admin' && booking.owner_id !== session.userId) {
      const staff = await getOne(
        'SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
        [booking.salon_id, session.userId]
      );
      if (!staff) return forbidden('Not authorized');
    }

    const body = await request.json().catch(() => ({}));
    const method = body.method || 'cash';
    const notes = body.notes || null;

    // Check if a payment record already exists
    const existingPayment = await getOne(
      'SELECT id, status FROM payments WHERE booking_id = ?',
      [bookingId]
    );

    if (existingPayment && existingPayment.status === 'paid') {
      return error({ code: 'ALREADY_PAID', message: 'This booking is already marked as paid' }, 400);
    }

    // Get the booking total
    const totalRow = await getOne(
      `SELECT COALESCE(SUM(bs.price), 0) as total FROM booking_services bs WHERE bs.booking_id = ?`,
      [bookingId]
    );
    const travelFeeRow = await getOne(
      'SELECT travel_fee_amount FROM bookings WHERE id = ?',
      [bookingId]
    );
    const amount = parseFloat(totalRow?.total || 0) + parseFloat(travelFeeRow?.travel_fee_amount || 0);

    if (existingPayment) {
      // Update existing payment record
      await query(
        "UPDATE payments SET status = 'paid', method = ?, notes = ? WHERE booking_id = ?",
        [method, notes, bookingId]
      );
    } else {
      // Create new payment record
      await query(
        "INSERT INTO payments (booking_id, amount, method, status, notes) VALUES (?, ?, ?, 'paid', ?)",
        [bookingId, amount.toFixed(2), method, notes]
      );
    }

    // Mark booking as completed (service was delivered, payment collected)
    await query(
      "UPDATE bookings SET status = 'completed' WHERE id = ? AND status IN ('confirmed', 'pending')",
      [bookingId]
    );

    return success({ message: 'Payment recorded successfully', amount });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Mark paid error:', err);
    return error('Failed to record payment', 500);
  }
}
