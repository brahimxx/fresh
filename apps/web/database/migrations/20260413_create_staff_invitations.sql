CREATE TABLE `staff_invitations` (
  `id` char(36) NOT NULL,
  `salon_id` bigint unsigned NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` enum('staff','manager','owner','receptionist') NOT NULL DEFAULT 'staff',
  `token` varchar(255) NOT NULL,
  `status` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invitations_token` (`token`),
  KEY `idx_invitations_salon` (`salon_id`),
  KEY `idx_invitations_email` (`email`),
  CONSTRAINT `fk_invitations_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
