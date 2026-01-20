-- Add created_at and updated_at timestamps to staff table
-- Created: January 19, 2026

ALTER TABLE `staff` 
  ADD COLUMN `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
