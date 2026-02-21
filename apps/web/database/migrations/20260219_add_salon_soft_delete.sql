-- Migration: Add soft delete support for salons
-- Date: 2026-02-19
-- Description: Replaces hard delete with soft delete for data retention and compliance

-- Add deleted_at and deleted_by columns to salons table
ALTER TABLE salons 
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by BIGINT UNSIGNED NULL;

-- Add index for efficient filtering of non-deleted salons
CREATE INDEX idx_salons_deleted ON salons(deleted_at);

-- Add foreign key for deleted_by (optional, tracks who deleted)
ALTER TABLE salons
  ADD CONSTRAINT fk_salons_deleted_by 
  FOREIGN KEY (deleted_by) REFERENCES users(id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Rollback commands (if needed):
-- ALTER TABLE salons DROP FOREIGN KEY fk_salons_deleted_by;
-- ALTER TABLE salons DROP INDEX idx_salons_deleted;
-- ALTER TABLE salons DROP COLUMN deleted_at;
-- ALTER TABLE salons DROP COLUMN deleted_by;
