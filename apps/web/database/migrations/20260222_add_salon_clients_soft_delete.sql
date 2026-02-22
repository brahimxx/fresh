-- Migration: 20260222_add_salon_clients_soft_delete
--
-- Adds soft-delete support to salon_clients.
--
-- WHY soft-delete instead of hard delete:
--   bookings.client_id → users.id is a live FK.  Removing a salon_clients
--   row does not break the FK, but it does remove the client from every
--   dashboard CRM view and report, while their booking history remains
--   visible in bookings — an inconsistency that confuses staff.
--
--   Soft-delete (is_active = 0) lets us:
--     • hide the client from the CRM list / search
--     • preserve all booking history rows untouched
--     • re-activate automatically if the client books again or is re-added
--
-- COLUMNS ADDED:
--   is_active  TINYINT(1) NOT NULL DEFAULT 1
--     0 = removed from salon CRM, 1 = active relationship
--   updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
--     Records when the row was last changed (covers is_active flips,
--     notes edits, last_visit_date updates from checkout).
--
-- Run this migration once per environment (idempotent guard on is_active).
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Add is_active if it does not already exist
DELIMITER $$
DROP PROCEDURE IF EXISTS _add_salon_clients_is_active$$
CREATE PROCEDURE _add_salon_clients_is_active()
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'salon_clients'
       AND COLUMN_NAME  = 'is_active'
  ) THEN
    ALTER TABLE salon_clients
      ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER total_visits;
  END IF;
END$$
CALL _add_salon_clients_is_active()$$
DROP PROCEDURE IF EXISTS _add_salon_clients_is_active$$

-- 2. Add updated_at if it does not already exist
DROP PROCEDURE IF EXISTS _add_salon_clients_updated_at$$
CREATE PROCEDURE _add_salon_clients_updated_at()
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'salon_clients'
       AND COLUMN_NAME  = 'updated_at'
  ) THEN
    ALTER TABLE salon_clients
      ADD COLUMN updated_at DATETIME NULL DEFAULT NULL
                            ON UPDATE CURRENT_TIMESTAMP
      AFTER notes;
  END IF;
END$$
CALL _add_salon_clients_updated_at()$$
DROP PROCEDURE IF EXISTS _add_salon_clients_updated_at$$

DELIMITER ;

-- 3. Backfill: all pre-existing rows are active relationships
--    salon_id is part of the PK so the WHERE satisfies safe-update mode.
--    The is_active check avoids touching rows that are already correct.
UPDATE salon_clients
   SET is_active = 1
 WHERE salon_id > 0
   AND (is_active IS NULL OR is_active != 1);

-- 4. Index: powers the CRM list query
--    (salon_id, is_active, last_visit_date) — ORDER BY last_visit_date with
--    an is_active = 1 filter will walk only active rows, not the full table.
DROP PROCEDURE IF EXISTS _idx_salon_clients_active;
DELIMITER $$
CREATE PROCEDURE _idx_salon_clients_active()
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'salon_clients'
       AND INDEX_NAME   = 'idx_salon_clients_active'
  ) THEN
    ALTER TABLE salon_clients
      ADD INDEX idx_salon_clients_active (salon_id, is_active, last_visit_date);
  END IF;
END$$
CALL _idx_salon_clients_active()$$
DROP PROCEDURE IF EXISTS _idx_salon_clients_active$$
DELIMITER ;
