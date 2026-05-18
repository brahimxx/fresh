-- Add purchaser_email column to track who bought the gift card
-- regardless of whether they have an account in the system.
-- This enables "my purchases" features and dispute resolution.
ALTER TABLE gift_cards ADD COLUMN purchaser_email VARCHAR(255) NULL AFTER purchased_by;

-- Backfill from existing users where purchased_by is set
UPDATE gift_cards gc
JOIN users u ON u.id = gc.purchased_by
SET gc.purchaser_email = u.email
WHERE gc.purchased_by IS NOT NULL AND gc.purchaser_email IS NULL;
