-- ============================================================================
-- Migration: 20260602_drop_covered_zip_codes_column
-- Spec: hybrid-fulfillment-fixes (Task 15.4)
--
-- Drops the deprecated `covered_zip_codes` TEXT column from the `salons` table.
--
-- IMPORTANT: This migration should only be run AFTER verifying that:
--   1. The `salon_covered_zip_codes` table has been created (20260601_create_salon_covered_zip_codes)
--   2. Data has been migrated successfully (20260601_migrate_covered_zip_codes_data)
--   3. All application code uses the new table for ZIP code lookups (Task 15.3)
--   4. No rollback to the old column-based approach is needed
--
-- This is intentionally a separate deployment from the code changes to allow
-- rollback if issues arise with the normalized table approach.
--
-- Validates: Requirements 12.4
-- ============================================================================

ALTER TABLE `salons` DROP COLUMN `covered_zip_codes`;
