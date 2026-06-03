-- Add deleted_at for soft deletes on staff_timesheets
ALTER TABLE `staff_timesheets`
ADD COLUMN `deleted_at` datetime DEFAULT NULL AFTER `approved_at`;

-- Update indexes for performance since deleted_at will be frequently filtered
ALTER TABLE `staff_timesheets`
ADD INDEX `idx_staff_timesheets_deleted` (`deleted_at`);
