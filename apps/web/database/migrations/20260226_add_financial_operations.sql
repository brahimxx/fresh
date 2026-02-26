-- Migration: Add Financial Operations & Subscriptions Tables
-- Date: 2026-02-26

-- 1. Add subscription tier to salons
-- ALTER TABLE salons 
-- ADD COLUMN plan_tier ENUM('basic', 'pro', 'enterprise') DEFAULT 'basic' AFTER status;

-- 2. Create payouts table for tracking funds owed/transferred
CREATE TABLE IF NOT EXISTS payouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    salon_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL COMMENT 'Net amount to transfer to salon',
    status ENUM('pending', 'processing', 'paid', 'failed') NOT NULL DEFAULT 'pending',
    stripe_transfer_id VARCHAR(255) NULL COMMENT 'Stripe Connect Transfer ID',
    period_start DATETIME NOT NULL COMMENT 'Start of booking period included in this payout',
    period_end DATETIME NOT NULL COMMENT 'End of booking period included in this payout',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    INDEX idx_payouts_salon_status (salon_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create refunds table for tracking direct overriding refunds
CREATE TABLE IF NOT EXISTS refunds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT NULL,
    processed_by INT NULL COMMENT 'Admin User ID who issued the refund',
    stripe_refund_id VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_refunds_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
