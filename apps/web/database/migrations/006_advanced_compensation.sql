-- Migration 006: Advanced Compensation & Labor Compliance
-- Adds support for Tiered/Sliding Scale Commissions and Overtime Multipliers.

-- 1. Create global commission profiles for the salon
CREATE TABLE IF NOT EXISTS commission_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    salon_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL, -- e.g., 'Senior Stylist Tier'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- 2. Create the tiers for sliding scale math
-- e.g., 0-$1000 = 30%, $1000-$2000 = 40%
CREATE TABLE IF NOT EXISTS commission_tiers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    profile_id BIGINT UNSIGNED NOT NULL,
    threshold_amount DECIMAL(10, 2) NOT NULL DEFAULT '0.00', -- The minimum revenue required for this tier
    commission_rate DECIMAL(5, 2) NOT NULL,                  -- The percentage rate for revenue exceeding the threshold
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES commission_profiles(id) ON DELETE CASCADE,
    INDEX idx_profile_threshold (profile_id, threshold_amount)
);

-- 3. Link staff to a commission profile
ALTER TABLE staff
ADD COLUMN commission_profile_id BIGINT UNSIGNED DEFAULT NULL AFTER role,
ADD FOREIGN KEY (commission_profile_id) REFERENCES commission_profiles(id) ON DELETE SET NULL;

-- 4. Add labor compliance (Overtime) to wages
ALTER TABLE staff_wages
ADD COLUMN overtime_threshold_hours DECIMAL(5, 2) DEFAULT NULL AFTER hourly_rate, -- e.g., 40.00
ADD COLUMN overtime_multiplier DECIMAL(4, 2) DEFAULT '1.50' AFTER overtime_threshold_hours;
