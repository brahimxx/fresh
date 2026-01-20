-- Add staff_services table for many-to-many relationship between staff and services
-- Created: January 18, 2026

CREATE TABLE IF NOT EXISTS `staff_services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_service` (`staff_id`, `service_id`),
  KEY `idx_staff_services_staff` (`staff_id`),
  KEY `idx_staff_services_service` (`service_id`),
  CONSTRAINT `fk_staff_services_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_services_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
