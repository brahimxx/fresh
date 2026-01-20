import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  if (salon && salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// GET /api/checkout/[bookingId] - Get checkout details for a booking
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { bookingId } = await params;

    const booking = await getOne(
      `SELECT b.*, s.owner_id, s.name as salon_name
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking) {
      return error({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' }, 404);
    }

    const hasAccess = await checkSalonAccess(booking.salon_id, session.userId, session.role);
    if (!hasAccess && booking.client_id !== session.userId) {
      return forbidden('Not authorized');
    }

    // Get booking services
    const services = await query(
      `SELECT bs.*, sv.name as service_name
       FROM booking_services bs
       JOIN services sv ON sv.id = bs.service_id
       WHERE bs.booking_id = ?`,
      [bookingId]
    );

    // Get additional products added to this booking
    const products = await query(
      `SELECT bp.*, p.name as product_name
       FROM booking_products bp
       JOIN products p ON p.id = bp.product_id
       WHERE bp.booking_id = ?`,
      [bookingId]
    );

    // Get applied discounts
    const discounts = await query(
      `SELECT bd.*, d.name as discount_name, d.type as discount_type
       FROM booking_discounts bd
       JOIN discounts d ON d.id = bd.discount_id
       WHERE bd.booking_id = ?`,
      [bookingId]
    );

    // Get applied gift card
    const giftCardPayment = await getOne(
      'SELECT * FROM booking_gift_cards WHERE booking_id = ?',
      [bookingId]
    );

    // Get existing payment
    const payment = await getOne('SELECT * FROM payments WHERE booking_id = ?', [bookingId]);

    // Calculate totals
    const servicesTotal = services.reduce((sum, s) => sum + parseFloat(s.price), 0);
    const productsTotal = products.reduce((sum, p) => sum + parseFloat(p.price) * p.quantity, 0);
    const subtotal = servicesTotal + productsTotal;

    let discountTotal = 0;
    for (const discount of discounts) {
      discountTotal += parseFloat(discount.amount);
    }

    const giftCardAmount = giftCardPayment ? parseFloat(giftCardPayment.amount_used) : 0;
    const total = Math.max(0, subtotal - discountTotal - giftCardAmount);

    return success({
      booking: {
        id: booking.id,
        salonId: booking.salon_id,
        salonName: booking.salon_name,
        clientId: booking.client_id,
        startDatetime: booking.start_datetime,
        status: booking.status,
      },
      services: services.map((s) => ({
        id: s.service_id,
        name: s.service_name,
        price: parseFloat(s.price),
        duration: s.duration_minutes,
      })),
      products: products.map((p) => ({
        id: p.product_id,
        name: p.product_name,
        price: parseFloat(p.price),
        quantity: p.quantity,
      })),
      discounts: discounts.map((d) => ({
        id: d.discount_id,
        name: d.discount_name,
        type: d.discount_type,
        amount: parseFloat(d.amount),
      })),
      giftCard: giftCardPayment
        ? {
            code: giftCardPayment.gift_card_code,
            amountUsed: giftCardAmount,
          }
        : null,
      totals: {
        servicesTotal,
        productsTotal,
        subtotal,
        discountTotal,
        giftCardAmount,
        total,
      },
      payment: payment
        ? {
            id: payment.id,
            amount: parseFloat(payment.amount),
            tip: parseFloat(payment.tip_amount || 0),
            method: payment.method,
            status: payment.status,
          }
        : null,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get checkout error:', err);
    return error({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get checkout' }, 500);
  }
}

// POST /api/checkout/[bookingId] - Complete checkout
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { bookingId } = await params;

    const booking = await getOne(
      'SELECT b.*, s.owner_id FROM bookings b JOIN salons s ON s.id = b.salon_id WHERE b.id = ?',
      [bookingId]
    );

    if (!booking) {
      return error('Booking not found', 404);
    }

    const hasAccess = await checkSalonAccess(booking.salon_id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to complete checkout');
    }

    const body = await request.json();
    const {
      products = [],
      discountId,
      discountAmount,
      giftCardCode,
      giftCardAmount,
      tipAmount = 0,
      paymentMethod,
      stripePaymentId,
    } = body;

    // Check for existing payment to prevent duplicates
    const existingPayment = await getOne('SELECT id, status FROM payments WHERE booking_id = ?', [bookingId]);
    if (existingPayment && existingPayment.status === 'paid') {
      return error({ code: 'PAYMENT_EXISTS', message: 'This booking has already been paid' }, 400);
    }

    const result = await transaction(async (conn) => {
      // Add products to booking
      for (const product of products) {
        const [productData] = await conn.execute('SELECT price FROM products WHERE id = ?', [product.id]);
        if (productData.length > 0) {
          await conn.execute(
            'INSERT INTO booking_products (booking_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
            [bookingId, product.id, product.quantity || 1, productData[0].price]
          );
        }
      }

      // Apply discount if provided
      if (discountId && discountAmount) {
        await conn.execute(
          'INSERT INTO booking_discounts (booking_id, discount_id, amount) VALUES (?, ?, ?)',
          [bookingId, discountId, discountAmount]
        );

        // Increment discount usage
        await conn.execute('UPDATE discounts SET current_uses = current_uses + 1 WHERE id = ?', [discountId]);
      }

      // Apply gift card if provided
      if (giftCardCode && giftCardAmount) {
        await conn.execute(
          'INSERT INTO booking_gift_cards (booking_id, gift_card_code, amount_used) VALUES (?, ?, ?)',
          [bookingId, giftCardCode, giftCardAmount]
        );

        // Deduct from gift card balance
        await conn.execute(
          'UPDATE gift_cards SET remaining_balance = remaining_balance - ? WHERE code = ?',
          [giftCardAmount, giftCardCode]
        );
      }

      // Calculate final total
      const [servicesResult] = await conn.execute(
        'SELECT COALESCE(SUM(price), 0) as total FROM booking_services WHERE booking_id = ?',
        [bookingId]
      );
      const [productsResult] = await conn.execute(
        'SELECT COALESCE(SUM(price * quantity), 0) as total FROM booking_products WHERE booking_id = ?',
        [bookingId]
      );
      const [discountsResult] = await conn.execute(
        'SELECT COALESCE(SUM(amount), 0) as total FROM booking_discounts WHERE booking_id = ?',
        [bookingId]
      );
      const [giftCardsResult] = await conn.execute(
        'SELECT COALESCE(SUM(amount_used), 0) as total FROM booking_gift_cards WHERE booking_id = ?',
        [bookingId]
      );

      const subtotal = parseFloat(servicesResult[0].total) + parseFloat(productsResult[0].total);
      const discountTotal = parseFloat(discountsResult[0].total);
      const giftCardTotal = parseFloat(giftCardsResult[0].total);
      const finalAmount = Math.max(0, subtotal - discountTotal - giftCardTotal);
      const totalWithTip = finalAmount + parseFloat(tipAmount);

      // Verify Stripe payment BEFORE committing to database
      let verifiedStripePayment = null;
      if (paymentMethod === 'card') {
        if (!stripePaymentId) {
           throw new Error('Stripe payment ID is required for card payments');
        }
        
        const intent = await stripe.paymentIntents.retrieve(stripePaymentId);
        if (intent.status !== 'succeeded') {
          throw new Error(`Payment verification failed: status is ${intent.status}`);
        }
        
        // Check amount match (cents)
        const expectedCents = Math.round(totalWithTip * 100);
        if (Math.abs(intent.amount - expectedCents) > 10) {
           throw new Error(`Payment amount mismatch: paid ${intent.amount / 100}, expected ${totalWithTip}`);
        }
        
        verifiedStripePayment = intent;
      }

      // Create payment record
      const [paymentResult] = await conn.execute(
        `INSERT INTO payments (booking_id, amount, tip_amount, method, status, stripe_payment_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          bookingId,
          finalAmount,
          tipAmount,
          paymentMethod,
          paymentMethod === 'card' && stripePaymentId ? 'paid' : 'pending',
          stripePaymentId || null,
        ]
      );

      // Update booking status to completed
      await conn.execute("UPDATE bookings SET status = 'completed' WHERE id = ?", [bookingId]);

      // Update salon_clients last_visit
      await conn.execute(
        'UPDATE salon_clients SET last_visit_date = NOW(), total_visits = total_visits + 1 WHERE salon_id = ? AND client_id = ?',
        [booking.salon_id, booking.client_id]
      );

      return {
        paymentId: paymentResult.insertId,
        amount: finalAmount,
        tip: parseFloat(tipAmount),
        total: totalWithTip,
      };
    });

    return created({
      success: true,
      payment: result,
      message: 'Checkout completed successfully',
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Complete checkout error:', err);
    return error({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to complete checkout' }, 500);
  }
}
