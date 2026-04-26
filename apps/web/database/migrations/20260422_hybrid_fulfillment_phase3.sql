-- =========================================================================
-- Phase 3: Hybrid Fulfillment — Staff Capabilities, Travel Fee Line Items,
--          Service Price Overrides, Booking Travel Metadata
-- =========================================================================
-- All changes are backward-compatible:
--   • New staff columns default to can_physical=1 (existing behaviour)
--   • New booking columns default to 0/NULL (no change to existing rows)
--   • booking_travel_fees table is additive — no existing queries broken
-- =========================================================================

-- 1. Staff fulfillment capability flags + optional travel config
--    Wrapped in a procedure so re-running the migration never fails with
--    "Duplicate column name" (MySQL doesn't support ADD COLUMN IF NOT EXISTS
--    before 8.0.4).
DROP PROCEDURE IF EXISTS _add_staff_fulfillment_cols;
DELIMITER //
CREATE PROCEDURE _add_staff_fulfillment_cols()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff' AND COLUMN_NAME = 'can_physical'
  ) THEN
    ALTER TABLE `staff`
      ADD COLUMN `can_physical`   tinyint(1) NOT NULL DEFAULT 1
        COMMENT 'Staff can perform physical/in-salon services',
      ADD COLUMN `can_mobile`     tinyint(1) NOT NULL DEFAULT 0
        COMMENT 'Staff can travel to client for mobile services',
      ADD COLUMN `can_virtual`    tinyint(1) NOT NULL DEFAULT 0
        COMMENT 'Staff can deliver services virtually (video call)',
      ADD COLUMN `travel_radius`  int DEFAULT NULL
        COMMENT 'Staff-specific travel radius override in km (NULL = use salon default)',
      ADD COLUMN `home_lat`       decimal(10,7) DEFAULT NULL
        COMMENT 'Staff home/base latitude for distance calculations',
      ADD COLUMN `home_lng`       decimal(10,7) DEFAULT NULL
        COMMENT 'Staff home/base longitude for distance calculations';
  END IF;
END //
DELIMITER ;
CALL _add_staff_fulfillment_cols();
DROP PROCEDURE IF EXISTS _add_staff_fulfillment_cols;

-- 2. Travel fee as a persisted booking line item
--    Ensures calculateBookingTotal() can include travel fees from the DB,
--    never from frontend math.
CREATE TABLE IF NOT EXISTS `booking_travel_fees` (
  `id`          bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_id`  bigint unsigned NOT NULL,
  `fee_type`    enum('fixed','per_km') NOT NULL DEFAULT 'fixed',
  `distance_km` decimal(8,2) DEFAULT NULL
    COMMENT 'Calculated distance (populated for per_km type)',
  `amount`      decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at`  datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_booking_travel_fee` (`booking_id`),
  CONSTRAINT `fk_btf_booking` FOREIGN KEY (`booking_id`)
    REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Service-level price overrides for mobile / virtual fulfillment
--    NULL means "use the base price" — zero regression for existing services
ALTER TABLE `services`
  ADD COLUMN `mobile_price_override`  decimal(10,2) DEFAULT NULL
    COMMENT 'Price when fulfilled as mobile (NULL = use base price)',
  ADD COLUMN `virtual_price_override` decimal(10,2) DEFAULT NULL
    COMMENT 'Price when fulfilled as virtual (NULL = use base price)';

-- 4. Snapshot columns on bookings row for reporting queries
--    (avoids JOIN to booking_travel_fees for simple dashboard aggregates)
ALTER TABLE `bookings`
  ADD COLUMN `travel_fee_amount`   decimal(10,2) NOT NULL DEFAULT '0.00'
    COMMENT 'Snapshot of travel fee charged at booking time',
  ADD COLUMN `travel_distance_km`  decimal(8,2) DEFAULT NULL
    COMMENT 'Calculated travel distance at booking time (per_km bookings)';

-- 5. Indexes for fulfillment-type filter queries
ALTER TABLE `bookings`
  ADD INDEX `idx_bookings_fulfillment` (`fulfillment_type`);

ALTER TABLE `services`
  ADD INDEX `idx_services_offering` (`offering_type`);
