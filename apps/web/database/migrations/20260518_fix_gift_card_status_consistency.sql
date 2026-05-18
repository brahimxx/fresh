-- Fix gift cards that were incorrectly marked as 'used' but still have balance
-- (caused by the CASE WHEN bug that evaluated remaining_balance before subtraction)
UPDATE gift_cards SET status = 'active' WHERE status = 'used' AND remaining_balance > 0;

-- Fix gift cards that are 'active' but have zero balance (edge case)
UPDATE gift_cards SET status = 'used' WHERE status = 'active' AND remaining_balance <= 0;

-- Mark cards that should have been expired
UPDATE gift_cards SET status = 'expired' WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW();
