-- ============================================================================
-- Migration: 20260601_products_sales_overhaul
-- Spec: products-and-sales-improvements (Task 1.1)
--
-- Idempotent schema overhaul for the Products and Sales pages:
--   1. products.brand VARCHAR(120) NULL + idx_products_brand
--   2. product_categories.deleted_at DATETIME NULL
--   3. payments.status ENUM extended with 'partially_refunded'
--   4. product_stock_movements (new table) for the per-product movement log
--
-- Re-running this migration is a no-op:
--   - Column adds use information_schema pre-flight checks
--   - Enum extension uses LOCATE() guard against COLUMN_TYPE
--   - Table creation uses CREATE TABLE IF NOT EXISTS
--   - No row-level UPDATE/INSERT statements run; existing data is untouched
--
-- Validates: Requirements 5.1, 6.4, 12.1, 22.3, 22.4, 22.5
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. products: add `brand` VARCHAR(120) NULL + supporting index
-- ----------------------------------------------------------------------------
SET @s := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'products'
         AND COLUMN_NAME = 'brand') = 0,
    'ALTER TABLE products ADD COLUMN brand VARCHAR(120) NULL AFTER name, ADD INDEX idx_products_brand (brand)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Defensive: the index might be missing even if the column already exists
-- (e.g. partial prior run). Add it idempotently.
SET @s := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'products'
         AND INDEX_NAME = 'idx_products_brand') = 0
    AND
    (SELECT COUNT(*) FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'products'
         AND COLUMN_NAME = 'brand') = 1,
    'ALTER TABLE products ADD INDEX idx_products_brand (brand)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 2. product_categories: add `deleted_at` DATETIME NULL
-- ----------------------------------------------------------------------------
SET @s := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'product_categories'
         AND COLUMN_NAME = 'deleted_at') = 0,
    'ALTER TABLE product_categories ADD COLUMN deleted_at DATETIME NULL AFTER created_at',
    'SELECT 1'
  )
);
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 3. payments.status: extend ENUM with 'partially_refunded'
--    Default ('pending') and existing rows are preserved; no UPDATE runs.
-- ----------------------------------------------------------------------------
SET @currentEnum := (
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'payments'
     AND COLUMN_NAME = 'status'
);
SET @needsAdd := IF(
  @currentEnum IS NOT NULL AND LOCATE("'partially_refunded'", @currentEnum) = 0,
  1,
  0
);
SET @s := IF(
  @needsAdd = 1,
  "ALTER TABLE payments MODIFY COLUMN `status` ENUM('pending','paid','refunded','partially_refunded') NOT NULL DEFAULT 'pending'",
  "SELECT 1"
);
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 4. product_stock_movements: new table for the stock movement log
--    Starts empty (no backfill, Requirement 22.5).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `product_stock_movements` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id`      BIGINT UNSIGNED NOT NULL,
  `salon_id`        BIGINT UNSIGNED NOT NULL,
  `change_type`     ENUM('set','add','subtract') NOT NULL,
  `quantity_before` INT NOT NULL,
  `quantity_after`  INT NOT NULL,
  `delta`           INT NOT NULL,
  `reason_code`     ENUM('manual_set','manual_adjustment','restock','waste',
                         'correction','sale','refund') NOT NULL,
  `reason_note`     VARCHAR(500) NULL,
  `performed_by`    BIGINT UNSIGNED NULL,
  `booking_id`      BIGINT UNSIGNED NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_psm_product_created` (`product_id`, `created_at`),
  KEY `idx_psm_salon_created`   (`salon_id`,   `created_at`),
  KEY `idx_psm_booking`         (`booking_id`),
  CONSTRAINT `fk_psm_product` FOREIGN KEY (`product_id`)
    REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_psm_salon` FOREIGN KEY (`salon_id`)
    REFERENCES `salons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_psm_user` FOREIGN KEY (`performed_by`)
    REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_psm_booking` FOREIGN KEY (`booking_id`)
    REFERENCES `bookings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
