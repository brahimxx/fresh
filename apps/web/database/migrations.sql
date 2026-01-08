-- ============================================================
-- FRESH APP - Database Migrations
-- Missing tables and columns for Fresha/Planity-like features
-- Run this after fresha.sql (core schema)
-- ============================================================

USE fresh;

-- ============================================================
-- 1. ALTER EXISTING TABLES - Add missing columns
-- ============================================================

-- Users table additions
ALTER TABLE users 
  ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN reset_token VARCHAR(255) NULL,
  ADD COLUMN reset_token_expires DATETIME NULL,
  ADD COLUMN avatar_url VARCHAR(500) NULL,
  ADD COLUMN last_login_at DATETIME NULL;

-- Salons table additions
ALTER TABLE salons 
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN timezone VARCHAR(50) DEFAULT 'Europe/Paris',
  ADD COLUMN currency VARCHAR(3) DEFAULT 'EUR';

-- Salon settings additions
ALTER TABLE salon_settings 
  ADD COLUMN working_hours_start TIME DEFAULT '09:00:00',
  ADD COLUMN working_hours_end TIME DEFAULT '19:00:00',
  ADD COLUMN online_booking_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN booking_advance_min_hours INT DEFAULT 1,
  ADD COLUMN booking_advance_max_days INT DEFAULT 90,
  ADD COLUMN auto_confirm_bookings BOOLEAN DEFAULT FALSE,
  ADD COLUMN send_reminders BOOLEAN DEFAULT TRUE,
  ADD COLUMN reminder_hours_before INT DEFAULT 24;

-- Payments table additions
ALTER TABLE payments 
  ADD COLUMN refunded_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN tip_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN client_package_id BIGINT UNSIGNED NULL,
  ADD COLUMN notes TEXT NULL;

-- Notifications table additions
ALTER TABLE notifications 
  ADD COLUMN is_read BOOLEAN DEFAULT FALSE,
  ADD COLUMN data JSON NULL,
  ADD COLUMN read_at DATETIME NULL;

-- Reviews table additions
ALTER TABLE reviews 
  ADD COLUMN status ENUM('pending','approved','flagged','removed') DEFAULT 'approved',
  ADD COLUMN moderation_note TEXT NULL,
  ADD COLUMN moderated_by BIGINT UNSIGNED NULL,
  ADD COLUMN moderated_at DATETIME NULL,
  ADD COLUMN booking_id BIGINT UNSIGNED NULL,
  ADD COLUMN owner_reply TEXT NULL,
  ADD COLUMN owner_reply_at DATETIME NULL;

-- Bookings table additions
ALTER TABLE bookings 
  ADD COLUMN notes TEXT NULL,
  ADD COLUMN internal_notes TEXT NULL,
  ADD COLUMN cancelled_at DATETIME NULL,
  ADD COLUMN cancelled_by BIGINT UNSIGNED NULL,
  ADD COLUMN cancellation_reason TEXT NULL,
  ADD COLUMN deleted_at DATETIME NULL;

-- Services table additions
ALTER TABLE services 
  ADD COLUMN description TEXT NULL,
  ADD COLUMN buffer_time_minutes INT DEFAULT 0,
  ADD COLUMN display_order INT DEFAULT 0,
  ADD COLUMN deleted_at DATETIME NULL;

-- Staff table additions
ALTER TABLE staff 
  ADD COLUMN bio TEXT NULL,
  ADD COLUMN avatar_url VARCHAR(500) NULL,
  ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6',
  ADD COLUMN display_order INT DEFAULT 0;

-- ============================================================
-- 2. NEW TABLES - Products & POS
-- ============================================================

