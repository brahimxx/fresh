-- =========================================================================
-- Add mobile base address for travel radius calculations
-- =========================================================================
-- Why:
--   Mobile-only businesses may not have a physical salon address. We need an
--   explicit origin point for radius-based service area enforcement.
-- =========================================================================

DROP PROCEDURE IF EXISTS _add_mobile_base_address_to_salons;
DELIMITER //
CREATE PROCEDURE _add_mobile_base_address_to_salons()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'salons'
      AND COLUMN_NAME = 'mobile_base_address'
  ) THEN
    ALTER TABLE `salons`
      ADD COLUMN `mobile_base_address` varchar(255) DEFAULT NULL
        COMMENT 'Base address used as center point for mobile travel radius';
  END IF;
END //
DELIMITER ;

CALL _add_mobile_base_address_to_salons();
DROP PROCEDURE IF EXISTS _add_mobile_base_address_to_salons;
