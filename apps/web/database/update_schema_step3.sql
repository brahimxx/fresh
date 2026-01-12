-- Fresh Database Schema Update Script
-- Use this script to update your existing 'fresh' database in MySQL Workbench


-- 2. Create 'business_hours' table
CREATE TABLE IF NOT EXISTS `business_hours` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `day_of_week` tinyint NOT NULL,
  `open_time` time DEFAULT NULL,
  `close_time` time DEFAULT NULL,
  `is_closed` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_business_hours_salon` (`salon_id`),
  CONSTRAINT `fk_business_hours_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Create 'salon_amenities' table
CREATE TABLE IF NOT EXISTS `salon_amenities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `amenity_name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_salon_amenities_salon` (`salon_id`),
  CONSTRAINT `fk_salon_amenities_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Create 'salon_gallery' table
CREATE TABLE IF NOT EXISTS `salon_gallery` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `display_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_salon_gallery_salon` (`salon_id`),
  CONSTRAINT `fk_salon_gallery_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
