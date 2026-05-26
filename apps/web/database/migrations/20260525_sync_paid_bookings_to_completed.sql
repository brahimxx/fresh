-- Fix bookings that were checked out in-salon (no stripe_payment_id) but
-- weren't marked as completed. Only applies to salon-initiated payments
-- (cash, card_terminal) — NOT client prepayments via Stripe.

UPDATE bookings b
JOIN payments p ON p.booking_id = b.id
SET b.status = 'completed'
WHERE p.status = 'paid'
  AND p.stripe_payment_id IS NULL
  AND b.status IN ('pending', 'confirmed')
  AND b.deleted_at IS NULL;
