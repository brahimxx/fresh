-- Add 'pending' status to gift_cards for Stripe payment flow
-- Gift cards are created as 'pending' and activated only after successful payment

ALTER TABLE gift_cards 
  MODIFY COLUMN status ENUM('pending', 'active', 'used', 'expired', 'cancelled') DEFAULT 'active';
