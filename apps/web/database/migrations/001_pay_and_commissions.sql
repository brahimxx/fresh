-- Migration: Pay and Commissions
-- Description: Adds the staff_commissions table to support the new interactive commissions editor.

CREATE TABLE IF NOT EXISTS `staff_commissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint unsigned NOT NULL,
  `commission_type` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `service_commission` decimal(5,2) DEFAULT '0.00',
  `product_commission` decimal(5,2) DEFAULT '0.00',
  `tip_commission` decimal(5,2) DEFAULT '100.00',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_staff_commissions_staff` (`staff_id`),
  CONSTRAINT `staff_commissions_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
