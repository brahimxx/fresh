-- Migration: Fix currency defaults and align existing data
-- Date: 2026-05-19
-- Description: 
--   1. Change salons.currency default from 'EUR' to 'DZD' (platform default for Algeria)
--   2. Update existing Algerian salons that incorrectly have EUR
--   3. Align HR table currency defaults with salon currency
--   4. Add payment_mode column for cash-only vs stripe support

-- Step 1: Change the default for new salons
ALTER TABLE salons ALTER COLUMN currency SET DEFAULT 'DZD';

-- Step 2: Fix existing salons in Algeria that were created with the old EUR default
UPDATE salons 
SET currency = 'DZD' 
WHERE (country = 'Algeria' OR country IS NULL) 
  AND currency = 'EUR';

-- Step 3: Remove hardcoded USD default from HR tables — they should inherit from salon
ALTER TABLE staff_wages MODIFY COLUMN currency varchar(3) DEFAULT NULL;
ALTER TABLE staff_pay_runs MODIFY COLUMN currency varchar(3) DEFAULT NULL;

-- Step 4: Update existing HR records to match their salon's currency
UPDATE staff_wages sw
JOIN staff s ON sw.staff_id = s.id
JOIN salons sal ON s.salon_id = sal.id
SET sw.currency = sal.currency
WHERE sw.currency = 'USD' AND sal.currency != 'USD';

UPDATE staff_pay_runs spr
JOIN salons sal ON spr.salon_id = sal.id
SET spr.currency = sal.currency
WHERE spr.currency = 'USD' AND sal.currency != 'USD';

-- Step 5: Add payment_mode to salons for Algeria cash-only support
ALTER TABLE salons 
ADD COLUMN payment_mode ENUM('cash_only', 'stripe', 'manual') 
NOT NULL DEFAULT 'cash_only' 
COMMENT 'How this salon processes payments. cash_only = record manually, stripe = online via Stripe, manual = bank transfer'
AFTER currency;

-- Step 6: Set existing salons with stripe_account_id to stripe mode
UPDATE salons 
SET payment_mode = 'stripe' 
WHERE stripe_account_id IS NOT NULL AND stripe_account_id != '';
