-- Migration: Add sub-window times to booking_services
-- Date: 2026-03-30
-- Description: Adds start_datetime and end_datetime columns to booking_services to prevent false-positive availability blocking and multi-service concurrency bugs.

ALTER TABLE `booking_services` 
ADD COLUMN `start_datetime` DATETIME NULL AFTER `staff_id`,
ADD COLUMN `end_datetime` DATETIME NULL AFTER `start_datetime`;

-- NOTE: Because backfilling historical data requires calculating chronological offsets 
-- using duration_minutes across multiple rows per booking, it is highly recommended 
-- to execute the accompanying Node.js migration script:
-- \`scripts/migrate_booking_services.js\`
-- to safely retroactively populate these columns for existing data.
