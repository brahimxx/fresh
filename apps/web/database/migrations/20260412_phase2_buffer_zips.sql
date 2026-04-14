ALTER TABLE `salons`
ADD COLUMN `covered_zip_codes` text DEFAULT NULL COMMENT 'Comma separated list of zip codes covered for mobile service',
ADD COLUMN `travel_buffer_time` int DEFAULT 0 COMMENT 'Minutes automatically added before/after mobile bookings';
