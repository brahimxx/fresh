import { query, getOne } from '@/lib/db';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden, notFound } from '@/lib/response';
import { validate, addBookingProductSchema } from '@/lib/validate';
import { addProductToBooking, calculateBookingTotal } from '@/lib/checkout';

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

// GET /api/bookings/[id]/products — List products on a booking
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const { access } = await checkBookingAccess(id, session.userId, session.role);
    if (!access) return forbidden('Not authorized');

    const products = await query(
      `SELECT bp.id, bp.product_id, p.name, bp.quantity, bp.unit_price, bp.total_price, bp.created_at
       FROM booking_products bp
       JOIN products p ON p.id = bp.product_id
       WHERE bp.booking_id = ?
       ORDER BY bp.created_at ASC`,
      [id]
    );

    return success({ products });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get booking products error:', err);
    return error('Failed to get booking products', 500);
  }
}

// POST /api/bookings/[id]/products — Add a product at checkout
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: bookingId } = await params;

    const { access } = await checkBookingAccess(bookingId, session.userId, session.role);
    if (!access) return forbidden('Not authorized');

    const body = await request.json();
    const validation = validate(addBookingProductSchema, body);
    if (!validation.success) {
      return error({ code: 'VALIDATION_ERROR', message: validation.errors }, 400);
    }

    const { productId, quantity } = validation.data;

    // Use a transaction for stock + insert atomicity
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await addProductToBooking(bookingId, productId, quantity, conn);
      await conn.commit();

      return created(result);
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
    console.error('Add booking product error:', err);
    return error('Failed to add product', 500);
  }
}
