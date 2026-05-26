import { decodeId } from '@/lib/id';
import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';
import { recordGiftCardTransaction } from '@/lib/gift-card-ledger';
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
    const { bookingId: rawBookingId } = await params;
  const bookingId = decodeId(rawBookingId);

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
      `SELECT bgc.*, gc.code as gift_card_code 
       FROM booking_gift_cards bgc 
       JOIN gift_cards gc ON gc.id = bgc.gift_card_id 
       WHERE bgc.booking_id = ?`,
      [bookingId]
    );

    // Get existing payment
    const payment = await getOne('SELECT * FROM payments WHERE booking_id = ?', [bookingId]);

    // Calculate totals
    const servicesTotal = services.reduce((sum, s) => sum + parseFloat(s.price), 0);
    const productsTotal = products.reduce((sum, p) => sum + parseFloat(p.total_price || 0), 0);
    const subtotal = servicesTotal + productsTotal;

    let discountTotal = 0;
    for (const discount of discounts) {
      discountTotal += parseFloat(discount.amount_saved);
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
        price: parseFloat(p.unit_price),
        quantity: p.quantity,
      })),
      discounts: discounts.map((d) => ({
        id: d.discount_id,
        name: d.discount_name,
        type: d.discount_type,
        amount: parseFloat(d.amount_saved),
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

// POST /api/checkout/[bookingId] - Complete checkout (full-featured: products, discounts, gift cards, tips)
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { bookingId: rawBookingId } = await params;
    const bookingId = decodeId(rawBookingId);

    const booking = await getOne(
      'SELECT b.*, s.owner_id, s.name as salon_name FROM bookings b JOIN salons s ON s.id = b.salon_id WHERE b.id = ?',
      [bookingId]
    );

    if (!booking) {
      return error({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' }, 404);
    }

    // Block already-completed bookings
    if (booking.status === 'completed') {
      return error({ code: 'ALREADY_COMPLETED', message: 'This booking has already been checked out' }, 409);
    }

    // Only confirmed or pending bookings can be checked out
    if (!['confirmed', 'pending'].includes(booking.status)) {
      return error({ code: 'INVALID_STATUS', message: `Cannot checkout a booking with status: ${booking.status}` }, 400);
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
      tipAmount = 0,
      paymentMethod = 'cash',
      stripePaymentId,
    } = body;

    // Check for existing paid payment to prevent duplicates
    const existingPayment = await getOne('SELECT id, status FROM payments WHERE booking_id = ?', [bookingId]);
    if (existingPayment && existingPayment.status === 'paid') {
      return error({ code: 'PAYMENT_EXISTS', message: 'This booking has already been paid' }, 409);
    }

    const result = await transaction(async (conn) => {
      // Add products to booking
      for (const product of products) {
        const [productData] = await conn.execute('SELECT price FROM products WHERE id = ?', [product.id]);
        if (productData.length > 0) {
          const unitPrice = parseFloat(productData[0].price);
          const qty = product.quantity || 1;
          await conn.execute(
            'INSERT INTO booking_products (booking_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
            [bookingId, product.id, qty, unitPrice, (unitPrice * qty).toFixed(2)]
          );
        }
      }

      // Apply discount if provided
      if (discountId && discountAmount) {
        await conn.execute(
          'INSERT INTO booking_discounts (booking_id, discount_id, discount_code, discount_type, discount_value, amount_saved) VALUES (?, ?, ?, ?, ?, ?)',
          [bookingId, discountId, '', 'fixed', discountAmount, discountAmount]
        );
        await conn.execute('UPDATE discounts SET current_uses = current_uses + 1 WHERE id = ?', [discountId]);
      }

      // Apply gift card if provided — validate server-side
      if (giftCardCode) {
        const [existingGc] = await conn.execute(
          'SELECT id FROM booking_gift_cards WHERE booking_id = ?',
          [bookingId]
        );
        if (existingGc.length > 0) {
          throw new Error('A gift card has already been applied to this booking');
        }

        const [gcRows] = await conn.execute(
          `SELECT id, remaining_balance FROM gift_cards
           WHERE code = ?
             AND status = 'active'
             AND remaining_balance > 0
             AND (expires_at IS NULL OR expires_at > NOW())
           FOR UPDATE`,
          [giftCardCode.toUpperCase()]
        );
        const giftCard = gcRows[0];
        if (!giftCard) {
          throw new Error('Gift card is invalid, expired, or depleted');
        }

        // Calculate server-side deduction amount
        const [svcRes] = await conn.execute(
          'SELECT COALESCE(SUM(price), 0) as total FROM booking_services WHERE booking_id = ?',
          [bookingId]
        );
        const [prdRes] = await conn.execute(
          'SELECT COALESCE(SUM(total_price), 0) as total FROM booking_products WHERE booking_id = ?',
          [bookingId]
        );
        const [dscRes] = await conn.execute(
          'SELECT COALESCE(SUM(amount_saved), 0) as total FROM booking_discounts WHERE booking_id = ?',
          [bookingId]
        );
        const totalAfterDiscount = Math.max(0,
          parseFloat(svcRes[0].total) + parseFloat(prdRes[0].total) - parseFloat(dscRes[0].total)
        );

        const serverGiftCardAmount = Math.min(
          parseFloat(giftCard.remaining_balance),
          totalAfterDiscount
        );

        if (serverGiftCardAmount > 0) {
          await conn.execute(
            'INSERT INTO booking_gift_cards (booking_id, gift_card_id, amount_used) VALUES (?, ?, ?)',
            [bookingId, giftCard.id, serverGiftCardAmount.toFixed(2)]
          );
          await conn.execute(
            `UPDATE gift_cards
                SET remaining_balance = remaining_balance - ?,
                    status = CASE WHEN (remaining_balance - ?) <= 0 THEN 'used' ELSE status END
              WHERE id = ?`,
            [serverGiftCardAmount.toFixed(2), serverGiftCardAmount.toFixed(2), giftCard.id]
          );

          const newBalance = parseFloat(giftCard.remaining_balance) - serverGiftCardAmount;
          await recordGiftCardTransaction({
            giftCardId: giftCard.id,
            type: 'redemption',
            amount: -serverGiftCardAmount,
            balanceAfter: Math.max(0, newBalance),
            referenceType: 'checkout',
            referenceId: bookingId,
            notes: `Redeemed during checkout for booking #${bookingId}`,
            createdBy: session.userId,
            conn,
          });
        }
      }

      // Calculate final total from DB (never trust frontend totals)
      const [servicesResult] = await conn.execute(
        'SELECT COALESCE(SUM(price), 0) as total FROM booking_services WHERE booking_id = ?',
        [bookingId]
      );
      const [productsResult] = await conn.execute(
        'SELECT COALESCE(SUM(total_price), 0) as total FROM booking_products WHERE booking_id = ?',
        [bookingId]
      );
      const [discountsResult] = await conn.execute(
        'SELECT COALESCE(SUM(amount_saved), 0) as total FROM booking_discounts WHERE booking_id = ?',
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
      const tip = Math.max(0, parseFloat(tipAmount) || 0);

      // Verify Stripe payment for card payments
      if (paymentMethod === 'card' && stripePaymentId) {
        const intent = await stripe.paymentIntents.retrieve(stripePaymentId);
        if (intent.status !== 'succeeded') {
          throw new Error(`Payment verification failed: status is ${intent.status}`);
        }
        const expectedCents = Math.round((finalAmount + tip) * 100);
        if (Math.abs(intent.amount - expectedCents) > 10) {
          throw new Error(`Payment amount mismatch: paid ${intent.amount / 100}, expected ${finalAmount + tip}`);
        }
      }

      // Create payment record (INSERT only — no ON DUPLICATE KEY UPDATE)
      // Salon-initiated checkout always marks as 'paid' immediately
      if (existingPayment) {
        // Update existing pending payment
        await conn.execute(
          `UPDATE payments SET amount = ?, tip_amount = ?, method = ?, status = 'paid', stripe_payment_id = ? WHERE id = ?`,
          [finalAmount, tip, paymentMethod, stripePaymentId || null, existingPayment.id]
        );
      } else {
        await conn.execute(
          `INSERT INTO payments (booking_id, amount, tip_amount, method, status, stripe_payment_id, created_at)
           VALUES (?, ?, ?, ?, 'paid', ?, NOW())`,
          [bookingId, finalAmount, tip, paymentMethod, stripePaymentId || null]
        );
      }

      // Mark booking as completed
      await conn.execute("UPDATE bookings SET status = 'completed' WHERE id = ?", [bookingId]);

      // Update salon_clients visit stats
      await conn.execute(
        'UPDATE salon_clients SET last_visit_date = NOW(), total_visits = total_visits + 1 WHERE salon_id = ? AND client_id = ?',
        [booking.salon_id, booking.client_id]
      );

      return {
        amount: finalAmount,
        tip,
        total: finalAmount + tip,
      };
    });

    // Send review notification (non-blocking, outside transaction)
    try {
      const client = await getOne('SELECT id, email, first_name FROM users WHERE id = ?', [booking.client_id]);
      if (client) {
        const { sendNotification } = require('@/lib/notifications');
        sendNotification({
          userId: client.id,
          email: client.email,
          type: 'email',
          title: 'Thank you for your visit!',
          message: `
            <p>Hi ${client.first_name || 'there'},</p>
            <p>Thank you for visiting <strong>${booking.salon_name || 'the salon'}</strong>! Your payment has been successfully processed.</p>
            <p>We'd love to hear about your experience.</p>
          `,
          data: { bookingId, status: 'completed', event: 'review_prompt' }
        });
      }
    } catch (notifErr) {
      console.error('Failed to send review notification:', notifErr);
    }

    return created({
      success: true,
      payment: result,
      message: 'Checkout completed successfully',
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Complete checkout error:', err);
    const message = err?.message || 'Failed to complete checkout';
    return error({ code: 'CHECKOUT_FAILED', message }, 500);
  }
}
