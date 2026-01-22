-- MySQL dump 10.13  Distrib 8.0.42, for macos15 (x86_64)
--
-- Host: 127.0.0.1    Database: fresh
-- ------------------------------------------------------
-- Server version	9.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` bigint unsigned DEFAULT NULL,
  `old_data` json DEFAULT NULL,
  `new_data` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user` (`user_id`),
  KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_discounts`
--

DROP TABLE IF EXISTS `booking_discounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_discounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint unsigned NOT NULL,
  `discount_id` bigint unsigned NOT NULL,
  `discount_code` varchar(50) NOT NULL,
  `discount_type` enum('percentage','fixed') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `amount_saved` decimal(10,2) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_discounts_booking` (`booking_id`),
  KEY `discount_id` (`discount_id`),
  CONSTRAINT `booking_discounts_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_discounts_ibfk_2` FOREIGN KEY (`discount_id`) REFERENCES `discounts` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_discounts`
--

LOCK TABLES `booking_discounts` WRITE;
/*!40000 ALTER TABLE `booking_discounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking_discounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_gift_cards`
--

DROP TABLE IF EXISTS `booking_gift_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_gift_cards` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint unsigned NOT NULL,
  `gift_card_id` bigint unsigned NOT NULL,
  `amount_used` decimal(10,2) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_gift_cards_booking` (`booking_id`),
  KEY `gift_card_id` (`gift_card_id`),
  CONSTRAINT `booking_gift_cards_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_gift_cards_ibfk_2` FOREIGN KEY (`gift_card_id`) REFERENCES `gift_cards` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_gift_cards`
--

LOCK TABLES `booking_gift_cards` WRITE;
/*!40000 ALTER TABLE `booking_gift_cards` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking_gift_cards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_products`
--

DROP TABLE IF EXISTS `booking_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_products_booking` (`booking_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `booking_products_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_products_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_products`
--

LOCK TABLES `booking_products` WRITE;
/*!40000 ALTER TABLE `booking_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_resources`
--

DROP TABLE IF EXISTS `booking_resources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_resources` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint unsigned NOT NULL,
  `resource_id` bigint unsigned NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_booking_resource` (`booking_id`,`resource_id`),
  KEY `resource_id` (`resource_id`),
  CONSTRAINT `booking_resources_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_resources_ibfk_2` FOREIGN KEY (`resource_id`) REFERENCES `resources` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_resources`
--

LOCK TABLES `booking_resources` WRITE;
/*!40000 ALTER TABLE `booking_resources` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking_resources` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_services`
--

DROP TABLE IF EXISTS `booking_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_services` (
  `booking_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `duration_minutes` int NOT NULL,
  PRIMARY KEY (`booking_id`,`service_id`),
  KEY `idx_booking_services_service_id` (`service_id`),
  CONSTRAINT `fk_booking_services_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_services_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_services`
--

LOCK TABLES `booking_services` WRITE;
/*!40000 ALTER TABLE `booking_services` DISABLE KEYS */;
INSERT INTO `booking_services` VALUES (1,36,250.00,180),(2,36,250.00,180),(3,36,250.00,180),(4,36,250.00,180),(5,36,250.00,180),(6,36,250.00,180),(7,36,250.00,180),(8,36,250.00,180);
/*!40000 ALTER TABLE `booking_services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `staff_id` bigint unsigned NOT NULL,
  `start_datetime` datetime NOT NULL,
  `end_datetime` datetime NOT NULL,
  `status` enum('pending','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'pending',
  `source` enum('marketplace','direct') NOT NULL DEFAULT 'direct',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  `internal_notes` text,
  `cancelled_at` datetime DEFAULT NULL,
  `cancelled_by` bigint unsigned DEFAULT NULL,
  `cancellation_reason` text,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bookings_salon_id` (`salon_id`),
  KEY `idx_bookings_client_id` (`client_id`),
  KEY `idx_bookings_staff_id` (`staff_id`),
  KEY `idx_bookings_start` (`start_datetime`),
  KEY `idx_bookings_staff_datetime_status` (`staff_id`,`start_datetime`,`status`),
  KEY `idx_bookings_salon_datetime` (`salon_id`,`start_datetime`),
  KEY `idx_bookings_client_status` (`client_id`,`status`),
  CONSTRAINT `fk_bookings_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_bookings_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bookings_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES (1,163,185,9,'2026-01-19 08:00:00','2026-01-19 11:00:00','pending','marketplace','2026-01-18 18:06:11',NULL,NULL,NULL,NULL,NULL,NULL),(2,163,210,9,'2026-01-26 09:00:00','2026-01-26 12:00:00','pending','marketplace','2026-01-19 12:39:50','Concurrency Test',NULL,NULL,NULL,NULL,NULL),(3,163,216,9,'2026-01-20 08:00:00','2026-01-20 11:00:00','pending','marketplace','2026-01-19 12:58:22','Concurrency Test',NULL,NULL,NULL,NULL,NULL),(4,163,230,9,'2026-01-22 08:00:00','2026-01-22 11:00:00','pending','marketplace','2026-01-19 12:59:35','Concurrency Test',NULL,NULL,NULL,NULL,NULL),(5,163,231,9,'2026-01-25 08:00:00','2026-01-25 11:00:00','pending','marketplace','2026-01-19 12:59:35','Concurrency Test',NULL,NULL,NULL,NULL,NULL),(6,163,235,9,'2026-01-21 08:00:00','2026-01-21 11:00:00','pending','marketplace','2026-01-19 12:59:37','Concurrency Test',NULL,NULL,NULL,NULL,NULL),(7,163,242,9,'2026-01-21 13:00:00','2026-01-21 16:00:00','pending','marketplace','2026-01-19 13:04:03','Duplicate payment test',NULL,NULL,NULL,NULL,NULL),(8,163,185,9,'2026-01-19 14:45:00','2026-01-19 17:45:00','pending','marketplace','2026-01-19 15:17:37',NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_hours`
--

DROP TABLE IF EXISTS `business_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `business_hours` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `day_of_week` tinyint NOT NULL COMMENT '0=Sunday, 6=Saturday',
  `open_time` time DEFAULT NULL,
  `close_time` time DEFAULT NULL,
  `is_closed` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_salon_day` (`salon_id`,`day_of_week`),
  CONSTRAINT `fk_business_hours_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_hours`
--

LOCK TABLES `business_hours` WRITE;
/*!40000 ALTER TABLE `business_hours` DISABLE KEYS */;
INSERT INTO `business_hours` VALUES (29,163,0,'09:00:00','19:00:00',0),(30,163,1,'09:00:00','19:00:00',0),(31,163,2,'09:00:00','19:00:00',0),(32,163,3,'09:00:00','19:00:00',0),(33,163,4,'09:00:00','20:00:00',0),(34,163,5,'09:00:00','20:00:00',0),(35,163,6,NULL,NULL,1),(36,164,0,'10:00:00','20:00:00',0),(37,164,1,'10:00:00','20:00:00',0),(38,164,2,'10:00:00','20:00:00',0),(39,164,3,'10:00:00','20:00:00',0),(40,164,4,'10:00:00','21:00:00',0),(41,164,5,'10:00:00','21:00:00',0),(42,164,6,'11:00:00','18:00:00',0),(43,165,0,NULL,NULL,1),(44,165,1,NULL,NULL,1),(45,165,2,'10:00:00','19:00:00',0),(46,165,3,'10:00:00','19:00:00',0),(47,165,4,'10:00:00','20:00:00',0),(48,165,5,'10:00:00','20:00:00',0),(49,165,6,'09:00:00','18:00:00',0),(50,166,0,'09:00:00','18:00:00',0),(51,166,1,'09:00:00','18:00:00',0),(52,166,2,'09:00:00','18:00:00',0),(53,166,3,'09:00:00','18:00:00',0),(54,166,4,'09:00:00','19:00:00',0),(55,166,5,'09:00:00','19:00:00',0),(56,166,6,NULL,NULL,1),(57,167,0,'10:00:00','20:00:00',0),(58,167,1,'10:00:00','20:00:00',0),(59,167,2,'10:00:00','20:00:00',0),(60,167,3,'10:00:00','20:00:00',0),(61,167,4,'10:00:00','21:00:00',0),(62,167,5,'10:00:00','21:00:00',0),(63,167,6,'11:00:00','19:00:00',0),(64,168,0,'09:00:00','19:00:00',0),(65,168,1,'09:00:00','19:00:00',0),(66,168,2,'09:00:00','19:00:00',0),(67,168,3,'09:00:00','19:00:00',0),(68,168,4,'09:00:00','20:00:00',0),(69,168,5,'09:00:00','20:00:00',0),(70,168,6,'10:00:00','17:00:00',0);
/*!40000 ALTER TABLE `business_hours` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaigns`
--

DROP TABLE IF EXISTS `campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaigns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('email','sms','push') NOT NULL DEFAULT 'email',
  `subject` varchar(255) DEFAULT NULL,
  `content` text NOT NULL,
  `target_audience` enum('all','new','returning','inactive') DEFAULT 'all',
  `status` enum('draft','scheduled','sending','completed','cancelled') DEFAULT 'draft',
  `scheduled_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `recipient_count` int DEFAULT '0',
  `sent_count` int DEFAULT '0',
  `open_count` int DEFAULT '0',
  `click_count` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_campaigns_salon` (`salon_id`),
  KEY `idx_campaigns_status` (`status`),
  CONSTRAINT `campaigns_ibfk_1` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaigns`
--

LOCK TABLES `campaigns` WRITE;
/*!40000 ALTER TABLE `campaigns` DISABLE KEYS */;
/*!40000 ALTER TABLE `campaigns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_packages`
--

DROP TABLE IF EXISTS `client_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_packages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `package_id` bigint unsigned NOT NULL,
  `salon_id` bigint unsigned NOT NULL,
  `purchase_price` decimal(10,2) NOT NULL,
  `remaining_uses` int DEFAULT NULL,
  `status` enum('active','expired','used','cancelled') DEFAULT 'active',
  `expires_at` datetime DEFAULT NULL,
  `payment_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_client_packages_client` (`client_id`),
  KEY `idx_client_packages_salon` (`salon_id`),
  KEY `package_id` (`package_id`),
  CONSTRAINT `client_packages_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_packages_ibfk_2` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `client_packages_ibfk_3` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_packages`
--

LOCK TABLES `client_packages` WRITE;
/*!40000 ALTER TABLE `client_packages` DISABLE KEYS */;
/*!40000 ALTER TABLE `client_packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `discounts`
--

DROP TABLE IF EXISTS `discounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `discounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `type` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `value` decimal(10,2) NOT NULL,
  `min_purchase` decimal(10,2) DEFAULT NULL,
  `max_discount` decimal(10,2) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `max_uses` int DEFAULT NULL,
  `max_uses_per_client` int DEFAULT NULL,
  `current_uses` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `applies_to_services` tinyint(1) DEFAULT '1',
  `applies_to_products` tinyint(1) DEFAULT '1',
  `first_booking_only` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_discount_code_salon` (`salon_id`,`code`),
  KEY `idx_discounts_salon` (`salon_id`),
  KEY `idx_discounts_code` (`code`),
  CONSTRAINT `discounts_ibfk_1` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `discounts`
--

LOCK TABLES `discounts` WRITE;
/*!40000 ALTER TABLE `discounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `discounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gift_cards`
--

DROP TABLE IF EXISTS `gift_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gift_cards` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `code` varchar(50) NOT NULL,
  `initial_balance` decimal(10,2) NOT NULL,
  `remaining_balance` decimal(10,2) NOT NULL,
  `purchased_by` bigint unsigned DEFAULT NULL,
  `recipient_email` varchar(255) DEFAULT NULL,
  `recipient_name` varchar(255) DEFAULT NULL,
  `recipient_message` text,
  `status` enum('active','used','expired','cancelled') DEFAULT 'active',
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gift_card_code` (`code`),
  KEY `idx_gift_cards_salon` (`salon_id`),
  KEY `purchased_by` (`purchased_by`),
  CONSTRAINT `gift_cards_ibfk_1` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `gift_cards_ibfk_2` FOREIGN KEY (`purchased_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gift_cards`
--

LOCK TABLES `gift_cards` WRITE;
/*!40000 ALTER TABLE `gift_cards` DISABLE KEYS */;
/*!40000 ALTER TABLE `gift_cards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `last_minute_slots`
--

DROP TABLE IF EXISTS `last_minute_slots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `last_minute_slots` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned NOT NULL,
  `staff_id` bigint unsigned NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `original_price` decimal(10,2) NOT NULL,
  `discounted_price` decimal(10,2) NOT NULL,
  `discount_percent` int NOT NULL,
  `is_booked` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_last_minute_salon` (`salon_id`),
  KEY `idx_last_minute_time` (`start_time`),
  KEY `service_id` (`service_id`),
  KEY `staff_id` (`staff_id`),
  CONSTRAINT `last_minute_slots_ibfk_1` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `last_minute_slots_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `last_minute_slots_ibfk_3` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `last_minute_slots`
--

LOCK TABLES `last_minute_slots` WRITE;
/*!40000 ALTER TABLE `last_minute_slots` DISABLE KEYS */;
/*!40000 ALTER TABLE `last_minute_slots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `type` enum('email','sms','push') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `sent_at` datetime DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `data` json DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_id` (`user_id`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,179,'push','New Booking','New booking from Waynee Waynee on 1/19/2026','2026-01-18 18:06:11',0,NULL,NULL),(2,179,'push','New Booking','New booking from Concurrency Tester on 1/26/2026','2026-01-19 12:39:50',0,NULL,NULL),(3,179,'push','New Booking','New booking from Concurrency Tester on 1/20/2026','2026-01-19 12:58:22',0,NULL,NULL),(4,179,'push','New Booking','New booking from Concurrency Tester on 1/22/2026','2026-01-19 12:59:35',0,NULL,NULL),(5,179,'push','New Booking','New booking from Concurrency Tester on 1/25/2026','2026-01-19 12:59:35',0,NULL,NULL),(6,179,'push','New Booking','New booking from Concurrency Tester on 1/21/2026','2026-01-19 12:59:37',0,NULL,NULL),(7,179,'push','New Booking','New booking from Payment Tester on 1/21/2026','2026-01-19 13:04:03',0,NULL,NULL),(8,179,'push','New Booking','New booking from Waynee Waynee on 1/19/2026','2026-01-19 15:17:37',0,NULL,NULL);
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `package_services`
--

DROP TABLE IF EXISTS `package_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `package_services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `package_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_package_service` (`package_id`,`service_id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `package_services_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `package_services_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_services`
--

LOCK TABLES `package_services` WRITE;
/*!40000 ALTER TABLE `package_services` DISABLE KEYS */;
/*!40000 ALTER TABLE `package_services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `packages`
--

DROP TABLE IF EXISTS `packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `packages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `original_price` decimal(10,2) NOT NULL,
  `discounted_price` decimal(10,2) NOT NULL,
  `validity_days` int DEFAULT NULL,
  `max_uses` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `image_url` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_packages_salon` (`salon_id`),
  CONSTRAINT `packages_ibfk_1` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `packages`
--

LOCK TABLES `packages` WRITE;
/*!40000 ALTER TABLE `packages` DISABLE KEYS */;
/*!40000 ALTER TABLE `packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint unsigned NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` enum('card','cash') NOT NULL,
  `status` enum('pending','paid','refunded') NOT NULL DEFAULT 'pending',
  `stripe_payment_id` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `refunded_amount` decimal(10,2) DEFAULT '0.00',
  `tip_amount` decimal(10,2) DEFAULT '0.00',
  `client_package_id` bigint unsigned DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_booking` (`booking_id`),
  KEY `idx_payments_stripe_payment_id` (`stripe_payment_id`),
  KEY `idx_payments_status_created` (`status`,`created_at`),
  CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payouts`
--

DROP TABLE IF EXISTS `payouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payouts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'EUR',
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `method` enum('bank_transfer','stripe','manual') DEFAULT 'bank_transfer',
  `reference` varchar(255) DEFAULT NULL,
  `bank_account_last4` varchar(4) DEFAULT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `bookings_count` int DEFAULT '0',
  `gross_amount` decimal(10,2) NOT NULL,
  `platform_fees` decimal(10,2) DEFAULT '0.00',
  `refunds_amount` decimal(10,2) DEFAULT '0.00',
  `net_amount` decimal(10,2) NOT NULL,
  `failure_reason` text,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payouts_salon` (`salon_id`),
  KEY `idx_payouts_status` (`status`),
  CONSTRAINT `payouts_ibfk_1` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payouts`
--

LOCK TABLES `payouts` WRITE;
/*!40000 ALTER TABLE `payouts` DISABLE KEYS */;
/*!40000 ALTER TABLE `payouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platform_fees`
--

DROP TABLE IF EXISTS `platform_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `platform_fees` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint unsigned NOT NULL,
  `salon_id` bigint unsigned NOT NULL,
  `type` enum('new_client','payment_processing') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `is_paid` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_platform_fees_booking_id` (`booking_id`),
  KEY `idx_platform_fees_salon_id` (`salon_id`),
  CONSTRAINT `fk_platform_fees_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_platform_fees_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platform_fees`
--

LOCK TABLES `platform_fees` WRITE;
/*!40000 ALTER TABLE `platform_fees` DISABLE KEYS */;
INSERT INTO `platform_fees` VALUES (1,1,163,'new_client',50.00,0),(2,2,163,'new_client',50.00,0),(3,3,163,'new_client',50.00,0),(4,4,163,'new_client',50.00,0),(5,5,163,'new_client',50.00,0),(6,6,163,'new_client',50.00,0),(7,7,163,'new_client',50.00,0);
/*!40000 ALTER TABLE `platform_fees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platform_settings`
--

DROP TABLE IF EXISTS `platform_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `platform_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `value_type` enum('string','number','boolean','json') DEFAULT 'string',
  `description` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platform_settings`
--

LOCK TABLES `platform_settings` WRITE;
/*!40000 ALTER TABLE `platform_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `platform_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_categories`
--

DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `display_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_categories_salon` (`salon_id`),
  CONSTRAINT `product_categories_ibfk_1` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_categories`
--

LOCK TABLES `product_categories` WRITE;
/*!40000 ALTER TABLE `product_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `price` decimal(10,2) NOT NULL,
  `cost_price` decimal(10,2) DEFAULT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `stock_quantity` int DEFAULT '0',
  `low_stock_threshold` int DEFAULT '5',
  `is_active` tinyint(1) DEFAULT '1',
  `image_url` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_products_salon` (`salon_id`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_sku` (`sku`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refunds`
--

DROP TABLE IF EXISTS `refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refunds` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` bigint unsigned NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reason` text,
  `stripe_refund_id` varchar(255) DEFAULT NULL,
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `processed_by` bigint unsigned DEFAULT NULL,
  `failure_reason` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `processed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_refunds_payment` (`payment_id`),
  KEY `processed_by` (`processed_by`),
  CONSTRAINT `refunds_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `refunds_ibfk_2` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refunds`
--

LOCK TABLES `refunds` WRITE;
/*!40000 ALTER TABLE `refunds` DISABLE KEYS */;
/*!40000 ALTER TABLE `refunds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resource_blocks`
--

DROP TABLE IF EXISTS `resource_blocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resource_blocks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `resource_id` bigint unsigned NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_resource_blocks_resource` (`resource_id`),
  KEY `idx_resource_blocks_time` (`start_time`,`end_time`),
  CONSTRAINT `resource_blocks_ibfk_1` FOREIGN KEY (`resource_id`) REFERENCES `resources` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resource_blocks`
--

LOCK TABLES `resource_blocks` WRITE;
/*!40000 ALTER TABLE `resource_blocks` DISABLE KEYS */;
/*!40000 ALTER TABLE `resource_blocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resources`
--

DROP TABLE IF EXISTS `resources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resources` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('room','chair','equipment','other') NOT NULL,
  `description` text,
  `capacity` int DEFAULT '1',
  `color` varchar(7) DEFAULT '#6B7280',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_resources_salon` (`salon_id`),
  CONSTRAINT `resources_ibfk_1` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resources`
--

LOCK TABLES `resources` WRITE;
/*!40000 ALTER TABLE `resources` DISABLE KEYS */;
/*!40000 ALTER TABLE `resources` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `rating` int NOT NULL,
  `comment` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','approved','flagged','removed') DEFAULT 'approved',
  `moderation_note` text,
  `moderated_by` bigint unsigned DEFAULT NULL,
  `moderated_at` datetime DEFAULT NULL,
  `booking_id` bigint unsigned DEFAULT NULL,
  `owner_reply` text,
  `owner_reply_at` datetime DEFAULT NULL,
  `staff_id` int DEFAULT NULL,
  `service_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reviews_salon_id` (`salon_id`),
  KEY `idx_reviews_client_id` (`client_id`),
  KEY `idx_reviews_salon_status` (`salon_id`,`status`,`created_at`),
  KEY `idx_reviews_staff` (`staff_id`),
  KEY `idx_reviews_salon_status_rating` (`salon_id`,`status`,`rating`),
  KEY `idx_reviews_staff_status` (`staff_id`,`status`),
  CONSTRAINT `fk_reviews_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (1,163,179,5,'Amazing experience! The stylist really listened to what I wanted and delivered perfectly.','2026-01-07 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(2,163,179,5,'Best haircut I\'ve had in Paris. The balayage looks incredible!','2025-12-31 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3,163,179,4,'Great service and beautiful salon. Slightly pricey but worth it.','2025-12-23 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(4,163,179,5,'I\'ve been coming here for years. Consistently excellent!','2025-12-13 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(5,164,179,5,'The spa pedicure was heavenly! So relaxing and my feet look amazing.','2026-01-09 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(6,164,179,5,'Best nail salon in the area. Clean, professional, and beautiful results.','2026-01-04 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(7,164,179,4,'Love my gel manicure! Lasted over 3 weeks without chipping.','2025-12-28 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(8,165,179,5,'Perfect fade every time. These guys know what they\'re doing!','2026-01-10 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(9,165,179,5,'The hot towel shave is a must-try. Old school barbering at its finest.','2026-01-02 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(10,165,179,5,'Great atmosphere and even better cuts. My go-to barber shop.','2025-12-25 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(11,166,179,5,'The facial was incredible! My skin has never looked better.','2026-01-08 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(12,166,179,4,'Professional service and great results. Will definitely return.','2025-12-29 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(13,167,179,5,'The massage was exactly what I needed. So relaxing!','2026-01-06 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(14,167,179,5,'Beautiful spa with amazing therapists. A true escape from the city.','2025-12-27 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(15,168,179,5,'Trendy salon with talented stylists. Love my new look!','2026-01-05 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(16,168,179,4,'Great cut and color. The atmosphere is very cool and modern.','2025-12-21 17:25:54','approved',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salon_amenities`
--

DROP TABLE IF EXISTS `salon_amenities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salon_amenities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_amenities_salon` (`salon_id`),
  CONSTRAINT `fk_amenities_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salon_amenities`
--

LOCK TABLES `salon_amenities` WRITE;
/*!40000 ALTER TABLE `salon_amenities` DISABLE KEYS */;
INSERT INTO `salon_amenities` VALUES (17,163,'WiFi'),(18,163,'Coffee & Tea'),(19,163,'Parking'),(20,164,'WiFi'),(21,164,'Refreshments'),(22,164,'Wheelchair Accessible'),(23,165,'WiFi'),(24,165,'Complimentary Drinks'),(25,165,'Street Parking'),(26,166,'WiFi'),(27,166,'Refreshments'),(28,166,'Air Conditioning'),(29,167,'WiFi'),(30,167,'Herbal Tea'),(31,167,'Relaxation Room'),(32,167,'Parking'),(33,168,'WiFi'),(34,168,'Coffee Bar'),(35,168,'Music');
/*!40000 ALTER TABLE `salon_amenities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salon_clients`
--

DROP TABLE IF EXISTS `salon_clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salon_clients` (
  `salon_id` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `first_visit_date` datetime DEFAULT NULL,
  `last_visit_date` datetime DEFAULT NULL,
  `total_visits` int NOT NULL DEFAULT '0',
  `notes` text,
  PRIMARY KEY (`salon_id`,`client_id`),
  KEY `idx_salon_clients_client_id` (`client_id`),
  KEY `idx_salon_clients_last_visit` (`salon_id`,`last_visit_date`),
  KEY `idx_salon_clients_first_visit` (`salon_id`,`first_visit_date`),
  KEY `idx_salon_clients_salon_visits` (`salon_id`,`total_visits`),
  CONSTRAINT `fk_salon_clients_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_salon_clients_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salon_clients`
--

LOCK TABLES `salon_clients` WRITE;
/*!40000 ALTER TABLE `salon_clients` DISABLE KEYS */;
INSERT INTO `salon_clients` VALUES (163,185,'2026-01-18 18:06:11','2026-01-19 15:17:37',2,NULL),(163,210,'2026-01-19 12:39:50','2026-01-19 12:39:50',1,NULL),(163,216,'2026-01-19 12:58:22','2026-01-19 12:58:22',1,NULL),(163,230,'2026-01-19 12:59:35','2026-01-19 12:59:35',1,NULL),(163,231,'2026-01-19 12:59:35','2026-01-19 12:59:35',1,NULL),(163,235,'2026-01-19 12:59:37','2026-01-19 12:59:37',1,NULL),(163,242,'2026-01-19 13:04:03','2026-01-19 13:04:03',1,NULL);
/*!40000 ALTER TABLE `salon_clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salon_gallery`
--

DROP TABLE IF EXISTS `salon_gallery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salon_gallery` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `display_order` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `salon_id` (`salon_id`),
  CONSTRAINT `salon_gallery_ibfk_1` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salon_gallery`
--

LOCK TABLES `salon_gallery` WRITE;
/*!40000 ALTER TABLE `salon_gallery` DISABLE KEYS */;
INSERT INTO `salon_gallery` VALUES (7,163,'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',1),(8,163,'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800',2),(9,163,'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800',3),(10,164,'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',1),(11,164,'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800',2),(12,165,'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',1),(13,165,'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',2),(14,166,'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800',1),(15,166,'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800',2),(16,167,'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800',1),(17,167,'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',2),(18,168,'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800',1),(19,168,'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800',2);
/*!40000 ALTER TABLE `salon_gallery` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salon_photos`
--

DROP TABLE IF EXISTS `salon_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salon_photos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `is_cover` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_salon_photos_salon_id` (`salon_id`),
  CONSTRAINT `fk_salon_photos_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salon_photos`
--

LOCK TABLES `salon_photos` WRITE;
/*!40000 ALTER TABLE `salon_photos` DISABLE KEYS */;
INSERT INTO `salon_photos` VALUES (1,163,'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200',1),(2,164,'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200',1),(3,165,'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200',1),(4,166,'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200',1),(5,167,'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200',1),(6,168,'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200',1);
/*!40000 ALTER TABLE `salon_photos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salon_settings`
--

DROP TABLE IF EXISTS `salon_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salon_settings` (
  `salon_id` bigint unsigned NOT NULL,
  `cancellation_policy_hours` int NOT NULL DEFAULT '0',
  `no_show_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `deposit_required` tinyint(1) NOT NULL DEFAULT '0',
  `deposit_percentage` int NOT NULL DEFAULT '0',
  `working_hours_start` time DEFAULT '09:00:00',
  `working_hours_end` time DEFAULT '19:00:00',
  `online_booking_enabled` tinyint(1) DEFAULT '1',
  `booking_advance_min_hours` int DEFAULT '1',
  `booking_advance_max_days` int DEFAULT '90',
  `auto_confirm_bookings` tinyint(1) DEFAULT '0',
  `send_reminders` tinyint(1) DEFAULT '1',
  `reminder_hours_before` int DEFAULT '24',
  PRIMARY KEY (`salon_id`),
  CONSTRAINT `fk_salon_settings_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salon_settings`
--

LOCK TABLES `salon_settings` WRITE;
/*!40000 ALTER TABLE `salon_settings` DISABLE KEYS */;
INSERT INTO `salon_settings` VALUES (163,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(164,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(165,48,25.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(166,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(167,48,0.00,1,20,'09:00:00','19:00:00',1,1,90,0,1,24),(168,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(169,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(170,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(171,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(172,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(173,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(174,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(175,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(176,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(177,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(178,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(179,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(180,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(181,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(188,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(189,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(190,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(191,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(192,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(193,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(194,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(195,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(196,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(197,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(198,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(199,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(200,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(201,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(202,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(203,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(204,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(205,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(206,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(207,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(208,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(209,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24);
/*!40000 ALTER TABLE `salon_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salons`
--

DROP TABLE IF EXISTS `salons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `is_marketplace_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `timezone` varchar(50) DEFAULT 'Europe/Paris',
  `currency` varchar(3) DEFAULT 'EUR',
  `logo_url` varchar(500) DEFAULT NULL,
  `cover_image_url` varchar(500) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `price_level` tinyint DEFAULT '2',
  `category` varchar(100) DEFAULT 'Hair Salon',
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `idx_salons_owner_id` (`owner_id`),
  KEY `idx_salons_marketplace_city` (`is_marketplace_enabled`,`city`),
  KEY `idx_salons_geo` (`latitude`,`longitude`),
  KEY `idx_salons_marketplace` (`status`,`is_marketplace_enabled`),
  KEY `idx_salons_category` (`category`),
  KEY `idx_salons_city` (`city`),
  CONSTRAINT `fk_salons_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=210 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salons`
--

LOCK TABLES `salons` WRITE;
/*!40000 ALTER TABLE `salons` DISABLE KEYS */;
INSERT INTO `salons` VALUES (163,179,'Luxe Hair Studio','Premium hair salon specializing in modern cuts, coloring, and styling. Our expert stylists stay current with the latest trends and techniques.','+33 1 42 86 82 00','contact@luxehairstudio.fr','15 Rue de Rivoli','Paris','France',48.8566000,2.3522000,1,'2026-01-12 17:25:53',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(164,180,'Bella Nails & Spa','Full-service nail salon and spa offering manicures, pedicures, and relaxing treatments in a luxurious environment.','+33 1 45 48 55 26','info@bellanails.fr','28 Avenue des Champs-Élysées','Paris','France',48.8698000,2.3078000,1,'2026-01-12 17:25:53',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(165,181,'The Barber Shop','Traditional barbershop with a modern twist. Expert cuts, hot towel shaves, and grooming services for the modern gentleman.','+33 1 42 77 76 17','hello@thebarbershop.fr','45 Rue du Faubourg Saint-Antoine','Paris','France',48.8534000,2.3735000,1,'2026-01-12 17:25:53',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(166,182,'Glow Beauty Bar','Your destination for facials, waxing, lash extensions, and makeup services. We help you look and feel your best.','+33 1 43 26 48 23','contact@glowbeauty.fr','12 Boulevard Saint-Germain','Paris','France',48.8529000,2.3499000,1,'2026-01-12 17:25:53',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(167,183,'Serenity Spa','Escape to tranquility with our massage therapy, body treatments, and wellness services. Your urban oasis awaits.','+33 1 42 60 34 86','info@serenityspa.fr','8 Rue de la Paix','Paris','France',48.8692000,2.3311000,1,'2026-01-12 17:25:53',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(168,184,'Studio 54 Salon','Trendy salon offering cutting-edge hair services, balayage, and hair treatments. Walk-ins welcome!','+33 1 48 87 63 42','booking@studio54salon.fr','54 Rue de Charonne','Paris','France',48.8533000,2.3816000,1,'2026-01-12 17:25:53',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(169,188,'E2E Staff Test 1768737301684',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-18 12:55:01',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(170,189,'E2E Staff Test 1768737342038',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-18 12:55:42',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(171,191,'E2E Staff Test 1768737370767',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-18 12:56:10',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(172,192,'E2E Staff Test 1768737440575',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-18 12:57:20',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(173,193,'E2E Staff Test 1768737800404',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-18 13:03:20',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(174,196,'Wizard Test 1768739244739',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-18 13:27:24',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(175,197,'Nav Test 1768739304283',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-18 13:28:24',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(176,198,'Wizard Test 1768739304278',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-18 13:28:24',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(177,199,'Wizard Test 1768739364083',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-18 13:29:24',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(178,201,'Nav Test 1768739373921',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-18 13:29:33',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(179,202,'Wizard Test 1768739373923',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-18 13:29:33',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(180,205,'Nav Test 1768739639971',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-18 13:34:00',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(181,204,'Wizard Test 1768739639971',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-18 13:34:00',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(182,248,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-19 13:34:14',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(183,250,'E2E Calendar Test 1768826067753',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 13:34:27',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(184,254,'E2E Staff Test 1768826070246',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 13:34:30',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(185,253,'E2E Services Test 1768826070245',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 13:34:30',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(186,256,'Wizard Test 1768826070263',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 13:34:30',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(187,257,'Nav Test 1768826070798',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 13:34:30',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(188,258,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-19 13:36:05',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(189,261,'E2E Calendar Test 1768826176531',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 13:36:16',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(190,266,'E2E Services Test 1768826179924',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 13:36:19',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(191,268,'Wizard Test 1768826180085',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 13:36:20',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(192,267,'E2E Staff Test 1768826180096',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 13:36:20',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(193,269,'Nav Test 1768826180153',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 13:36:20',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(194,273,'Wizard Test 1768830182166',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 14:43:02',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(195,272,'Nav Test 1768830182164',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 14:43:02',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(196,271,'E2E Staff Test 1768830182237',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 14:43:02',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(197,277,'Wizard Test 1768830241276',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 14:44:01',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(198,276,'Nav Test 1768830241277',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 14:44:01',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(199,279,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-19 14:44:56',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(200,282,'E2E Calendar Test 1768830310296',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 14:45:10',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(201,284,'E2E Services Test 1768830313078',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 14:45:13',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(202,287,'Nav Test 1768830313081',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 14:45:13',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(203,285,'E2E Staff Test 1768830313156',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 14:45:13',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(204,288,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-19 14:45:41',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(205,291,'E2E Calendar Test 1768830354801',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 14:45:54',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(206,293,'E2E Services Test 1768830356716',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 14:45:56',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(207,296,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-19 14:47:27',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(208,297,'E2E Calendar Test 1768830459989',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 14:47:40',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(209,299,'E2E Services Test 1768830461623',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-19 14:47:41',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active');
/*!40000 ALTER TABLE `salons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_categories`
--

DROP TABLE IF EXISTS `service_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `display_order` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_categories` (`salon_id`,`name`),
  KEY `idx_service_categories_salon_id` (`salon_id`),
  CONSTRAINT `fk_service_categories_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_categories`
--

LOCK TABLES `service_categories` WRITE;
/*!40000 ALTER TABLE `service_categories` DISABLE KEYS */;
INSERT INTO `service_categories` VALUES (21,163,'Hair Cuts',1),(22,163,'Hair Color',2),(23,163,'Hair Treatments',3),(24,164,'Manicures',1),(25,164,'Pedicures',2),(26,164,'Spa Services',3),(27,165,'Haircuts',1),(28,165,'Shaving',2),(29,165,'Grooming',3),(30,166,'Facials',1),(31,166,'Waxing',2),(32,166,'Lashes & Brows',3),(33,167,'Massage',1),(34,167,'Body Treatments',2),(35,167,'Wellness',3),(36,168,'Cuts & Styling',1),(37,168,'Color Services',2),(38,168,'Treatments',3),(39,190,'Haircuts',0),(40,201,'Haircuts',0),(41,206,'Haircuts',0),(42,209,'Haircuts',0);
/*!40000 ALTER TABLE `service_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_staff`
--

DROP TABLE IF EXISTS `service_staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_staff` (
  `service_id` bigint unsigned NOT NULL,
  `staff_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`service_id`,`staff_id`),
  KEY `idx_service_staff_staff_id` (`staff_id`),
  CONSTRAINT `fk_service_staff_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_service_staff_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_staff`
--

LOCK TABLES `service_staff` WRITE;
/*!40000 ALTER TABLE `service_staff` DISABLE KEYS */;
INSERT INTO `service_staff` VALUES (35,9),(36,9),(38,13),(39,13);
/*!40000 ALTER TABLE `service_staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `duration_minutes` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `description` text,
  `buffer_time_minutes` int DEFAULT '0',
  `display_order` int DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `is_popular` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_services_salon_id` (`salon_id`),
  KEY `idx_services_category_id` (`category_id`),
  KEY `idx_services_salon_active` (`salon_id`,`is_active`),
  KEY `idx_services_salon_active_name` (`salon_id`,`is_active`,`name`),
  CONSTRAINT `fk_services_category` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_services_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES (32,163,21,'Women\'s Haircut',60,75.00,1,NULL,0,0,NULL,1),(33,163,21,'Men\'s Haircut',45,55.00,1,NULL,0,0,NULL,1),(34,163,21,'Bang Trim',15,20.00,1,NULL,0,0,NULL,0),(35,163,22,'Full Color',120,150.00,1,NULL,0,0,NULL,1),(36,163,22,'Balayage',180,250.00,1,NULL,0,0,NULL,1),(37,163,22,'Root Touch-Up',90,95.00,1,NULL,0,0,NULL,0),(38,163,23,'Deep Conditioning',30,45.00,1,NULL,0,0,NULL,0),(39,163,23,'Keratin Treatment',150,300.00,1,NULL,0,0,NULL,1),(40,164,24,'Classic Manicure',45,35.00,1,NULL,0,0,NULL,1),(41,164,24,'Gel Manicure',60,55.00,1,NULL,0,0,NULL,1),(42,164,24,'Acrylic Full Set',90,75.00,1,NULL,0,0,NULL,1),(43,164,25,'Classic Pedicure',60,45.00,1,NULL,0,0,NULL,1),(44,164,25,'Spa Pedicure',75,65.00,1,NULL,0,0,NULL,1),(45,164,25,'Deluxe Pedicure',90,85.00,1,NULL,0,0,NULL,0),(46,164,26,'Paraffin Treatment',30,25.00,1,NULL,0,0,NULL,0),(47,164,26,'Hand & Foot Massage',30,40.00,1,NULL,0,0,NULL,0),(48,165,27,'Classic Cut',45,45.00,1,NULL,0,0,NULL,1),(49,165,27,'Fade Haircut',60,55.00,1,NULL,0,0,NULL,1),(50,165,27,'Buzz Cut',30,35.00,1,NULL,0,0,NULL,0),(51,165,28,'Hot Towel Shave',45,50.00,1,NULL,0,0,NULL,1),(52,165,28,'Beard Trim',30,30.00,1,NULL,0,0,NULL,1),(53,165,29,'Beard Shaping',45,40.00,1,NULL,0,0,NULL,0),(54,165,29,'Hair & Beard Combo',75,75.00,1,NULL,0,0,NULL,1),(55,190,39,'Basic Cut',30,25.00,1,NULL,0,0,NULL,0),(56,201,40,'Basic Cut',30,25.00,1,NULL,0,0,NULL,0),(57,206,41,'Basic Cut',30,25.00,1,NULL,0,0,NULL,0),(58,209,42,'Basic Cut',30,25.00,1,NULL,0,0,NULL,0);
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `role` enum('staff','manager','owner','receptionist') NOT NULL DEFAULT 'staff',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `bio` text,
  `avatar_url` varchar(500) DEFAULT NULL,
  `color` varchar(7) DEFAULT '#3B82F6',
  `display_order` int DEFAULT '0',
  `title` varchar(100) DEFAULT NULL,
  `phone_secondary` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `employment_type` enum('employee','self_employed') DEFAULT 'employee',
  `notes` text,
  `is_visible` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_salon_user` (`salon_id`,`user_id`),
  KEY `idx_staff_salon_id` (`salon_id`),
  KEY `idx_staff_user_id` (`user_id`),
  KEY `idx_staff_visible` (`salon_id`,`is_active`,`is_visible`),
  KEY `idx_staff_salon_role_active` (`salon_id`,`role`,`is_active`),
  KEY `idx_staff_user_active` (`user_id`,`is_active`),
  CONSTRAINT `fk_staff_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
INSERT INTO `staff` VALUES (5,170,190,NULL,NULL,'staff',1,'Experienced hair stylist',NULL,'#3B82F6',0,'Senior Stylist',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(6,171,190,NULL,NULL,'staff',1,'Experienced hair stylist',NULL,'#3B82F6',0,'Senior Stylist',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(7,172,190,NULL,NULL,'staff',1,'Experienced hair stylist',NULL,'#3B82F6',0,'Senior Stylist',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(8,173,190,NULL,NULL,'staff',1,'Experienced hair stylist',NULL,'#3B82F6',0,'Senior Stylist',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(9,163,194,NULL,NULL,'staff',1,NULL,NULL,'#3B82F6',0,'koulch',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(10,177,200,NULL,NULL,'staff',1,'Experienced stylist specializing in color',NULL,'#3B82F6',0,NULL,'+1 555 444 5555','United States',NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(11,179,203,NULL,NULL,'staff',1,'Experienced stylist specializing in color',NULL,'#3B82F6',0,NULL,'+1 555 444 5555','United States',NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(12,181,206,NULL,NULL,'staff',1,'Experienced stylist specializing in color',NULL,'#3B82F6',0,NULL,'+1 555 444 5555','United States',NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(13,163,207,NULL,NULL,'staff',1,NULL,NULL,'#14b8a6',0,'hafaf',NULL,NULL,'2024-06-07',NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(14,163,179,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(15,164,180,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(16,165,181,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(17,166,182,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(18,167,183,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(19,168,184,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(20,169,188,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(21,170,189,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(22,171,191,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(23,172,192,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(24,173,193,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(25,174,196,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(26,175,197,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(27,176,198,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(28,177,199,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(29,178,201,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(30,179,202,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(31,180,205,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(32,181,204,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:35:56','2026-01-19 13:35:56'),(33,188,258,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:36:05','2026-01-19 13:36:05'),(34,189,261,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:36:16','2026-01-19 13:36:16'),(35,190,266,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:36:19','2026-01-19 13:36:19'),(36,191,268,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:36:20','2026-01-19 13:36:20'),(37,192,267,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:36:20','2026-01-19 13:36:20'),(38,193,269,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:36:20','2026-01-19 13:36:20'),(39,192,190,NULL,NULL,'staff',1,'Experienced hair stylist',NULL,'#3B82F6',0,'Senior Stylist',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 13:36:20','2026-01-19 13:36:20'),(40,195,272,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:43:02','2026-01-19 14:43:02'),(41,194,273,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:43:02','2026-01-19 14:43:02'),(42,196,271,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:43:02','2026-01-19 14:43:02'),(43,196,190,NULL,NULL,'staff',1,'Experienced hair stylist',NULL,'#3B82F6',0,'Senior Stylist',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:43:02','2026-01-19 14:43:02'),(44,194,274,NULL,NULL,'staff',1,'Experienced stylist specializing in color',NULL,'#3B82F6',0,NULL,'+1 555 444 5555','United States',NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:43:03','2026-01-19 14:43:03'),(45,197,277,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:44:01','2026-01-19 14:44:01'),(46,198,276,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:44:01','2026-01-19 14:44:01'),(47,197,278,NULL,NULL,'staff',1,'Experienced stylist specializing in color',NULL,'#3B82F6',0,NULL,'+1 555 444 5555','United States',NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:44:02','2026-01-19 14:44:02'),(48,199,279,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:44:56','2026-01-19 14:44:56'),(49,200,282,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:45:10','2026-01-19 14:45:10'),(50,202,287,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:45:13','2026-01-19 14:45:13'),(51,201,284,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:45:13','2026-01-19 14:45:13'),(52,203,285,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:45:13','2026-01-19 14:45:13'),(53,203,190,NULL,NULL,'staff',1,'Experienced hair stylist',NULL,'#3B82F6',0,'Senior Stylist',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:45:13','2026-01-19 14:45:13'),(54,204,288,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:45:41','2026-01-19 14:45:41'),(55,205,291,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:45:54','2026-01-19 14:45:54'),(56,206,293,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:45:56','2026-01-19 14:45:56'),(57,207,296,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:47:27','2026-01-19 14:47:27'),(58,208,297,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:47:40','2026-01-19 14:47:40'),(59,209,299,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-19 14:47:41','2026-01-19 14:47:41'),(60,182,248,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-21 10:08:49','2026-01-21 10:08:49'),(61,183,250,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-21 10:08:49','2026-01-21 10:08:49'),(62,184,254,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-21 10:08:49','2026-01-21 10:08:49'),(63,185,253,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-21 10:08:49','2026-01-21 10:08:49'),(64,186,256,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-21 10:08:49','2026-01-21 10:08:49'),(65,187,257,NULL,NULL,'owner',1,NULL,NULL,'#3B82F6',0,'Owner',NULL,NULL,NULL,NULL,NULL,'employee',NULL,1,'2026-01-21 10:08:49','2026-01-21 10:08:49');
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_addresses`
--

DROP TABLE IF EXISTS `staff_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_addresses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint unsigned NOT NULL,
  `address_type` enum('home','work','other') NOT NULL DEFAULT 'home',
  `street_address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_staff_addresses_staff_id` (`staff_id`),
  CONSTRAINT `fk_staff_addresses_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_addresses`
--

LOCK TABLES `staff_addresses` WRITE;
/*!40000 ALTER TABLE `staff_addresses` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_commissions`
--

DROP TABLE IF EXISTS `staff_commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_commissions` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_commissions`
--

LOCK TABLES `staff_commissions` WRITE;
/*!40000 ALTER TABLE `staff_commissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_commissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_emergency_contacts`
--

DROP TABLE IF EXISTS `staff_emergency_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_emergency_contacts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint unsigned NOT NULL,
  `contact_name` varchar(150) NOT NULL,
  `relationship` varchar(100) DEFAULT NULL,
  `phone_primary` varchar(20) NOT NULL,
  `phone_secondary` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_staff_emergency_staff_id` (`staff_id`),
  CONSTRAINT `fk_staff_emergency_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_emergency_contacts`
--

LOCK TABLES `staff_emergency_contacts` WRITE;
/*!40000 ALTER TABLE `staff_emergency_contacts` DISABLE KEYS */;
INSERT INTO `staff_emergency_contacts` VALUES (1,10,'Michael Watson','Spouse','+1 555 777 8888',NULL,'michael@example.com',1,NULL,'2026-01-18 13:29:25','2026-01-18 13:29:25'),(2,11,'Michael Watson','Spouse','+1 555 777 8888',NULL,'michael@example.com',1,NULL,'2026-01-18 13:29:35','2026-01-18 13:29:35'),(3,12,'Michael Watson','Spouse','+1 555 777 8888',NULL,'michael@example.com',1,NULL,'2026-01-18 13:34:01','2026-01-18 13:34:01'),(4,44,'Michael Watson','Spouse','+1 555 777 8888',NULL,'michael@example.com',1,NULL,'2026-01-19 14:43:03','2026-01-19 14:43:03'),(5,47,'Michael Watson','Spouse','+1 555 777 8888',NULL,'michael@example.com',1,NULL,'2026-01-19 14:44:02','2026-01-19 14:44:02');
/*!40000 ALTER TABLE `staff_emergency_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_locations`
--

DROP TABLE IF EXISTS `staff_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_locations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint unsigned NOT NULL,
  `salon_id` bigint unsigned NOT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_locations` (`staff_id`,`salon_id`),
  KEY `idx_staff_locations_staff` (`staff_id`),
  KEY `idx_staff_locations_salon` (`salon_id`),
  CONSTRAINT `fk_staff_locations_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_locations_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_locations`
--

LOCK TABLES `staff_locations` WRITE;
/*!40000 ALTER TABLE `staff_locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_pay_run_items`
--

DROP TABLE IF EXISTS `staff_pay_run_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_pay_run_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pay_run_id` bigint unsigned NOT NULL,
  `staff_id` bigint unsigned NOT NULL,
  `base_pay` decimal(10,2) DEFAULT '0.00',
  `commission_amount` decimal(10,2) DEFAULT '0.00',
  `bonus_amount` decimal(10,2) DEFAULT '0.00',
  `tips_amount` decimal(10,2) DEFAULT '0.00',
  `deductions_amount` decimal(10,2) DEFAULT '0.00',
  `total_pay` decimal(10,2) DEFAULT '0.00',
  `hours_worked` decimal(6,2) DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_staff_pay_run_items_pay_run` (`pay_run_id`),
  KEY `idx_staff_pay_run_items_staff` (`staff_id`),
  CONSTRAINT `fk_staff_pay_run_items_pay_run` FOREIGN KEY (`pay_run_id`) REFERENCES `staff_pay_runs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_pay_run_items_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_pay_run_items`
--

LOCK TABLES `staff_pay_run_items` WRITE;
/*!40000 ALTER TABLE `staff_pay_run_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_pay_run_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_pay_runs`
--

DROP TABLE IF EXISTS `staff_pay_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_pay_runs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `pay_period_start` date NOT NULL,
  `pay_period_end` date NOT NULL,
  `pay_date` date NOT NULL,
  `status` enum('draft','processing','completed','cancelled') DEFAULT 'draft',
  `total_amount` decimal(12,2) DEFAULT '0.00',
  `currency` varchar(3) DEFAULT 'USD',
  `notes` text,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_staff_pay_runs_salon_id` (`salon_id`),
  KEY `idx_staff_pay_runs_period` (`pay_period_start`,`pay_period_end`),
  CONSTRAINT `fk_staff_pay_runs_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_pay_runs`
--

LOCK TABLES `staff_pay_runs` WRITE;
/*!40000 ALTER TABLE `staff_pay_runs` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_pay_runs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_services`
--

DROP TABLE IF EXISTS `staff_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_service` (`staff_id`,`service_id`),
  KEY `idx_staff_services_staff` (`staff_id`),
  KEY `idx_staff_services_service` (`service_id`),
  CONSTRAINT `fk_staff_services_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_services_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_services`
--

LOCK TABLES `staff_services` WRITE;
/*!40000 ALTER TABLE `staff_services` DISABLE KEYS */;
INSERT INTO `staff_services` VALUES (2,9,36,'2026-01-18 15:16:48');
/*!40000 ALTER TABLE `staff_services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_time_off`
--

DROP TABLE IF EXISTS `staff_time_off`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_time_off` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint unsigned NOT NULL,
  `start_datetime` datetime NOT NULL,
  `end_datetime` datetime NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_staff_time_off_staff_id` (`staff_id`),
  KEY `idx_staff_timeoff_range` (`staff_id`,`start_datetime`,`end_datetime`),
  CONSTRAINT `fk_staff_time_off_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_time_off`
--

LOCK TABLES `staff_time_off` WRITE;
/*!40000 ALTER TABLE `staff_time_off` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_time_off` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_timesheets`
--

DROP TABLE IF EXISTS `staff_timesheets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_timesheets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint unsigned NOT NULL,
  `salon_id` bigint unsigned NOT NULL,
  `clock_in` datetime NOT NULL,
  `clock_out` datetime DEFAULT NULL,
  `break_duration` int DEFAULT '0' COMMENT 'Break duration in minutes',
  `total_hours` decimal(5,2) DEFAULT NULL COMMENT 'Total hours worked',
  `notes` text,
  `status` enum('clocked_in','clocked_out','approved','disputed') DEFAULT 'clocked_in',
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_staff_timesheets_staff_id` (`staff_id`),
  KEY `idx_staff_timesheets_salon_id` (`salon_id`),
  KEY `idx_staff_timesheets_date` (`clock_in`),
  CONSTRAINT `fk_staff_timesheets_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_timesheets_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_timesheets`
--

LOCK TABLES `staff_timesheets` WRITE;
/*!40000 ALTER TABLE `staff_timesheets` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_timesheets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_wages`
--

DROP TABLE IF EXISTS `staff_wages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_wages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint unsigned NOT NULL,
  `wage_type` enum('hourly','salary','commission_only') NOT NULL DEFAULT 'hourly',
  `hourly_rate` decimal(10,2) DEFAULT NULL,
  `salary_amount` decimal(10,2) DEFAULT NULL,
  `salary_period` enum('weekly','biweekly','monthly','annual') DEFAULT 'monthly',
  `currency` varchar(3) DEFAULT 'USD',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_staff_wages_staff_id` (`staff_id`),
  KEY `idx_staff_wages_effective` (`staff_id`,`effective_from`,`effective_to`),
  CONSTRAINT `fk_staff_wages_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_wages`
--

LOCK TABLES `staff_wages` WRITE;
/*!40000 ALTER TABLE `staff_wages` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_wages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_working_hours`
--

DROP TABLE IF EXISTS `staff_working_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_working_hours` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint unsigned NOT NULL,
  `day_of_week` tinyint NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_hours` (`staff_id`,`day_of_week`,`start_time`,`end_time`),
  KEY `idx_staff_working_hours_staff_id` (`staff_id`),
  KEY `idx_staff_hours_lookup` (`staff_id`,`day_of_week`,`start_time`,`end_time`),
  CONSTRAINT `fk_staff_working_hours_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_working_hours`
--

LOCK TABLES `staff_working_hours` WRITE;
/*!40000 ALTER TABLE `staff_working_hours` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_working_hours` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `notes` text,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `role` enum('client','owner','staff','admin') NOT NULL DEFAULT 'client',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_country` (`country`),
  KEY `idx_users_last_login_role` (`last_login_at`,`role`)
) ENGINE=InnoDB AUTO_INCREMENT=300 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (179,'owner@fresh.com','+1234567890',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','John','Smith',NULL,'owner','2026-01-12 17:25:53','2026-01-12 17:25:53',0,NULL,NULL,NULL,NULL),(180,'owner2@fresh.com','+1234567891',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','Sarah','Connor',NULL,'owner','2026-01-12 17:25:53','2026-01-12 17:25:53',0,NULL,NULL,NULL,NULL),(181,'owner3@fresh.com','+1234567892',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','James','Bond',NULL,'owner','2026-01-12 17:25:53','2026-01-12 17:25:53',0,NULL,NULL,NULL,NULL),(182,'owner4@fresh.com','+1234567893',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','Ellen','Ripley',NULL,'owner','2026-01-12 17:25:53','2026-01-12 17:25:53',0,NULL,NULL,NULL,NULL),(183,'owner5@fresh.com','+1234567894',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','Tony','Stark',NULL,'owner','2026-01-12 17:25:53','2026-01-12 17:25:53',0,NULL,NULL,NULL,NULL),(184,'owner6@fresh.com','+1234567895',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','Bruce','Wayne',NULL,'owner','2026-01-12 17:25:53','2026-01-12 17:25:53',0,NULL,NULL,NULL,NULL),(185,'client@fresh.com','+1234567896',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','Waynee','Waynee',NULL,'client','2026-01-12 17:25:53','2026-01-12 23:35:52',0,NULL,NULL,NULL,NULL),(186,'testpro_country@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$KPN1h3cBzDAXG2OoHC.0/.8rtTpTVFGWCqlXV5LBmaxz69JwRwBra','Test','Pro','DZ','owner','2026-01-13 00:07:24','2026-01-13 00:07:24',0,NULL,NULL,NULL,NULL),(187,'testclient_no_country@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$ARXrdSCbqoGNipokHOPaJ.ujBkwMkF1Sjz4VWIeNabnljFnsQM7mO','Test','Client','','client','2026-01-13 00:09:11','2026-01-13 00:09:11',0,NULL,NULL,NULL,NULL),(188,'owner_1768737301173@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$ww8U.RD7KrkB3yjc3mbhQ.ptRTsgg.2ZFGloQs4KkfavvKlSohk8q','Test','Owner',NULL,'owner','2026-01-18 12:55:01','2026-01-18 12:55:01',0,NULL,NULL,NULL,NULL),(189,'owner_1768737341665@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$eHafAK03Ts89dA/l7MHz2.DskLlFYdXMSOxIENX7.dohH5ge6h982','Test','Owner',NULL,'owner','2026-01-18 12:55:41','2026-01-18 12:55:41',0,NULL,NULL,NULL,NULL),(190,'jane.smith@test.com','+1 555 987 6543',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$hIKBmTOOBRa7oLyhJ5Q/Wu2mOd6AeDpukeBctfBDx1pHKZj.EdYM.','Jane','Smith',NULL,'staff','2026-01-18 12:55:42','2026-01-18 12:55:42',0,NULL,NULL,NULL,NULL),(191,'owner_1768737370346@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$p5Gm4ZWqdEWOo4wRiRohBuh.sY4jinAawANpuYXaoaR7Y02o5lcce','Test','Owner',NULL,'owner','2026-01-18 12:56:10','2026-01-18 12:56:10',0,NULL,NULL,NULL,NULL),(192,'owner_1768737440160@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$GDihTcjkUI8ErWLSK60RluEr6WoqRk/1ZwsSHK.OY5h5oXbCHOIG2','Test','Owner',NULL,'owner','2026-01-18 12:57:20','2026-01-18 12:57:20',0,NULL,NULL,NULL,NULL),(193,'owner_1768737799969@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$eBYE6iiisftL81Zw.OL66.2oj88uznIhjgo4XskXdeefvgoPuuNsG','Test','Owner',NULL,'owner','2026-01-18 13:03:20','2026-01-18 13:03:20',0,NULL,NULL,NULL,NULL),(194,'dofus-bhmxx@live.fr','+213562105689',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$SDiXdUOyNVKqxsRB3THa6e83o0D5hGALB4jZFAaqxMn4NUNDhEh52','brahimz','moulahoumz',NULL,'staff','2026-01-18 13:12:10','2026-01-18 13:12:10',0,NULL,NULL,NULL,NULL),(196,'owner_1768739243991@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$MyeF0U3seTxyZCcdZ.nk7.mCI8JRSOeej1eIGw78KCH1BTL2wEFxm','Test','Owner',NULL,'owner','2026-01-18 13:27:24','2026-01-18 13:27:24',0,NULL,NULL,NULL,NULL),(197,'owner_1768739303582_xs3im@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$pqzEkk0CsjNkcOWBkAoq3O2J1jSPMdM/ewkA.RwGg7RE9ZBq9NmJ2','Test','Owner',NULL,'owner','2026-01-18 13:28:23','2026-01-18 13:28:23',0,NULL,NULL,NULL,NULL),(198,'owner_1768739303593_eb25o@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$O1Mrc2kd3RbpDBrOvKf4KOmdHFZQz9V7Ycz3suxE6ei3meMgOeonu','Test','Owner',NULL,'owner','2026-01-18 13:28:24','2026-01-18 13:28:24',0,NULL,NULL,NULL,NULL),(199,'owner_1768739363639_lmdtr@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$T2yTYS0zH46GpBFclez.1.gkk7bP/7OKE4Nhdu1r5oVVP9IC1Lefi','Test','Owner',NULL,'owner','2026-01-18 13:29:23','2026-01-18 13:29:23',0,NULL,NULL,NULL,NULL),(200,'emily.wizard.1768739364543@test.com','+1 555 222 3333',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$fdfg6piHNfpnDq.ZypYPreLZpKIbdafhjaH5lk.aKXntN3PGownAa','Emily','Watson',NULL,'staff','2026-01-18 13:29:25','2026-01-18 13:29:25',0,NULL,NULL,NULL,NULL),(201,'owner_1768739373219_5qjyf@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$1PHjtzLgwXeBmsCIYNlTuujzVim0A1LKiR6mLZZwyhAsPYOTvRj6S','Test','Owner',NULL,'owner','2026-01-18 13:29:33','2026-01-18 13:29:33',0,NULL,NULL,NULL,NULL),(202,'owner_1768739373230_opugh@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$Ala13IVqKybt/kkVzGqjdu..haLOFcwNXypGIPF6VJXVH5NsOkgo2','Test','Owner',NULL,'owner','2026-01-18 13:29:33','2026-01-18 13:29:33',0,NULL,NULL,NULL,NULL),(203,'emily.wizard.1768739374541@test.com','+1 555 222 3333',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$vDppKgclkmPW1wSRhFErk.mkRNs8dJnrHbVHpcyG0POnc0igIQ5aS','Emily','Watson',NULL,'staff','2026-01-18 13:29:35','2026-01-18 13:29:35',0,NULL,NULL,NULL,NULL),(204,'owner_1768739639231_1z9ge@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$GGHzRKKq2iJoDYJLh4Qeq.tUC0IOztmrEkmsZS6kSMnnEVFj.Vm4O','Test','Owner',NULL,'owner','2026-01-18 13:33:59','2026-01-18 13:33:59',0,NULL,NULL,NULL,NULL),(205,'owner_1768739639231_t3gj7@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$.WwB4RoB8vdgDWqL/2FVIeIKSEs7Uum14biHosot9cBRxcmeD54L.','Test','Owner',NULL,'owner','2026-01-18 13:33:59','2026-01-18 13:33:59',0,NULL,NULL,NULL,NULL),(206,'emily.wizard.1768739640584@test.com','+1 555 222 3333',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$sJwl2XSXZC8MynECR/VPIuAW/P5BGCKmW5yhEqqiXL1ilHYFoQSvO','Emily','Watson',NULL,'staff','2026-01-18 13:34:01','2026-01-18 13:34:01',0,NULL,NULL,NULL,NULL),(207,'staff_1768745297707_m5xh@placeholder.local','+213562105687',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$OHxmJwmkAhTvBpefY4/6lOvshtrPbk129ImzUrqGiXtgn1HxyBkI.','moukdad','zandav',NULL,'staff','2026-01-18 15:08:17','2026-01-18 15:08:17',0,NULL,NULL,NULL,NULL),(208,'concurrent_tester_637175@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$oqiTTfNQd56ifp4zr6Rg8Oyav7t1LmSMh5x4kELt3tvH.lZH.iQn6','Concurrency','Tester',NULL,'client','2026-01-19 12:31:24','2026-01-19 12:31:24',0,NULL,NULL,NULL,NULL),(209,'concurrent_tester_328756@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$psn2g9h0fou1RwKLWqoIaO.VZ6Z6UhCdfZuGZy7M16mPM4fFbMQqW','Concurrency','Tester',NULL,'client','2026-01-19 12:34:54','2026-01-19 12:34:54',0,NULL,NULL,NULL,NULL),(210,'concurrent_tester_501449@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$vyM7rIcq5K5vwh3rCosY2.e3I9lqixBNbOd222FUXHOY0C1WkRmHe','Concurrency','Tester',NULL,'client','2026-01-19 12:39:49','2026-01-19 12:39:49',0,NULL,NULL,NULL,NULL),(211,'concurrent_tester_412317@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$GHcA75nBy1n9dcvfBha6uesxGpZ0eZc9azLPJ/.uV/Hqmm3hUPCE6','Concurrency','Tester',NULL,'client','2026-01-19 12:55:15','2026-01-19 12:55:15',0,NULL,NULL,NULL,NULL),(212,'concurrent_tester_877657@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$4hKkQxLyhpmQHfl9X01kced4UBp/o6mtHdbkEcl4jN1x6QGAnZUhq','Concurrency','Tester',NULL,'client','2026-01-19 12:55:15','2026-01-19 12:55:15',0,NULL,NULL,NULL,NULL),(213,'concurrent_tester_131093@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$xIGkNzJ9Zgf3PQW9C3X8Hu0rkSswdUfJCcFy4z/9cH5YSozlm37sa','Concurrency','Tester',NULL,'client','2026-01-19 12:56:44','2026-01-19 12:56:44',0,NULL,NULL,NULL,NULL),(214,'concurrent_tester_885105@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$axZlDJnPxYzCpz5rH5Z2CONpu3k7bMAy.aqADNboiIz2JqSnzR/zC','Concurrency','Tester',NULL,'client','2026-01-19 12:56:44','2026-01-19 12:56:44',0,NULL,NULL,NULL,NULL),(215,'concurrent_tester_590166@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$gM43CB1sFXx113fN9jKd1ue8stdxUh.RWLHpaUHK5UEl/ieWktH2a','Concurrency','Tester',NULL,'client','2026-01-19 12:58:21','2026-01-19 12:58:21',0,NULL,NULL,NULL,NULL),(216,'concurrent_tester_587373@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$TObzt2Jmos4P07sz0mQM7.5x7NUuVdN6/DEV2Wf0aHXErbtCQe612','Concurrency','Tester',NULL,'client','2026-01-19 12:58:21','2026-01-19 12:58:21',0,NULL,NULL,NULL,NULL),(217,'concurrent_tester_704255@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$lLqgOMX8b0mmrHdksg2SrOqSN/FbyUgSSrVZazlRb8OQSCj7qh5PC','Concurrency','Tester',NULL,'client','2026-01-19 12:58:52','2026-01-19 12:58:52',0,NULL,NULL,NULL,NULL),(218,'concurrent_tester_486015@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$CJH6c4mcW0i8HNPpEghzgOgz86Uyqf.UJEx2kSXGNEPlNNYjcKzi.','Concurrency','Tester',NULL,'client','2026-01-19 12:58:52','2026-01-19 12:58:52',0,NULL,NULL,NULL,NULL),(219,'concurrent_tester_672693@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$YLaS71z2OCwCfMQBDB3NVOaH3RYrlmMoSZDFwHO0YoCHyiDEKAeRu','Concurrency','Tester',NULL,'client','2026-01-19 12:58:52','2026-01-19 12:58:52',0,NULL,NULL,NULL,NULL),(220,'concurrent_tester_545076@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$DflS8OA2r1IG7C5pchNK9e.Hw/FZ3MKVgehh9WF1yXFdd8701Xdoq','Concurrency','Tester',NULL,'client','2026-01-19 12:58:52','2026-01-19 12:58:52',0,NULL,NULL,NULL,NULL),(221,'concurrent_tester_819461@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$qLbvP0rKgN/G1oK59VpmbewoWfj1YpK5nnC3G//xQKFWQkNbAX8u2','Concurrency','Tester',NULL,'client','2026-01-19 12:58:52','2026-01-19 12:58:52',0,NULL,NULL,NULL,NULL),(222,'concurrent_tester_406313@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$S4m9d2gAPzpfhN5qFTK2ZeP//MuxxLd.DwTBK/pIwnzfJTzx9R0u6','Concurrency','Tester',NULL,'client','2026-01-19 12:58:54','2026-01-19 12:58:54',0,NULL,NULL,NULL,NULL),(223,'concurrent_tester_814212@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$lfaZfx3q33RRgmO0fTvsYOxCO2BNd2qXFz10UYXbLVFLfSLrhUlc6','Concurrency','Tester',NULL,'client','2026-01-19 12:58:55','2026-01-19 12:58:55',0,NULL,NULL,NULL,NULL),(224,'concurrent_tester_316600@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$cFvsj2GRUJurP/yMayJ9ruyxAb5FcXRtvRGQ6pkOsD69u6tRt01vS','Concurrency','Tester',NULL,'client','2026-01-19 12:58:55','2026-01-19 12:58:55',0,NULL,NULL,NULL,NULL),(225,'concurrent_tester_420000@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$dH4vZeoATERcK1/FBPyqK.atumKsa1nNHc24uPh9vXNrSn3HdJQk6','Concurrency','Tester',NULL,'client','2026-01-19 12:58:55','2026-01-19 12:58:55',0,NULL,NULL,NULL,NULL),(226,'concurrent_tester_210969@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$XYNMRc14f41V/At3YS2fpOCKuZneegxep0WU6XCYKah8stXcUnZfy','Concurrency','Tester',NULL,'client','2026-01-19 12:58:55','2026-01-19 12:58:55',0,NULL,NULL,NULL,NULL),(227,'concurrent_tester_25033@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$UzZuZ1aXg1wDElVIKBr80ONes3DTpRcUlXcm12KogSwN1PE5e3o0i','Concurrency','Tester',NULL,'client','2026-01-19 12:58:55','2026-01-19 12:58:55',0,NULL,NULL,NULL,NULL),(228,'concurrent_tester_134331@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$Gt36/Yes6odNHK3zCD2FJej.tjwHE3EIecBpWrwHyu8ZpjKsmqVnS','Concurrency','Tester',NULL,'client','2026-01-19 12:58:56','2026-01-19 12:58:56',0,NULL,NULL,NULL,NULL),(229,'concurrent_tester_478229@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$.aOEh9TPAsdGdu9t2Hq/eetzyUf5SSonnpVqNJH1u/Mzmjqo4K/W6','Concurrency','Tester',NULL,'client','2026-01-19 12:59:34','2026-01-19 12:59:34',0,NULL,NULL,NULL,NULL),(230,'concurrent_tester_968884@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$TLwkaq0TUR.5hR3EDoCRnuuQpeIgqDkxo8hGv2pQw42OSvUIThF6u','Concurrency','Tester',NULL,'client','2026-01-19 12:59:34','2026-01-19 12:59:34',0,NULL,NULL,NULL,NULL),(231,'concurrent_tester_222@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$31bcl8/.7eWsWolAMiIgG.dKISQkBICncbiZBgPhjszepIWnLuvfm','Concurrency','Tester',NULL,'client','2026-01-19 12:59:34','2026-01-19 12:59:34',0,NULL,NULL,NULL,NULL),(232,'concurrent_tester_598320@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$hfvuZS2G8IYEWapP2o3AZOvCSvkEnE.fjot/opGZ.U8YN.IORjRse','Concurrency','Tester',NULL,'client','2026-01-19 12:59:34','2026-01-19 12:59:34',0,NULL,NULL,NULL,NULL),(233,'concurrent_tester_512258@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$EKjhynefCEbMh/2xdUKSGukiWmZTsWxg66mlIAVfs0GaVmlDIweZ2','Concurrency','Tester',NULL,'client','2026-01-19 12:59:34','2026-01-19 12:59:34',0,NULL,NULL,NULL,NULL),(234,'concurrent_tester_223593@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$aSYxtfqVFZm/5RYqF/Sd0.4Iiz71LhZjrz9Hy/eSTzxruZFycBsqy','Concurrency','Tester',NULL,'client','2026-01-19 12:59:36','2026-01-19 12:59:36',0,NULL,NULL,NULL,NULL),(235,'concurrent_tester_672142@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$Ja8onxE9YkWTw0lD8KJtQetdyRivxOSTlbxeIwaSKXsVpPHwi41ce','Concurrency','Tester',NULL,'client','2026-01-19 12:59:37','2026-01-19 12:59:37',0,NULL,NULL,NULL,NULL),(236,'concurrent_tester_294520@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$bvmOK8VCPgx31iEzDur8f./Kr8fIGNpgqICKCwbVINL0K4UXA6fcC','Concurrency','Tester',NULL,'client','2026-01-19 12:59:37','2026-01-19 12:59:37',0,NULL,NULL,NULL,NULL),(237,'concurrent_tester_442167@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$nqZ1AAfEhmPV0EON0Dun3ukNk1Nvm7ijUmj5A1Ptsy/z83wAmqKmq','Concurrency','Tester',NULL,'client','2026-01-19 12:59:37','2026-01-19 12:59:37',0,NULL,NULL,NULL,NULL),(238,'concurrent_tester_788963@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$hIXLb3LfR2CaiSr7gczCjeAkzqveNFoAnB2INfxZ9POfRUAR3lyHG','Concurrency','Tester',NULL,'client','2026-01-19 12:59:37','2026-01-19 12:59:37',0,NULL,NULL,NULL,NULL),(239,'concurrent_tester_254740@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$lkKZEsqhNV8zPfzWVdRpIeiESCP8XMFtBoDnE3AFFoErFGVQskrD6','Concurrency','Tester',NULL,'client','2026-01-19 12:59:37','2026-01-19 12:59:37',0,NULL,NULL,NULL,NULL),(240,'concurrent_tester_558707@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$mFoQgROSxwJGfAH53Z6IZ.sX0cTf886h9nTlJLqP7wI2tPx3BeRLe','Concurrency','Tester',NULL,'client','2026-01-19 12:59:37','2026-01-19 12:59:37',0,NULL,NULL,NULL,NULL),(241,'payment_test_829980@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$pcKSrrCg8flmvtH2vybPVeUt02aBjs/ZaRnDFPx2VTCEMnYa7IBh2','Payment','Tester',NULL,'client','2026-01-19 13:04:01','2026-01-19 13:04:01',0,NULL,NULL,NULL,NULL),(242,'payment_test_707655@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$nujrdUoeSFgYsh.2mPrB..lD00WDY9hf82GoRrqjecZds9GdIXMYy','Payment','Tester',NULL,'client','2026-01-19 13:04:01','2026-01-19 13:04:01',0,NULL,NULL,NULL,NULL),(243,'payment_test_551062@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$tovMHOC9aCNc/ezEkjg1huKK4BvsBhzNfWI0wtwfW721fXA7BZV1.','Payment','Tester',NULL,'client','2026-01-19 13:04:02','2026-01-19 13:04:02',0,NULL,NULL,NULL,NULL),(244,'payment_test_50844@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$nm8VWS/x8jwAo6lB3kCozePJHtfx3Qte.wMZJWZv3xRAIV5f5PouW','Payment','Tester',NULL,'client','2026-01-19 13:08:39','2026-01-19 13:08:39',0,NULL,NULL,NULL,NULL),(245,'payment_test_619404@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$737g6BmMxo11PMlTs5fGLeX98FdqM2cb3zZ2xsz4l9js6Tfyc96W6','Payment','Tester',NULL,'client','2026-01-19 13:08:39','2026-01-19 13:08:39',0,NULL,NULL,NULL,NULL),(246,'payment_test_779317@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$Y05PwO0YHF5XuYyjTByMpuAeDkpXg6LnSTSdwbcdOtAlYv.pgkDI2','Payment','Tester',NULL,'client','2026-01-19 13:08:39','2026-01-19 13:08:39',0,NULL,NULL,NULL,NULL),(247,'concurrent_tester_270453@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$wbmW8/RKhPuf3Ko4KijTd.tgKnXNdBugPhDOhjxRc9hpredqujEXO','Concurrency','Tester',NULL,'client','2026-01-19 13:34:14','2026-01-19 13:34:14',0,NULL,NULL,NULL,NULL),(248,'api.tester+n3ciaf7y@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$aeCmaua57hWnhnOr3GNW0.rN5rxcobjLfeayv54hgRtwfqBKM4Sk2','API','Tester',NULL,'owner','2026-01-19 13:34:14','2026-01-19 13:34:14',0,NULL,NULL,NULL,NULL),(249,'concurrent_tester_865953@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$/RiNPLTKyhd6elZK/7OKkuYbVO7Vn7QGTYOn8EcQ55LNcQfGp1tJO','Concurrency','Tester',NULL,'client','2026-01-19 13:34:14','2026-01-19 13:34:14',0,NULL,NULL,NULL,NULL),(250,'owner_1768826066705@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$gLIC15XYTskcp.dASRpE9uWVunpV/2om.9rvhn7qlJwqMwWqztHki','Test','Owner',NULL,'owner','2026-01-19 13:34:27','2026-01-19 13:34:27',0,NULL,NULL,NULL,NULL),(251,'owner_1768826068210@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$vj2mmqz0qdlT5O1lGnw4XuZsXc2TFuZq3jHKDZgkRj0MpjMsOtZQS','Test','Owner',NULL,'owner','2026-01-19 13:34:28','2026-01-19 13:34:28',0,NULL,NULL,NULL,NULL),(252,'payment_test_246425@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$j4DOoV0e6jP/SSj.v150F.zI9FrunVzCnsstKCvCt7C.Zl4ZK1Rja','Payment','Tester',NULL,'client','2026-01-19 13:34:28','2026-01-19 13:34:28',0,NULL,NULL,NULL,NULL),(253,'owner_1768826068971@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$rgedqWAGUunBub6BZqmliufvEiUZjQbOUtC8exnOJNqTDsW5pzBQ.','Test','Owner',NULL,'owner','2026-01-19 13:34:29','2026-01-19 13:34:29',0,NULL,NULL,NULL,NULL),(254,'owner_1768826069067@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$tWe9s5Zgg8zaxjlKyEJT.uTpcLe.taw0Wk.bjUfMGsA7yD3H1JZxG','Test','Owner',NULL,'owner','2026-01-19 13:34:29','2026-01-19 13:34:29',0,NULL,NULL,NULL,NULL),(255,'payment_test_455121@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$bQok7vFkHf/A4V5hGrGw7O4K6IaAxALVUDuu.saTTdV.MuDZ2X2vK','Payment','Tester',NULL,'client','2026-01-19 13:34:29','2026-01-19 13:34:29',0,NULL,NULL,NULL,NULL),(256,'owner_1768826069340_kfb4p@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$RdqzSxE3kB2eWVirf9P7P.jCdnQqWYMZ6uaDagFchjX5gabexAMQG','Test','Owner',NULL,'owner','2026-01-19 13:34:29','2026-01-19 13:34:29',0,NULL,NULL,NULL,NULL),(257,'owner_1768826070268_vtew6@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$BGR5Eg01q/1QZ/9/c0Wmb.AHcuFEM7huTWOyfZavYJq4jNrm6wqVy','Test','Owner',NULL,'owner','2026-01-19 13:34:30','2026-01-19 13:34:30',0,NULL,NULL,NULL,NULL),(258,'api.tester+qqyto0ty@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$UgCs.ZsA41Y3SKscnDhru.PX7g8kwzImq0ecE6Bq80sTp52kfdZCq','API','Tester',NULL,'owner','2026-01-19 13:36:05','2026-01-19 13:36:05',0,NULL,NULL,NULL,NULL),(259,'concurrent_tester_923273@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$ml/iMHaOn2.7u9FCOdb2GOYd2HA0qGthccIblyOq9503TLVHqsNPO','Concurrency','Tester',NULL,'client','2026-01-19 13:36:05','2026-01-19 13:36:05',0,NULL,NULL,NULL,NULL),(260,'concurrent_tester_369137@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$fXx5gMcwlgDQU9eHoMSzPulOGEH5ljN6Jj.zniELNt1zTSjerqUg6','Concurrency','Tester',NULL,'client','2026-01-19 13:36:05','2026-01-19 13:36:05',0,NULL,NULL,NULL,NULL),(261,'owner_1768826175809@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$v0RoZo9GPo06TQzPgPc7ReFlmHIcnQvS7hVRoKICNieccCWwq5AJe','Test','Owner',NULL,'owner','2026-01-19 13:36:16','2026-01-19 13:36:16',0,NULL,NULL,NULL,NULL),(262,'owner_1768826177555@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$KJovZHtxprkFhlZ5zYmi2eOHjNRfwHGZjGvbrZA/Wn7rs2qdTjEma','Test','Owner',NULL,'owner','2026-01-19 13:36:17','2026-01-19 13:36:17',0,NULL,NULL,NULL,NULL),(263,'payment_test_271812@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$s8X.Vb9R81ZU0h63o5mCpOxOUCuaygQrqwZPMsssP.ZQFYOQdl7wG','Payment','Tester',NULL,'client','2026-01-19 13:36:18','2026-01-19 13:36:18',0,NULL,NULL,NULL,NULL),(264,'payment_test_550979@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$Ou.aGM1OzcMgeQENqIC9qeO5IPIcMkvucyAKqwRvbuw9isY11eKWa','Payment','Tester',NULL,'client','2026-01-19 13:36:18','2026-01-19 13:36:18',0,NULL,NULL,NULL,NULL),(265,'payment_test_10849@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$y2cx9XdxIxNMW.kC22aMMOtNG0Z539kPKhZwxg43WzluKBjRVb1ba','Payment','Tester',NULL,'client','2026-01-19 13:36:18','2026-01-19 13:36:18',0,NULL,NULL,NULL,NULL),(266,'owner_1768826178509@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$zv4PjKl0nbaDJ3jrY.4iRuVgUrOC2IKmCE.6CC6GDNJu2YgrHunzW','Test','Owner',NULL,'owner','2026-01-19 13:36:18','2026-01-19 13:36:18',0,NULL,NULL,NULL,NULL),(267,'owner_1768826178849@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$9W5PAdKwtzweFQQJbBIeoOb1ZxbYKAtiK6C91tyttBRRvU5pwt1Fa','Test','Owner',NULL,'owner','2026-01-19 13:36:19','2026-01-19 13:36:19',0,NULL,NULL,NULL,NULL),(268,'owner_1768826178923_rk66l@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$6yJKW7LGi3iu37R5IIfztOP6miQHE7TmYCUKeB8XNZ7WylA2nBwTi','Test','Owner',NULL,'owner','2026-01-19 13:36:19','2026-01-19 13:36:19',0,NULL,NULL,NULL,NULL),(269,'owner_1768826179540_c54aw@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$UrxV.KPNZ.Hzo6AVVcIt7uf2m/yZCCkzEc5o3AYeUGTCQ/1y/oDKy','Test','Owner',NULL,'owner','2026-01-19 13:36:19','2026-01-19 13:36:19',0,NULL,NULL,NULL,NULL),(270,'owner_1768830180920@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$jJvlM2XVmLXEb9/W5a07VOaeV9zDlS6NrljD.QLW1nFDkBELeo73C','Test','Owner',NULL,'owner','2026-01-19 14:43:01','2026-01-19 14:43:01',0,NULL,NULL,NULL,NULL),(271,'owner_1768830180921@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$94/8Rv9yqQJOAVmrfMGbNOUzInPc.B51z3Ml2bnVHVqXTkOdmz2JO','Test','Owner',NULL,'owner','2026-01-19 14:43:01','2026-01-19 14:43:01',0,NULL,NULL,NULL,NULL),(272,'owner_1768830180920_vlhrr@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$Ah.2iFryUEctgaDU1e1mZ.vCObmIP.aAxIbqGpuxfjv8Tq9QcaEjO','Test','Owner',NULL,'owner','2026-01-19 14:43:01','2026-01-19 14:43:01',0,NULL,NULL,NULL,NULL),(273,'owner_1768830180921_jkpkc@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$7awuQIKK.etbXQ9Vu0/JLeT5HVSP1bxavY9bhIhJRs9WBOT89nHFi','Test','Owner',NULL,'owner','2026-01-19 14:43:01','2026-01-19 14:43:01',0,NULL,NULL,NULL,NULL),(274,'emily.wizard.1768830182974@test.com','+1 555 222 3333',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$1UWMgPIWDReTPR2OTD8kBubl6fY9IYyMzRKpYu9N4PI6t..4t3b8e','Emily','Watson',NULL,'staff','2026-01-19 14:43:03','2026-01-19 14:43:03',0,NULL,NULL,NULL,NULL),(275,'owner_1768830240185@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$0fhJgXwA7nN/W68XQcJlaO1/YV/WrvARATmwcSXPpoxkxoqmJ70qS','Test','Owner',NULL,'owner','2026-01-19 14:44:00','2026-01-19 14:44:00',0,NULL,NULL,NULL,NULL),(276,'owner_1768830240184_lpe4v@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$JgjXkVrhcHbkvqkClMJ5aeEL3g2YCZQIbIYbm81/MQySX2nIxfxMK','Test','Owner',NULL,'owner','2026-01-19 14:44:00','2026-01-19 14:44:00',0,NULL,NULL,NULL,NULL),(277,'owner_1768830240186_11u16@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$zsXIT2F/U.et600tA4ODSuSlmKMDpWivqmCdmRdfyVTyOrFwJDrEO','Test','Owner',NULL,'owner','2026-01-19 14:44:00','2026-01-19 14:44:00',0,NULL,NULL,NULL,NULL),(278,'emily.wizard.1768830242298@test.com','+1 555 222 3333',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$7LU5VPirqn0T6J3D026WjOMq4Ot9BdevQlfc9tnBJzO/8aSzQOLF2','Emily','Watson',NULL,'staff','2026-01-19 14:44:02','2026-01-19 14:44:02',0,NULL,NULL,NULL,NULL),(279,'api.tester+rctste0i@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$Gsk7yhRBfqe9hveBFQ9Ce.0x5utsAau.nqsObtcpjVoYhGbm.fujy','API','Tester',NULL,'owner','2026-01-19 14:44:56','2026-01-19 14:44:56',0,NULL,NULL,NULL,NULL),(280,'concurrent_tester_621756@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$2geihSrtwg2xO2fy61dk.etrkwlKQHeH5HhVHtpMH3Yq/BGFzyQRu','Concurrency','Tester',NULL,'client','2026-01-19 14:44:56','2026-01-19 14:44:56',0,NULL,NULL,NULL,NULL),(281,'concurrent_tester_555748@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$/Yg4DH0CllSQXV5tr4JviOUQBjz2QQ0/yZpkttoJQq1o5iBQmRgMK','Concurrency','Tester',NULL,'client','2026-01-19 14:44:56','2026-01-19 14:44:56',0,NULL,NULL,NULL,NULL),(282,'owner_1768830309666@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$VQy2Hu1/EQz5UOpq1iUp3uqBEOVWuH.5lJCyZy/eVxgoKGTy7HuTq','Test','Owner',NULL,'owner','2026-01-19 14:45:09','2026-01-19 14:45:09',0,NULL,NULL,NULL,NULL),(283,'payment_test_395707@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$VB3cN2tRAHFEvXyRtCBWYuui32GUJrQcRH8WdlAa.9lQqRDpWtJ5.','Payment','Tester',NULL,'client','2026-01-19 14:45:11','2026-01-19 14:45:11',0,NULL,NULL,NULL,NULL),(284,'owner_1768830311866@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$5AqUAiREUzEa/ukkcKk1Ee8N5Ak3yrDGAwRW5cZrqoMvXViM4vQxG','Test','Owner',NULL,'owner','2026-01-19 14:45:12','2026-01-19 14:45:12',0,NULL,NULL,NULL,NULL),(285,'owner_1768830311878@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$focNFjdVmVJh.jxgIai7b.DzVi7riMMALr06lx8K5k/48lQ6sPR2m','Test','Owner',NULL,'owner','2026-01-19 14:45:12','2026-01-19 14:45:12',0,NULL,NULL,NULL,NULL),(286,'payment_test_591882@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$rW5eCDkvJ438dbZN6qmbfeZeQlmXuushQ8Nbu8YxtcVIKdZpyGauC','Payment','Tester',NULL,'client','2026-01-19 14:45:12','2026-01-19 14:45:12',0,NULL,NULL,NULL,NULL),(287,'owner_1768830312286_s90q5@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$dXJCsrUTW168xLX6wAPHn.pQ0zsG4kphKp9izjWy6zIGiPC5Wat/u','Test','Owner',NULL,'owner','2026-01-19 14:45:12','2026-01-19 14:45:12',0,NULL,NULL,NULL,NULL),(288,'api.tester+j015ljt7@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$k4i4SIkYe0LDO1KWvzPbh.Ur3LZ.ONkqQ7FLOUl4uPKcFaypkTEL.','API','Tester',NULL,'owner','2026-01-19 14:45:41','2026-01-19 14:45:41',0,NULL,NULL,NULL,NULL),(289,'concurrent_tester_932962@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$yDuMRjfLIGc3nRQtsQkFMesR4fi2oF1gYEGpyf2Rc6LzdXaJzSgfG','Concurrency','Tester',NULL,'client','2026-01-19 14:45:41','2026-01-19 14:45:41',0,NULL,NULL,NULL,NULL),(290,'concurrent_tester_731480@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$SIEP6vOPpXMOeo4HJlF4geSYTvsMxZfaSGPnxlaJcTzx4eVASo2km','Concurrency','Tester',NULL,'client','2026-01-19 14:45:41','2026-01-19 14:45:41',0,NULL,NULL,NULL,NULL),(291,'owner_1768830353956@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$cTd4YVQhlkfZNyqxoGkA6eyuPUbWY5IGPV.nixQY1wPQO3DGbrzme','Test','Owner',NULL,'owner','2026-01-19 14:45:54','2026-01-19 14:45:54',0,NULL,NULL,NULL,NULL),(292,'payment_test_486872@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$yF3fuD5g3CFTWiHDubYlxe4RP0Q2IDQ20d1G9D3xyefuOpDWnBM.6','Payment','Tester',NULL,'client','2026-01-19 14:45:55','2026-01-19 14:45:55',0,NULL,NULL,NULL,NULL),(293,'owner_1768830356232@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$2F3v7nA/1JvENEhF1SADA.N0E9/3lEGQn7Nw3MB0a7XwipiZiqMH6','Test','Owner',NULL,'owner','2026-01-19 14:45:56','2026-01-19 14:45:56',0,NULL,NULL,NULL,NULL),(294,'concurrent_tester_751542@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$B3FWxX2cxcwnABka/ywyGOOhPzexLEo9U.K9KjQAAq0KBbJEY4p/.','Concurrency','Tester',NULL,'client','2026-01-19 14:47:26','2026-01-19 14:47:26',0,NULL,NULL,NULL,NULL),(295,'concurrent_tester_711058@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$RnI0hyrvSAoCeo/7EF/bP.SJAh3ZJGow1CvcBeLzkYCEWUJIxwACe','Concurrency','Tester',NULL,'client','2026-01-19 14:47:27','2026-01-19 14:47:27',0,NULL,NULL,NULL,NULL),(296,'api.tester+5d3g30j0@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$DpgYl9eSFBshva6TSbGYaOlh13sQNDa/sgByjeAf/lcj9zoRo86ju','API','Tester',NULL,'owner','2026-01-19 14:47:27','2026-01-19 14:47:27',0,NULL,NULL,NULL,NULL),(297,'owner_1768830459276@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$CYxIAdFxBDed7nAHgC5JqO0x5NjVm48W2883MAapOTflZbNgfaglu','Test','Owner',NULL,'owner','2026-01-19 14:47:39','2026-01-19 14:47:39',0,NULL,NULL,NULL,NULL),(298,'payment_test_531430@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$iZbD204yEH6qnpWwRO32FesPJHk8WFe2zJOEPdNNgkQJu5W2PvvAa','Payment','Tester',NULL,'client','2026-01-19 14:47:40','2026-01-19 14:47:40',0,NULL,NULL,NULL,NULL),(299,'owner_1768830461164@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$30BOkJUMee.3GpoWOsRxDOYeGpD7d7Y9V.BqCCd3Kqwx1ozb9GNgi','Test','Owner',NULL,'owner','2026-01-19 14:47:41','2026-01-19 14:47:41',0,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `waitlist`
--

DROP TABLE IF EXISTS `waitlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `waitlist` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned DEFAULT NULL,
  `staff_id` bigint unsigned DEFAULT NULL,
  `preferred_date` date NOT NULL,
  `preferred_time_start` time DEFAULT NULL,
  `preferred_time_end` time DEFAULT NULL,
  `notes` text,
  `status` enum('pending','notified','booked','expired','cancelled') DEFAULT 'pending',
  `notified_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_waitlist_salon` (`salon_id`),
  KEY `idx_waitlist_client` (`client_id`),
  KEY `idx_waitlist_date` (`preferred_date`),
  KEY `service_id` (`service_id`),
  KEY `staff_id` (`staff_id`),
  CONSTRAINT `waitlist_ibfk_1` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `waitlist_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `waitlist_ibfk_3` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL,
  CONSTRAINT `waitlist_ibfk_4` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `waitlist`
--

LOCK TABLES `waitlist` WRITE;
/*!40000 ALTER TABLE `waitlist` DISABLE KEYS */;
/*!40000 ALTER TABLE `waitlist` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `widget_settings`
--

DROP TABLE IF EXISTS `widget_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `widget_settings` (
  `salon_id` bigint unsigned NOT NULL,
  `enabled` tinyint(1) DEFAULT '1',
  `primary_color` varchar(20) DEFAULT '#000000',
  `secondary_color` varchar(20) DEFAULT '#FFFFFF',
  `button_text` varchar(100) DEFAULT 'Book Now',
  `show_services` tinyint(1) DEFAULT '1',
  `show_staff` tinyint(1) DEFAULT '1',
  `show_prices` tinyint(1) DEFAULT '1',
  `require_phone` tinyint(1) DEFAULT '1',
  `require_email` tinyint(1) DEFAULT '1',
  `allow_notes` tinyint(1) DEFAULT '1',
  `terms_url` varchar(500) DEFAULT NULL,
  `success_message` text,
  PRIMARY KEY (`salon_id`),
  CONSTRAINT `widget_settings_ibfk_1` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `widget_settings`
--

LOCK TABLES `widget_settings` WRITE;
/*!40000 ALTER TABLE `widget_settings` DISABLE KEYS */;
INSERT INTO `widget_settings` VALUES (163,1,'#8B5CF6','#EC4899','Book Now',1,1,1,1,1,1,NULL,NULL),(164,1,'#EC4899','#8B5CF6','Book Now',1,1,1,1,1,1,NULL,NULL),(165,1,'#3B82F6','#1E40AF','Book Now',1,1,1,1,1,1,NULL,NULL),(166,1,'#F59E0B','#EF4444','Book Now',1,1,1,1,1,1,NULL,NULL),(167,1,'#10B981','#059669','Book Now',1,1,1,1,1,1,NULL,NULL),(168,1,'#8B5CF6','#6366F1','Book Now',1,1,1,1,1,1,NULL,NULL);
/*!40000 ALTER TABLE `widget_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'fresh'
--

--
-- Dumping routines for database 'fresh'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-21 10:25:44
