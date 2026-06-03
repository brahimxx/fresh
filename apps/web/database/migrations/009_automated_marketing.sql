-- Migration 009: CRM & Automated Marketing
-- Creates the engine for triggered marketing workflows (Birthdays, Lapsed Clients, etc.)

CREATE TABLE `automated_campaigns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `trigger_type` enum('birthday', 'post_visit_review', 'lapsed_client', 'custom_date') NOT NULL,
  `trigger_days_offset` int NOT NULL DEFAULT 0 COMMENT '0 for day-of, positive for days after, negative for days before',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `type` enum('email','sms','push') NOT NULL DEFAULT 'email',
  `subject` varchar(255) DEFAULT NULL,
  `content` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_autocamp_salon` (`salon_id`),
  KEY `idx_autocamp_trigger` (`trigger_type`),
  CONSTRAINT `fk_autocamp_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create an execution log to ensure we don't trigger the same event multiple times for the same user
CREATE TABLE `automated_campaign_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `automated_campaign_id` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `generated_campaign_id` bigint unsigned DEFAULT NULL,
  `trigger_date` date NOT NULL,
  `executed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_autocamp_execution` (`automated_campaign_id`, `client_id`, `trigger_date`),
  KEY `idx_autocamplog_client` (`client_id`),
  CONSTRAINT `fk_autocamplog_autocamp` FOREIGN KEY (`automated_campaign_id`) REFERENCES `automated_campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_autocamplog_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_autocamplog_campaign` FOREIGN KEY (`generated_campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
