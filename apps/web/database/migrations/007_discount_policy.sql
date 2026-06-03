-- Migration 007: Discount Policy Engine
-- Adds a configuration to salon_settings determining if promotional discounts 
-- should be deducted from gross revenue before calculating staff commission.

ALTER TABLE salon_settings
ADD COLUMN deduct_discounts_before_commission BOOLEAN DEFAULT FALSE AFTER reminder_hours_before;
