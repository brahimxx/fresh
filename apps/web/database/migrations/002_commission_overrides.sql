-- Migration: Commission Overrides for Services & Products
-- Description: Adds the staff_item_commissions table to support granular overrides mapped to the historical ledger.

CREATE TABLE IF NOT EXISTS `staff_item_commissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_commission_id` bigint unsigned NOT NULL,
  `item_type` enum('service', 'product') NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `commission_rate` decimal(5,2) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_staff_item_commissions_parent` (`staff_commission_id`),
  CONSTRAINT `fk_staff_item_commissions_parent` FOREIGN KEY (`staff_commission_id`) REFERENCES `staff_commissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
