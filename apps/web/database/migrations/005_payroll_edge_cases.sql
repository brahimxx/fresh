-- Migration 005: Payroll Edge Cases
-- Adds cost tracking for services/products and a ledger for payroll adjustments (clawbacks/bonuses).

-- 1. Add cost_price to services
ALTER TABLE services
ADD COLUMN cost_price DECIMAL(10, 2) DEFAULT '0.00' AFTER price;

-- 2. Add cost_price to products
ALTER TABLE products
ADD COLUMN cost_price DECIMAL(10, 2) DEFAULT '0.00' AFTER price;

-- 3. Create staff_pay_run_adjustments ledger
CREATE TABLE IF NOT EXISTS staff_pay_run_adjustments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    salon_id BIGINT UNSIGNED NOT NULL,
    staff_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10, 2) NOT NULL, -- Positive for bonus, negative for deduction
    type ENUM('deduction', 'bonus') NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('pending', 'applied') DEFAULT 'pending',
    applied_pay_run_id BIGINT UNSIGNED DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    FOREIGN KEY (applied_pay_run_id) REFERENCES staff_pay_runs(id) ON DELETE SET NULL,
    INDEX idx_salon_staff_status (salon_id, staff_id, status)
);
