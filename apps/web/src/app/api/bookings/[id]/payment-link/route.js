import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden, notFound } from '@/lib/response';
import { stripe } from '@/lib/stripe';
import { sendNotification } from '@/lib/notifications';
import { toStripeAmount } from '@/lib/format';

// POST /api/bookings/[id]/payment-link — Generate a Stripe payment link and email it to the client
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: bookingId } = await params;

    // Check access
    const booking = await getOne(
      `SELECT b.id, b.salon_id, b.client_id, b.status, b.fulfillment_type,
              b.travel_fee_amount, b.start_datetime,
              s.owner_id, s.name as salon_name, s.currency
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       WHERE b.id = ? AND b.deleted_at IS NULL`,
      [bookingId]
    );

    if (!booking) return notFound('Booking not found');

    // Only owner, admin, or staff can send payment links
    if (session.role !== 'admin' && booking.owner_id !== session.userId) {
      const staff = await getOne(
        'SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
        [booking.salon_id, session.userId]
      );
      if (!staff) return forbidden('Not authorized');
    }

    // Check if already paid
    const existingPayment = await getOne(
      'SELECT id, status FROM payments WHERE booking_id = ?',
      [bookingId]
    );
    if (existingPayment && existingPayment.status === 'paid') {
      return error({ code: 'ALREADY_PAID', message: 'This booking is already paid' }, 400);
    }

    // Get client info
    const client = await getOne(
      'SELECT id, email, first_name, last_name FROM users WHERE id = ?',
      [booking.client_id]
    );
    if (!client || !client.email) {
      return error({ code: 'NO_CLIENT_EMAIL', message: 'Client does not have an email address on file' }, 400);
    }

    // Calculate total amount
    const totalRow = await getOne(
      'SELECT COALESCE(SUM(bs.price), 0) as total FROM booking_services bs WHERE bs.booking_id = ?',
      [bookingId]
    );
    const serviceTotal = parseFloat(totalRow?.total || 0);
    const travelFee = parseFloat(booking.travel_fee_amount || 0);
    const totalAmount = serviceTotal + travelFee;

    if (totalAmount <= 0) {
      return error({ code: 'ZERO_AMOUNT', message: 'Nothing to charge — booking total is zero' }, 400);
    }

    // Get service names for the checkout description
    const services = await query(
      `SELECT sv.name FROM booking_services bs JOIN services sv ON sv.id = bs.service_id WHERE bs.booking_id = ?`,
      [bookingId]
    );
    const serviceNames = services.map(s => s.name).join(', ') || 'Booking';

    const currency = (booking.currency || 'DZD').toLowerCase();
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `${booking.salon_name} — ${serviceNames}`,
              description: `Appointment on ${new Date(String(booking.start_datetime).replace(' ', 'T')).toLocaleDateString()}`,
            },
            unit_amount: toStripeAmount(totalAmount, currency),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/dashboard/client/bookings?success=true`,
      cancel_url: `${origin}/dashboard/client/bookings`,
      expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours to pay
      metadata: {
        bookingId: String(bookingId),
        salonId: String(booking.salon_id),
        source: 'payment_link',
      },
    });

    // Create or update payment record as pending
    if (existingPayment) {
      await query(
        "UPDATE payments SET status = 'pending', method = 'card', stripe_payment_id = ?, amount = ? WHERE booking_id = ?",
        [checkoutSession.id, totalAmount.toFixed(2), bookingId]
      );
    } else {
      await query(
        "INSERT INTO payments (booking_id, amount, method, status, stripe_payment_id) VALUES (?, ?, 'card', 'pending', ?)",
        [bookingId, totalAmount.toFixed(2), checkoutSession.id]
      );
    }

    // Send email to client with the payment link
    const clientName = client.first_name || 'there';
    const appointmentDate = new Date(String(booking.start_datetime).replace(' ', 'T')).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    await sendNotification({
      userId: client.id,
      email: client.email,
      type: 'email',
      title: `Payment required for your appointment at ${booking.salon_name}`,
      message: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Payment Required</h2>
          <p>Hi ${clientName},</p>
          <p>Your appointment at <strong>${booking.salon_name}</strong> on <strong>${appointmentDate}</strong> requires payment.</p>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">Services: ${serviceNames}</p>
            <p style="margin: 8px 0 0; font-size: 24px; font-weight: bold; color: #1a1a1a;">Total: ${totalAmount.toFixed(2)} ${currency.toUpperCase()}</p>
          </div>
          <a href="${checkoutSession.url}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            Pay Now
          </a>
          <p style="color: #666; font-size: 13px; margin-top: 24px;">This payment link expires in 24 hours. If you have any questions, please contact the salon directly.</p>
        </div>
      `,
      data: { bookingId, event: 'payment_link_sent' },
    });

    return success({
      message: 'Payment link sent to ' + client.email,
      checkoutUrl: checkoutSession.url,
      amount: totalAmount,
      expiresAt: new Date(checkoutSession.expires_at * 1000).toISOString(),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Payment link error:', err);
    return error('Failed to generate payment link', 500);
  }
}
