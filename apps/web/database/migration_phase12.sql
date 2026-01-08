-- Phase 12 Migration: Add missing columns + indexes safely (MySQL 9.x compatible)
-- Run this migration to add columns required by marketplace features
-- Uses stored procedures + information_schema checks for idempotency

DELIMITER //

DROP PROCEDURE IF EXISTS AddColumnIfNotExists//

CREATE PROCEDURE AddColumnIfNotExists(
  IN tableName VARCHAR(100),
  IN columnName VARCHAR(100),
  IN columnDef VARCHAR(500)
)
BEGIN
  IF NOT EXISTS (
    SELECT * FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = tableName 
    AND COLUMN_NAME = columnName
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDef);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DROP PROCEDURE IF EXISTS AddIndexIfNotExists//

CREATE PROCEDURE AddIndexIfNotExists(
  IN tableName VARCHAR(100),
  IN indexName VARCHAR(100),
  IN indexDef  VARCHAR(500)   -- e.g. "(status, is_marketplace_enabled)"
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND INDEX_NAME = indexName
  ) THEN
    SET @sql = CONCAT('CREATE INDEX `', indexName, '` ON `', tableName, '` ', indexDef);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

-- =====================================================
-- SALONS TABLE ADDITIONS
-- =====================================================

CALL AddColumnIfNotExists('salons', 'logo_url', 'VARCHAR(500) NULL');
CALL AddColumnIfNotExists('salons', 'cover_image_url', 'VARCHAR(500) NULL');
CALL AddColumnIfNotExists('salons', 'website', 'VARCHAR(255) NULL');
CALL AddColumnIfNotExists('salons', 'price_level', 'TINYINT DEFAULT 2');
CALL AddColumnIfNotExists('salons', 'category', 'VARCHAR(100) DEFAULT ''Hair Salon''');
CALL AddColumnIfNotExists('salons', 'state', 'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('salons', 'postal_code', 'VARCHAR(20) NULL');
CALL AddColumnIfNotExists('salons', 'country', 'VARCHAR(100) DEFAULT ''USA''');
CALL AddColumnIfNotExists('salons', 'is_marketplace_enabled', 'TINYINT(1) DEFAULT 0');
CALL AddColumnIfNotExists('salons', 'status', 'VARCHAR(20) DEFAULT ''active''');

-- =====================================================
-- STAFF TABLE ADDITIONS
-- =====================================================

CALL AddColumnIfNotExists('staff', 'title', 'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('staff', 'bio', 'TEXT NULL');
CALL AddColumnIfNotExists('staff', 'avatar_url', 'VARCHAR(500) NULL');
CALL AddColumnIfNotExists('staff', 'is_visible', 'TINYINT(1) DEFAULT 1');

-- =====================================================
-- REVIEWS TABLE ADDITIONS
-- =====================================================

CALL AddColumnIfNotExists('reviews', 'staff_id', 'INT NULL');
CALL AddColumnIfNotExists('reviews', 'service_id', 'INT NULL');

-- =====================================================
-- SERVICE_CATEGORIES TABLE ADDITIONS
-- =====================================================

CALL AddColumnIfNotExists('service_categories', 'display_order', 'INT DEFAULT 0');

-- =====================================================
-- INDEXES FOR PERFORMANCE (safe / idempotent)
-- =====================================================
CALL AddIndexIfNotExists('salons', 'idx_salons_marketplace', '(status, is_marketplace_enabled)');
CALL AddIndexIfNotExists('salons', 'idx_salons_category', '(category)');
CALL AddIndexIfNotExists('salons', 'idx_salons_city', '(city)');
CALL AddIndexIfNotExists('staff', 'idx_staff_visible', '(salon_id, is_active, is_visible)');
CALL AddIndexIfNotExists('reviews', 'idx_reviews_staff', '(staff_id)');

-- Clean up
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;

-- =====================================================
-- SAMPLE DATA (Optional - uncomment to add test data)
-- =====================================================

/*
-- Update existing salons to enable marketplace
UPDATE salons SET 
  is_marketplace_enabled = 1,
  status = 'active',
  logo_url = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200',
  cover_image_url = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
  price_level = 2,
  category = 'Hair Salon'
WHERE is_active = 1;

-- Update staff with titles
UPDATE staff SET 
  title = 'Senior Stylist',
  is_visible = 1
WHERE is_active = 1;
*/
