-- ============================================================================
-- Migration: 20260601_migrate_covered_zip_codes_data
-- Spec: hybrid-fulfillment-fixes (Task 15.2)
--
-- Migrates existing comma-separated `salons.covered_zip_codes` values into
-- individual rows in the `salon_covered_zip_codes` table.
--
-- Uses a numbers table (1–10) joined with SUBSTRING_INDEX to split CSV values.
-- Handles NULL and empty string cases by filtering them out in the WHERE clause.
-- Uses INSERT IGNORE to gracefully handle duplicate entries if re-run.
--
-- Assumes a maximum of 10 comma-separated ZIP codes per salon. If a salon has
-- more than 10, extend the numbers subquery accordingly.
--
-- Validates: Requirements 12.2
-- ============================================================================

INSERT IGNORE INTO `salon_covered_zip_codes` (`salon_id`, `zip_code`)
SELECT
  s.`id`,
  TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(s.`covered_zip_codes`, ',', n.n), ',', -1))
FROM `salons` s
JOIN (
  SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
) n
  ON n.n <= 1 + LENGTH(s.`covered_zip_codes`) - LENGTH(REPLACE(s.`covered_zip_codes`, ',', ''))
WHERE s.`covered_zip_codes` IS NOT NULL
  AND s.`covered_zip_codes` != ''
  AND TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(s.`covered_zip_codes`, ',', n.n), ',', -1)) != '';
