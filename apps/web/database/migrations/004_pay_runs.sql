-- Migration: Pay Runs & Payroll Locking
-- Description: Adds tables to generate, lock, and store historical payroll and commission payouts.

DROP TABLE IF EXISTS `staff_pay_run_items`;
DROP TABLE IF EXISTS `staff_pay_runs`;

CREATE TABLE `staff_pay_runs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `staff_id` bigint unsigned NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `status` enum('generated','paid') NOT NULL DEFAULT 'generated',
  `total_revenue` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_services_commission` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_products_commission` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_tips_commission` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_wages` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_payout` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pay_runs_salon` (`salon_id`),
  KEY `idx_pay_runs_staff` (`staff_id`),
  CONSTRAINT `fk_pay_runs_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pay_runs_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pay_runs_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `staff_pay_run_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pay_run_id` bigint unsigned NOT NULL,
  `item_type` enum('service','product','tip','timesheet') NOT NULL,
  `item_id` bigint unsigned NOT NULL COMMENT 'ID from booking_services, booking_products, payments, or staff_timesheets',
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Revenue or Hours',
  `rate` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Commission % or Hourly Rate',
  `payout_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pay_run_items_parent` (`pay_run_id`),
  CONSTRAINT `fk_pay_run_items_parent` FOREIGN KEY (`pay_run_id`) REFERENCES `staff_pay_runs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
