-- Enhanced Staff Management Schema
-- Adds comprehensive fields for team member management like Fresha

USE fresh;

-- 1. Add new columns to staff table for personal information
-- Skip if columns already exist (MySQL 8.0.20+)
ALTER TABLE staff
ADD COLUMN first_name VARCHAR(100) DEFAULT NULL AFTER user_id,
ADD COLUMN last_name VARCHAR(100) DEFAULT NULL AFTER first_name,
ADD COLUMN phone_secondary VARCHAR(20) DEFAULT NULL AFTER title,
ADD COLUMN country VARCHAR(100) DEFAULT NULL AFTER phone_secondary,
ADD COLUMN birthday DATE DEFAULT NULL AFTER country,
ADD COLUMN start_date DATE DEFAULT NULL AFTER birthday,
ADD COLUMN end_date DATE DEFAULT NULL AFTER start_date,
ADD COLUMN employment_type ENUM('employee', 'self_employed') DEFAULT 'employee' AFTER end_date,
ADD COLUMN notes TEXT DEFAULT NULL AFTER employment_type;

-- 2. Create staff_addresses table
CREATE TABLE IF NOT EXISTS staff_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  address_type ENUM('home', 'work', 'other') NOT NULL DEFAULT 'home',
  street_address VARCHAR(255) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  state VARCHAR(100) DEFAULT NULL,
  postal_code VARCHAR(20) DEFAULT NULL,
  country VARCHAR(100) DEFAULT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff_addresses_staff_id (staff_id),
  CONSTRAINT fk_staff_addresses_staff FOREIGN KEY (staff_id) 
    REFERENCES staff(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Create staff_emergency_contacts table
CREATE TABLE IF NOT EXISTS staff_emergency_contacts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  contact_name VARCHAR(150) NOT NULL,
  relationship VARCHAR(100) DEFAULT NULL,
  phone_primary VARCHAR(20) NOT NULL,
  phone_secondary VARCHAR(20) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  notes TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff_emergency_staff_id (staff_id),
  CONSTRAINT fk_staff_emergency_staff FOREIGN KEY (staff_id) 
    REFERENCES staff(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Create staff_wages table for pay information
CREATE TABLE IF NOT EXISTS staff_wages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  wage_type ENUM('hourly', 'salary', 'commission_only') NOT NULL DEFAULT 'hourly',
  hourly_rate DECIMAL(10, 2) DEFAULT NULL,
  salary_amount DECIMAL(10, 2) DEFAULT NULL,
  salary_period ENUM('weekly', 'biweekly', 'monthly', 'annual') DEFAULT 'monthly',
  currency VARCHAR(3) DEFAULT 'USD',
  effective_from DATE NOT NULL,
  effective_to DATE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff_wages_staff_id (staff_id),
  KEY idx_staff_wages_effective (staff_id, effective_from, effective_to),
  CONSTRAINT fk_staff_wages_staff FOREIGN KEY (staff_id) 
    REFERENCES staff(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Create staff_timesheets table
CREATE TABLE IF NOT EXISTS staff_timesheets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  salon_id BIGINT UNSIGNED NOT NULL,
  clock_in DATETIME NOT NULL,
  clock_out DATETIME DEFAULT NULL,
  break_duration INT DEFAULT 0 COMMENT 'Break duration in minutes',
  total_hours DECIMAL(5, 2) DEFAULT NULL COMMENT 'Total hours worked',
  notes TEXT DEFAULT NULL,
  status ENUM('clocked_in', 'clocked_out', 'approved', 'disputed') DEFAULT 'clocked_in',
  approved_by BIGINT UNSIGNED DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff_timesheets_staff_id (staff_id),
  KEY idx_staff_timesheets_salon_id (salon_id),
  KEY idx_staff_timesheets_date (clock_in),
  CONSTRAINT fk_staff_timesheets_staff FOREIGN KEY (staff_id) 
    REFERENCES staff(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_staff_timesheets_salon FOREIGN KEY (salon_id) 
    REFERENCES salons(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Create staff_pay_runs table
CREATE TABLE IF NOT EXISTS staff_pay_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  status ENUM('draft', 'processing', 'completed', 'cancelled') DEFAULT 'draft',
  total_amount DECIMAL(12, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT DEFAULT NULL,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff_pay_runs_salon_id (salon_id),
  KEY idx_staff_pay_runs_period (pay_period_start, pay_period_end),
  CONSTRAINT fk_staff_pay_runs_salon FOREIGN KEY (salon_id) 
    REFERENCES salons(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. Create staff_pay_run_items table (individual staff payments in a pay run)
CREATE TABLE IF NOT EXISTS staff_pay_run_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pay_run_id BIGINT UNSIGNED NOT NULL,
  staff_id BIGINT UNSIGNED NOT NULL,
  base_pay DECIMAL(10, 2) DEFAULT 0.00,
  commission_amount DECIMAL(10, 2) DEFAULT 0.00,
  bonus_amount DECIMAL(10, 2) DEFAULT 0.00,
  tips_amount DECIMAL(10, 2) DEFAULT 0.00,
  deductions_amount DECIMAL(10, 2) DEFAULT 0.00,
  total_pay DECIMAL(10, 2) DEFAULT 0.00,
  hours_worked DECIMAL(6, 2) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff_pay_run_items_pay_run (pay_run_id),
  KEY idx_staff_pay_run_items_staff (staff_id),
  CONSTRAINT fk_staff_pay_run_items_pay_run FOREIGN KEY (pay_run_id) 
    REFERENCES staff_pay_runs(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_staff_pay_run_items_staff FOREIGN KEY (staff_id) 
    REFERENCES staff(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. Create staff_locations table for multi-location assignment
CREATE TABLE IF NOT EXISTS staff_locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  salon_id BIGINT UNSIGNED NOT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_locations (staff_id, salon_id),
  KEY idx_staff_locations_staff (staff_id),
  KEY idx_staff_locations_salon (salon_id),
  CONSTRAINT fk_staff_locations_staff FOREIGN KEY (staff_id) 
    REFERENCES staff(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_staff_locations_salon FOREIGN KEY (salon_id) 
    REFERENCES salons(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Verify changes
SHOW TABLES LIKE 'staff%';
DESCRIBE staff;
