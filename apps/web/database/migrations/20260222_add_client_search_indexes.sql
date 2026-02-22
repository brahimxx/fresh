-- Migration: 20260222_add_client_search_indexes
--
-- Adds three B-tree indexes that make the client search query in
-- GET /api/clients instant on large datasets.
--
-- Why prefix LIKE ('term%') works but leading-wildcard LIKE ('%term%') does not:
--   A B-tree index stores keys in sorted order.  MySQL can seek directly to
--   the first matching key for 'term%' and stop scanning when the prefix no
--   longer matches — O(log n) seek + narrow range scan.
--   '%term%' forces a full index scan because the matching keys are not
--   contiguous in the sorted order — effectively O(n).
--
-- phone      → primary search vector in Algerian salons; always typed left-to-right
-- first_name → name search from first letter
-- last_name  → name search from first letter
--
-- Idempotent: each block checks information_schema.STATISTICS before adding,
-- so re-running the migration is safe on any MySQL version (8.0+).

-- ── idx_users_phone ───────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS _add_idx_users_phone;
DELIMITER $$
CREATE PROCEDURE _add_idx_users_phone()
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'users'
       AND INDEX_NAME   = 'idx_users_phone'
  ) THEN
    ALTER TABLE `users` ADD INDEX `idx_users_phone` (`phone`);
  END IF;
END$$
DELIMITER ;
CALL _add_idx_users_phone();
DROP PROCEDURE IF EXISTS _add_idx_users_phone;

-- ── idx_users_first_name ──────────────────────────────────────────────────
-- Independent index (not composite with last_name) because receptionists
-- search by first OR last name separately; two separate indexes let MySQL
-- pick the cheaper range scan per query rather than forcing a composite scan.
DROP PROCEDURE IF EXISTS _add_idx_users_first_name;
DELIMITER $$
CREATE PROCEDURE _add_idx_users_first_name()
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'users'
       AND INDEX_NAME   = 'idx_users_first_name'
  ) THEN
    ALTER TABLE `users` ADD INDEX `idx_users_first_name` (`first_name`);
  END IF;
END$$
DELIMITER ;
CALL _add_idx_users_first_name();
DROP PROCEDURE IF EXISTS _add_idx_users_first_name;

-- ── idx_users_last_name ───────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS _add_idx_users_last_name;
DELIMITER $$
CREATE PROCEDURE _add_idx_users_last_name()
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'users'
       AND INDEX_NAME   = 'idx_users_last_name'
  ) THEN
    ALTER TABLE `users` ADD INDEX `idx_users_last_name` (`last_name`);
  END IF;
END$$
DELIMITER ;
CALL _add_idx_users_last_name();
DROP PROCEDURE IF EXISTS _add_idx_users_last_name;

-- ── idx_bookings_client_salon_start ───────────────────────────────────────
-- Covers the client booking-history query exactly:
--   WHERE client_id = ? AND salon_id = ? AND deleted_at IS NULL
--   ORDER BY start_datetime DESC
--
-- With only idx_bookings_client_id, MySQL seeks client rows then filters
-- salon_id with a row-by-row check and needs a filesort for ORDER BY.
-- The composite (client_id, salon_id, start_datetime) lets MySQL seek
-- directly to (client_id, salon_id) and walk start_datetime in reverse
-- order — no filesort, no extra heap reads for the ORDER BY.
--
-- deleted_at IS NULL is NOT in the index because NULLs are not stored
-- contiguously in a B-tree; including it would make the index larger
-- without eliminating the per-row IS NULL check.  The index already
-- narrows the result to this client+salon; the IS NULL filter on that
-- small result set is negligible.
DROP PROCEDURE IF EXISTS _add_idx_bookings_client_salon_start;
DELIMITER $$
CREATE PROCEDURE _add_idx_bookings_client_salon_start()
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'bookings'
       AND INDEX_NAME   = 'idx_bookings_client_salon_start'
  ) THEN
    ALTER TABLE `bookings`
      ADD INDEX `idx_bookings_client_salon_start`
        (`client_id`, `salon_id`, `start_datetime`);
  END IF;
END$$
DELIMITER ;
CALL _add_idx_bookings_client_salon_start();
DROP PROCEDURE IF EXISTS _add_idx_bookings_client_salon_start;
