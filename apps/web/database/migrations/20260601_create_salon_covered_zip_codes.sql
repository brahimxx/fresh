-- ============================================================================
-- Migration: 20260601_create_salon_covered_zip_codes
-- Spec: hybrid-fulfillment-fixes (Task 15.1)
--
-- Creates the `salon_covered_zip_codes` table to normalize covered ZIP codes
-- from the comma-separated `salons.covered_zip_codes` text field into
-- individual rows for efficient lookups and scalability.
--
-- Re-running this migration is a no-op (uses CREATE TABLE IF NOT EXISTS).
--
-- Validates: Requirements 12.1
-- ============================================================================

CREATE TABLE IF NOT EXISTS `salon_covered_zip_codes` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `salon_id`   BIGINT UNSIGNED NOT NULL,
  `zip_code`   VARCHAR(20) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_salon_zip` (`salon_id`, `zip_code`),
  CONSTRAINT `fk_scz_salon` FOREIGN KEY (`salon_id`)
    REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
