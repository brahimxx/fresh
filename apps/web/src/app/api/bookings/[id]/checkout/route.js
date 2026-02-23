import { getOne } from '@/lib/db';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden, notFound } from '@/lib/response';
import { validate, checkoutSchema } from '@/lib/validate';
import { processCheckout } from '@/lib/checkout';

// Helper to check booking access (owner/staff/admin)
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

// POST /api/bookings/[id]/checkout — Full transactional checkout
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: bookingId } = await params;

    // Pre-check access (non-transactional, fast-fail)
    const { access } = await checkBookingAccess(bookingId, session.userId, session.role);
    if (!access) return forbidden('Not authorized to checkout this booking');

    const body = await request.json();
    const validation = validate(checkoutSchema, body);
    if (!validation.success) {
      return error({ code: 'VALIDATION_ERROR', message: validation.errors }, 400);
    }

    const { method, tipAmount } = validation.data;

    // Execute full checkout inside a transaction
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const result = await processCheckout(
        bookingId,
        { method, tipAmount },
        conn
      );

      await conn.commit();

      return success({
        message: 'Checkout completed successfully',
        ...result,
      });
    } catch (err) {
      await conn.rollback();
      if (err.name === 'CheckoutError') {
        return error({ code: err.code, message: err.message }, err.httpStatus);
      }
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Checkout error:', err);
    return error('Failed to process checkout', 500);
  }
}
