CREATE TABLE `salon_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_salon_categories_salon_id` (`salon_id`),
  KEY `idx_salon_categories_name` (`category_name`),
  CONSTRAINT `fk_salon_categories_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Migrate existing data (if you have old salons) before dropping the column
INSERT INTO `salon_categories` (`salon_id`, `category_name`, `is_primary`)
SELECT `id`, `category`, 1 FROM `salons` WHERE `category` IS NOT NULL;

-- Remove the old hardcoded column
ALTER TABLE `salons` DROP COLUMN `category`;
