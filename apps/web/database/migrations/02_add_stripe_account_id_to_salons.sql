ALTER TABLE `salons` ADD COLUMN `stripe_account_id` varchar(255) DEFAULT NULL AFTER `is_active`;
CREATE INDEX `idx_salons_stripe_account` ON `salons`(`stripe_account_id`);
