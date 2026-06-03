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
  if (Number(booking.owner_id) === Number(userId)) return { access: true, booking };
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

    const { method, tipAmount, promoCode } = validation.data;

    // Execute full checkout inside a transaction
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const result = await processCheckout(
        bookingId,
        { method, tipAmount, promoCode },
        conn
      );

      await conn.commit();

      // Trigger Review Flow Notification to client
      try {
        const client = await getOne('SELECT id, email, first_name FROM users WHERE id = ?', [result.booking.clientId]);
        const salon = await getOne('SELECT name FROM salons WHERE id = ?', [result.booking.salonId]);
        
        if (client) {
          const { sendNotification } = require('@/lib/notifications');
          const reviewUrl = `http://localhost:3000/dashboard/client/bookings/${bookingId}/review`; // Example review link
          
          sendNotification({
            userId: client.id,
            email: client.email,
            type: 'email',
            title: 'Thank you for your visit!',
            message: `
              <p>Hi ${client.first_name || 'there'},</p>
              <p>Thank you for visiting <strong>${salon?.name || 'the salon'}</strong>! Your payment has been successfully processed.</p>
              <p>We'd love to hear about your experience. Please take a moment to leave a review for your service.</p>
              <p><a href="${reviewUrl}">Leave a Review</a></p>
              <p>We hope to see you again soon!</p>
            `,
            data: { bookingId, status: 'completed', event: 'review_prompt' }
          });
        }
      } catch (notifErr) {
        console.error('Failed to trigger review notification:', notifErr);
      }

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
