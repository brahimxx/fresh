-- =========================================================================
-- Schema migration: Drop legacy offering_type column from services table
-- =========================================================================
-- Why:
--   The `offering_type` ENUM column is deprecated. Service fulfillment
--   capabilities are now represented by the boolean flag columns:
--   can_physical, can_mobile, can_virtual. All fallback logic referencing
--   offering_type has been removed from the codebase, and all rows have
--   explicit flag values (see 20260601_fix_null_fulfillment_flags.sql).
--
-- Steps:
--   1. Drop the index on offering_type first (required before column drop)
--   2. Drop the offering_type column itself
--
-- Requirements: 8.1, 8.2
-- =========================================================================

-- Step 1: Drop the index
DROP INDEX idx_services_offering ON services;

-- Step 2: Drop the column
ALTER TABLE services DROP COLUMN offering_type;
