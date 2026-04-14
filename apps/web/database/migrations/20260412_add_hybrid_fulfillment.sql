-- =========================================================================
-- Phase 1: Database & Data Structure (The Logic)
-- Hybrid Fulfillment Support: Physical, Mobile, Virtual
-- =========================================================================

-- 1. Salons Table Updates
-- Boolean flags for hybrid support instead of a single enum
ALTER TABLE `salons`
ADD COLUMN `is_physical` tinyint(1) NOT NULL DEFAULT '1',
ADD COLUMN `is_mobile` tinyint(1) NOT NULL DEFAULT '0',
ADD COLUMN `is_virtual` tinyint(1) NOT NULL DEFAULT '0',
-- Mobile/Travel specific fields
ADD COLUMN `travel_radius` int DEFAULT NULL COMMENT 'Travel radius in km/miles',
ADD COLUMN `travel_fee_type` enum('fixed', 'per_km', 'none') DEFAULT 'none',
-- Note: 'travel_fee_amount' to store the actual rate if fixed or per_km
ADD COLUMN `travel_fee_amount` decimal(10,2) DEFAULT '0.00',
ADD COLUMN `min_booking_amount` decimal(10,2) DEFAULT '0.00' COMMENT 'Min order value to make travel worth it';

-- 2. Services Table Updates
-- Service-level override to specify how it can be fulfilled
ALTER TABLE `services`
ADD COLUMN `offering_type` enum('physical', 'mobile', 'virtual', 'hybrid') NOT NULL DEFAULT 'hybrid' COMMENT 'How this specific service can be fulfilled';

-- 3. Bookings Table Updates
-- Tracking where a mobile service happens or the timezone for a virtual one
ALTER TABLE `bookings`
ADD COLUMN `fulfillment_type` enum('physical', 'mobile', 'virtual') NOT NULL DEFAULT 'physical' COMMENT 'How this exact booking is being fulfilled',
ADD COLUMN `service_location_address` text DEFAULT NULL COMMENT 'Client address for mobile bookings',
ADD COLUMN `service_lat` decimal(10,7) DEFAULT NULL COMMENT 'Lat for mobile bookings',
ADD COLUMN `service_lng` decimal(10,7) DEFAULT NULL COMMENT 'Lng for mobile bookings',
ADD COLUMN `client_timezone` varchar(50) DEFAULT NULL COMMENT 'Timezone for virtual bookings',
ADD COLUMN `virtual_meeting_link` text DEFAULT NULL COMMENT 'Generated or static meeting link for virtual bookings';

