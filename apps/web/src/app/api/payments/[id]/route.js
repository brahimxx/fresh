import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// Helper to check payment access
async function checkPaymentAccess(paymentId, userId, role) {
  const payment = await getOne(
    `SELECT p.*, b.salon_id, b.client_id, s.owner_id
     FROM payments p
     JOIN bookings b ON b.id = p.booking_id
     JOIN salons s ON s.id = b.salon_id
     WHERE p.id = ?`,
    [paymentId]
  );

  if (!payment) return { access: false, payment: null };

  if (role === 'admin') return { access: true, payment };
  if (payment.owner_id === userId) return { access: true, payment };
  if (payment.client_id === userId) return { access: true, payment };

  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [payment.salon_id, userId]
  );
  if (staff) return { access: true, payment };

  return { access: false, payment: null };
}

// GET /api/payments/[id] - Get payment details
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const { access, payment } = await checkPaymentAccess(id, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to view this payment');
    }

    return success({
      id: payment.id,
      bookingId: payment.booking_id,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      stripePaymentId: payment.stripe_payment_id,
      createdAt: payment.created_at,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get payment error:', err);
    return error('Failed to get payment', 500);
  }
}

// PUT /api/payments/[id] - Update payment status
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const { access, payment } = await checkPaymentAccess(id, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to update this payment');
    }

    const body = await request.json();
    const { status } = body;

    if (!['pending', 'paid', 'refunded'].includes(status)) {
      return error('Invalid payment status');
    }

    await query('UPDATE payments SET status = ? WHERE id = ?', [status, id]);

    return success({
      id: payment.id,
      bookingId: payment.booking_id,
      amount: payment.amount,
      method: payment.method,
      status,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update payment error:', err);
    return error('Failed to update payment', 500);
  }
}

// POST /api/payments/[id]/refund - Refund a payment
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const { access, payment } = await checkPaymentAccess(id, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to refund this payment');
    }

    if (payment.status !== 'paid') {
      return error('Can only refund paid payments');
    }

    // In production, would call Stripe refund API here
    await query("UPDATE payments SET status = 'refunded' WHERE id = ?", [id]);

    return success({
      id: payment.id,
      status: 'refunded',
      message: 'Payment refunded successfully',
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Refund payment error:', err);
    return error('Failed to refund payment', 500);
  }
}