CREATE TABLE IF NOT EXISTS product_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_categories_salon (salon_id),
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NULL,
  sku VARCHAR(100) NULL,
  barcode VARCHAR(100) NULL,
  stock_quantity INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  image_url VARCHAR(500) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_products_salon (salon_id),
  KEY idx_products_category (category_id),
  KEY idx_products_sku (sku),
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_booking_products_booking (booking_id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- 3. NEW TABLES - Discounts & Promotions
-- ============================================================

CREATE TABLE IF NOT EXISTS discounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
  value DECIMAL(10,2) NOT NULL,
  min_purchase DECIMAL(10,2) NULL,
  max_discount DECIMAL(10,2) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  max_uses INT NULL,
  max_uses_per_client INT NULL,
  current_uses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  applies_to_services BOOLEAN DEFAULT TRUE,
  applies_to_products BOOLEAN DEFAULT TRUE,
  first_booking_only BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_discount_code_salon (salon_id, code),
  KEY idx_discounts_salon (salon_id),
  KEY idx_discounts_code (code),
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_discounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  discount_id BIGINT UNSIGNED NOT NULL,
  discount_code VARCHAR(50) NOT NULL,
  discount_type ENUM('percentage','fixed') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  amount_saved DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_booking_discounts_booking (booking_id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- 4. NEW TABLES - Gift Cards
-- ============================================================

CREATE TABLE IF NOT EXISTS gift_cards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL,
  initial_balance DECIMAL(10,2) NOT NULL,
  remaining_balance DECIMAL(10,2) NOT NULL,
  purchased_by BIGINT UNSIGNED NULL,
  recipient_email VARCHAR(255) NULL,
  recipient_name VARCHAR(255) NULL,
  recipient_message TEXT NULL,
  status ENUM('active','used','expired','cancelled') DEFAULT 'active',
  expires_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gift_card_code (code),
  KEY idx_gift_cards_salon (salon_id),
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  FOREIGN KEY (purchased_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_gift_cards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  gift_card_id BIGINT UNSIGNED NOT NULL,
  amount_used DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_booking_gift_cards_booking (booking_id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- 5. NEW TABLES - Packages & Memberships
-- ============================================================

CREATE TABLE IF NOT EXISTS packages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  original_price DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2) NOT NULL,
  validity_days INT NULL,
  max_uses INT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  image_url VARCHAR(500) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_packages_salon (salon_id),
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS package_services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  package_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_package_service (package_id, service_id),
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS client_packages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  package_id BIGINT UNSIGNED NOT NULL,
  salon_id BIGINT UNSIGNED NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  remaining_uses INT NULL,
  status ENUM('active','expired','used','cancelled') DEFAULT 'active',
  expires_at DATETIME NULL,
  payment_id BIGINT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_client_packages_client (client_id),
  KEY idx_client_packages_salon (salon_id),
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE RESTRICT,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 6. NEW TABLES - Waitlist
-- ============================================================

CREATE TABLE IF NOT EXISTS waitlist (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NULL,
  staff_id BIGINT UNSIGNED NULL,
  preferred_date DATE NOT NULL,
  preferred_time_start TIME NULL,
  preferred_time_end TIME NULL,
  notes TEXT NULL,
  status ENUM('pending','notified','booked','expired','cancelled') DEFAULT 'pending',
  notified_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_waitlist_salon (salon_id),
  KEY idx_waitlist_client (client_id),
  KEY idx_waitlist_date (preferred_date),
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 7. NEW TABLES - Resources (Rooms, Chairs, Equipment)
-- ============================================================

CREATE TABLE IF NOT EXISTS resources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('room','chair','equipment','other') NOT NULL,
  description TEXT NULL,
  capacity INT DEFAULT 1,
  color VARCHAR(7) DEFAULT '#6B7280',
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_resources_salon (salon_id),
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_resources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  resource_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_booking_resource (booking_id, resource_id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resource_blocks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  resource_id BIGINT UNSIGNED NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  reason VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_resource_blocks_resource (resource_id),
  KEY idx_resource_blocks_time (start_time, end_time),
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 8. NEW TABLES - Widget Settings
-- ============================================================

CREATE TABLE IF NOT EXISTS widget_settings (
  salon_id BIGINT UNSIGNED NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  primary_color VARCHAR(20) DEFAULT '#000000',
  secondary_color VARCHAR(20) DEFAULT '#FFFFFF',
  button_text VARCHAR(100) DEFAULT 'Book Now',
  show_services BOOLEAN DEFAULT TRUE,
  show_staff BOOLEAN DEFAULT TRUE,
  show_prices BOOLEAN DEFAULT TRUE,
  require_phone BOOLEAN DEFAULT TRUE,
  require_email BOOLEAN DEFAULT TRUE,
  allow_notes BOOLEAN DEFAULT TRUE,
  terms_url VARCHAR(500) NULL,
  success_message TEXT NULL,
  PRIMARY KEY (salon_id),
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 9. NEW TABLES - Refunds
-- ============================================================

CREATE TABLE IF NOT EXISTS refunds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NULL,
  stripe_refund_id VARCHAR(255) NULL,
  status ENUM('pending','processing','completed','failed') DEFAULT 'pending',
  processed_by BIGINT UNSIGNED NULL,
  failure_reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_refunds_payment (payment_id),
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 10. NEW TABLES - Marketing Campaigns
-- ============================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('email','sms','push') NOT NULL DEFAULT 'email',
  subject VARCHAR(255) NULL,
  content TEXT NOT NULL,
  target_audience ENUM('all','new','returning','inactive') DEFAULT 'all',
  status ENUM('draft','scheduled','sending','completed','cancelled') DEFAULT 'draft',
  scheduled_at DATETIME NULL,
  completed_at DATETIME NULL,
  recipient_count INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_campaigns_salon (salon_id),
  KEY idx_campaigns_status (status),
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 11. NEW TABLES - Last Minute Deals
-- ============================================================

CREATE TABLE IF NOT EXISTS last_minute_slots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  staff_id BIGINT UNSIGNED NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  original_price DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2) NOT NULL,
  discount_percent INT NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_last_minute_salon (salon_id),
  KEY idx_last_minute_time (start_time),
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 12. NEW TABLES - Staff Commissions
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_commissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  commission_type ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
  service_commission DECIMAL(5,2) DEFAULT 0,
  product_commission DECIMAL(5,2) DEFAULT 0,
  tip_commission DECIMAL(5,2) DEFAULT 100,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff_commissions_staff (staff_id),
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 13. NEW TABLES - Payouts to Salons
-- ============================================================

CREATE TABLE IF NOT EXISTS payouts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status ENUM('pending','processing','completed','failed') DEFAULT 'pending',
  method ENUM('bank_transfer','stripe','manual') DEFAULT 'bank_transfer',
  reference VARCHAR(255) NULL,
  bank_account_last4 VARCHAR(4) NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  bookings_count INT DEFAULT 0,
  gross_amount DECIMAL(10,2) NOT NULL,
  platform_fees DECIMAL(10,2) DEFAULT 0,
  refunds_amount DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  failure_reason TEXT NULL,
  processed_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payouts_salon (salon_id),
  KEY idx_payouts_status (status),
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 14. NEW TABLES - Platform Settings
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NULL,
  value_type ENUM('string','number','boolean','json') DEFAULT 'string',
  description TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_setting_key (setting_key)
) ENGINE=InnoDB;

INSERT INTO platform_settings (setting_key, setting_value, value_type, description) VALUES
  ('platform_fee_percent', '2.5', 'number', 'Platform fee percentage'),
  ('new_client_fee_percent', '20', 'number', 'Fee for new marketplace clients'),
  ('default_currency', 'EUR', 'string', 'Default currency'),
  ('default_timezone', 'Europe/Paris', 'string', 'Default timezone'),
  ('maintenance_mode', 'false', 'boolean', 'Maintenance mode'),
  ('support_email', 'support@fresh.app', 'string', 'Support email')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- ============================================================
-- 15. NEW TABLES - Audit Log
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  old_data JSON NULL,
  new_data JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_user (user_id),
  KEY idx_audit_logs_entity (entity_type, entity_id),
  KEY idx_audit_logs_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 16. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX idx_bookings_staff_datetime_status 
  ON bookings(staff_id, start_datetime, status);
CREATE INDEX idx_bookings_salon_datetime 
  ON bookings(salon_id, start_datetime);
CREATE INDEX idx_bookings_client_status 
  ON bookings(client_id, status);
CREATE INDEX idx_salons_marketplace_city 
  ON salons(is_marketplace_enabled, city);
CREATE INDEX idx_salons_geo 
  ON salons(latitude, longitude);
CREATE INDEX idx_payments_status_created 
  ON payments(status, created_at);
CREATE INDEX idx_reviews_salon_status 
  ON reviews(salon_id, status, created_at);
CREATE INDEX idx_services_salon_active 
  ON services(salon_id, is_active);
CREATE INDEX idx_salon_clients_last_visit 
  ON salon_clients(salon_id, last_visit_date);

-- ============================================================
-- END OF MIGRATIONS
-- ============================================================
