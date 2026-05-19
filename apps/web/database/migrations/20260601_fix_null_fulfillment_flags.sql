-- =========================================================================
-- Data-fix: Set all NULL can_physical/can_mobile/can_virtual to explicit defaults
-- =========================================================================
-- Why:
--   Before dropping the legacy `offering_type` column, we must ensure that
--   every row in the services table has explicit boolean values for the
--   fulfillment flag columns. Any remaining NULLs would cause issues once
--   the fallback logic referencing offering_type is removed.
--
-- Defaults:
--   can_physical = 1 (services are physical by default)
--   can_mobile   = 0 (not mobile by default)
--   can_virtual  = 0 (not virtual by default)
--
-- Requirements: 8.4
-- =========================================================================

SET SQL_SAFE_UPDATES = 0;

UPDATE services SET can_physical = 1 WHERE can_physical IS NULL;
UPDATE services SET can_mobile = 0 WHERE can_mobile IS NULL;
UPDATE services SET can_virtual = 0 WHERE can_virtual IS NULL;

SET SQL_SAFE_UPDATES = 1;
