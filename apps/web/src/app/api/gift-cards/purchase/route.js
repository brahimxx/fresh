/**
 * POST /api/gift-cards/purchase — Public gift card purchase endpoint.
 *
 * No authentication required — anyone can buy a gift card for a salon.
 * Creates a Stripe Checkout session. The gift card is only activated
 * after successful payment (handled by the Stripe webhook).
 *
 * Body: { salon_id, amount, recipient_email, recipient_name?, sender_name?, message? }
 */

import { query, getOne } from '@/lib/db';
import { success, error, created } from '@/lib/response';
import { stripe } from '@/lib/stripe';
import rateLimiter from '@/lib/rate-limit';

function generateCode() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var segments = [];
  for (var s = 0; s < 4; s++) {
    var segment = '';
    for (var i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join('-');
}

export async function POST(request) {
  try {
    // Rate limit: 5 purchases per IP per 15 minutes
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const rateLimit = rateLimiter.check(`gift_card_purchase:${ip}`, 5, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return error(`Too many purchase attempts. Please try again in ${rateLimit.retryAfter} seconds.`, 429);
    }

    var body;
    try {
      body = await request.json();
    } catch {
      return error('Invalid JSON body', 400);
    }

    var { salon_id, amount, recipient_email, recipient_name, sender_name, sender_email, message } = body || {};

    // Validation
    if (!salon_id) {
      return error('salon_id is required', 400);
    }
    if (!amount || Number(amount) < 1 || !Number.isFinite(Number(amount))) {
      return error('amount must be at least 1', 400);
    }
    if (!recipient_email || typeof recipient_email !== 'string' || !recipient_email.includes('@')) {
      return error('A valid recipient_email is required', 400);
    }

    var numericAmount = Math.round(Number(amount) * 100) / 100;

    // Verify the salon exists
    var salon = await getOne('SELECT id, name, currency FROM salons WHERE id = ?', [salon_id]);
    if (!salon) {
      return error('Salon not found', 404);
    }

    // Generate unique code with retry
    var code = generateCode();
    var attempts = 0;
    while (attempts < 5) {
      var existing = await getOne('SELECT id FROM gift_cards WHERE code = ?', [code]);
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    // Calculate expiry (12 months from now)
    var expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 12);

    // Create the gift card in 'pending' status (not yet paid)
    var result = await query(
      `INSERT INTO gift_cards
         (salon_id, code, initial_balance, remaining_balance, purchased_by, purchaser_email,
          recipient_email, recipient_name, recipient_message, status, expires_at, created_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, 'pending', ?, NOW())`,
      [
        salon_id,
        code,
        numericAmount,
        numericAmount,
        sender_email || null,
        recipient_email,
        recipient_name || null,
        message || null,
        expiresAt,
      ]
    );

    var giftCardId = result.insertId;

    // Create Stripe Checkout session
    var origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    var currency = (salon.currency || 'eur').toLowerCase();
    var salonName = salon.name || 'Salon';

    var stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `Gift Card - ${salonName}`,
              description: `$${numericAmount.toFixed(2)} gift card${recipient_name ? ' for ' + recipient_name : ''}`,
            },
            unit_amount: Math.round(numericAmount * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/gift-card/success?code=${code}&amount=${numericAmount}`,
      cancel_url: `${origin}/gift-card/cancelled?id=${giftCardId}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min expiry
      metadata: {
        type: 'gift_card_purchase',
        giftCardId: giftCardId.toString(),
        giftCardCode: code,
        salonId: salon_id.toString(),
        salonName: salonName,
        recipientEmail: recipient_email,
        recipientName: recipient_name || '',
        senderName: sender_name || '',
        senderEmail: sender_email || '',
        message: message || '',
        amount: numericAmount.toString(),
      },
    });

    return created({
      checkoutUrl: stripeSession.url,
      code: code,
      amount: numericAmount,
      recipient_email: recipient_email,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('Gift card purchase error:', err);
    return error('Failed to initiate gift card purchase', 500);
  }
}
