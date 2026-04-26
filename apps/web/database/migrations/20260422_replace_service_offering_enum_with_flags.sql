
-- =========================================================================
-- Replace services.offering_type enum model with explicit capability flags
-- =========================================================================
-- Why:
--   offering_type enum can't represent combinations cleanly and makes filtering
--   brittle. Flags allow precise capability queries and future flexibility.
--
-- Rollout strategy:
--   1) Add can_physical / can_mobile / can_virtual columns
--   2) Backfill from legacy offering_type
--   3) Add index for fulfillment filtering
--   4) Keep offering_type for backward compatibility (deprecated)
-- =========================================================================

DROP PROCEDURE IF EXISTS _add_service_fulfillment_flags;
DELIMITER //
CREATE PROCEDURE _add_service_fulfillment_flags()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'services'
      AND COLUMN_NAME = 'can_physical'
  ) THEN
    ALTER TABLE `services`
      ADD COLUMN `can_physical` tinyint(1) NOT NULL DEFAULT 1
        COMMENT 'Service can be fulfilled physically at salon',
      ADD COLUMN `can_mobile` tinyint(1) NOT NULL DEFAULT 1
        COMMENT 'Service can be fulfilled as mobile/home visit',
      ADD COLUMN `can_virtual` tinyint(1) NOT NULL DEFAULT 1
        COMMENT 'Service can be fulfilled virtually';
  END IF;
END //
DELIMITER ;
CALL _add_service_fulfillment_flags();
DROP PROCEDURE IF EXISTS _add_service_fulfillment_flags;

-- Backfill explicit flags from legacy enum semantics
SET SQL_SAFE_UPDATES = 0;

UPDATE `services`
SET
  `can_physical` = CASE
    WHEN `offering_type` = 'physical' THEN 1
    WHEN `offering_type` = 'mobile' THEN 0
    WHEN `offering_type` = 'virtual' THEN 0
    ELSE 1
  END,
  `can_mobile` = CASE
    WHEN `offering_type` = 'mobile' THEN 1
    WHEN `offering_type` = 'physical' THEN 0
    WHEN `offering_type` = 'virtual' THEN 0
    ELSE 1
  END,
  `can_virtual` = CASE
    WHEN `offering_type` = 'virtual' THEN 1
    WHEN `offering_type` = 'physical' THEN 0
    WHEN `offering_type` = 'mobile' THEN 0
    ELSE 1
  END;

SET SQL_SAFE_UPDATES = 1;

DROP PROCEDURE IF EXISTS _add_services_fulfillment_index;
DELIMITER //
CREATE PROCEDURE _add_services_fulfillment_index()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'services'
      AND INDEX_NAME = 'idx_services_fulfillment_flags'
  ) THEN
    ALTER TABLE `services`
      ADD INDEX `idx_services_fulfillment_flags` (`can_physical`, `can_mobile`, `can_virtual`);
  END IF;
END //
DELIMITER ;
CALL _add_services_fulfillment_index();
DROP PROCEDURE IF EXISTS _add_services_fulfillment_index;

-- NOTE:
-- Keep `offering_type` for now to avoid hard break during deploy.
-- Code now reads/writes can_* flags as the source of truth.
