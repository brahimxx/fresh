-- Migration: Add custom permissions JSON column to staff table
-- NULL = use role-based defaults; only store overrides when owner customizes

ALTER TABLE staff ADD COLUMN permissions JSON DEFAULT NULL
  COMMENT 'Custom permission overrides. NULL = use role defaults.';
