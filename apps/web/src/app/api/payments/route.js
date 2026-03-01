import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, notFound, forbidden } from '@/lib/response';

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
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [booking.salon_id, userId]
  );
  if (staff) return { access: true, booking };

  return { access: false, booking: null };
}

// GET /api/payments - Get payments for a salon (owner/manager only)
export async function GET(request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const salonId = searchParams.get('salonId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!salonId && session.role !== 'admin') {
      return error('Salon ID is required');
    }

    let sql = `
      SELECT p.*, b.client_id, b.start_datetime, u.first_name, u.last_name
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      JOIN users u ON u.id = b.client_id
      JOIN salons s ON s.id = b.salon_id
      WHERE 1=1
    `;
    const params = [];

    if (session.role === 'owner') {
      sql += ' AND s.owner_id = ?';
      params.push(session.userId);
    }

    if (salonId) {
      sql += ' AND b.salon_id = ?';
      params.push(salonId);
    }

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const payments = await query(sql, params);

    return success({
      payments: payments.map((p) => ({
        id: p.id,
        bookingId: p.booking_id,
        clientName: `${p.first_name} ${p.last_name}`,
        bookingDatetime: p.start_datetime,
        amount: p.amount,
        method: p.method,
        status: p.status,
        stripePaymentId: p.stripe_payment_id,
        createdAt: p.created_at,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get payments error:', err);
    return error('Failed to get payments', 500);
  }
}

// POST /api/payments - Create a payment for a booking
export async function POST(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { bookingId, amount, method, stripePaymentId } = body;

    if (!bookingId || amount === undefined || amount === null || isNaN(amount) || amount < 0 || !method) {
      return error('Booking ID, valid amount (>= 0), and method are required', 400);
    }

    const { access, booking } = await checkBookingAccess(bookingId, session.userId, session.role);

    // Also allow client to pay for their own booking
    const bookingCheck = await getOne('SELECT client_id FROM bookings WHERE id = ?', [bookingId]);
    if (!access && bookingCheck?.client_id !== session.userId) {
      return forbidden('Not authorized to create payment for this booking');
    }

    // Check if payment already exists
    const existingPayment = await getOne('SELECT id FROM payments WHERE booking_id = ?', [bookingId]);
    if (existingPayment) {
      return error('Payment already exists for this booking', 409);
    }

    const result = await query(
      `INSERT INTO payments (booking_id, amount, method, status, stripe_payment_id, created_at)
       VALUES (?, ?, ?, 'pending', ?, NOW())`,
      [bookingId, amount, method, stripePaymentId || null]
    );

    // If card payment with Stripe, set as paid immediately (assuming webhook confirmation)
    if (method === 'card' && stripePaymentId) {
      await query("UPDATE payments SET status = 'paid' WHERE id = ?", [result.insertId]);
    }

    return created({
      id: result.insertId,
      bookingId,
      amount,
      method,
      status: method === 'card' && stripePaymentId ? 'paid' : 'pending',
      stripePaymentId,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create payment error:', err);
    return error('Failed to create payment', 500);
  }
}
