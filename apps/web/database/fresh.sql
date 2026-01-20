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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platform_fees`
--

LOCK TABLES `platform_fees` WRITE;
/*!40000 ALTER TABLE `platform_fees` DISABLE KEYS */;
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
  CONSTRAINT `fk_salon_clients_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_salon_clients_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salon_clients`
--

LOCK TABLES `salon_clients` WRITE;
/*!40000 ALTER TABLE `salon_clients` DISABLE KEYS */;
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
INSERT INTO `salon_settings` VALUES (163,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(164,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(165,48,25.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(166,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(167,48,0.00,1,20,'09:00:00','19:00:00',1,1,90,0,1,24),(168,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24);
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
) ENGINE=InnoDB AUTO_INCREMENT=169 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salons`
--

LOCK TABLES `salons` WRITE;
/*!40000 ALTER TABLE `salons` DISABLE KEYS */;
INSERT INTO `salons` VALUES (163,179,'Luxe Hair Studio','Premium hair salon specializing in modern cuts, coloring, and styling. Our expert stylists stay current with the latest trends and techniques.','+33 1 42 86 82 00','contact@luxehairstudio.fr','15 Rue de Rivoli','Paris','France',48.8566000,2.3522000,1,'2026-01-12 17:25:53',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(164,180,'Bella Nails & Spa','Full-service nail salon and spa offering manicures, pedicures, and relaxing treatments in a luxurious environment.','+33 1 45 48 55 26','info@bellanails.fr','28 Avenue des Champs-Élysées','Paris','France',48.8698000,2.3078000,1,'2026-01-12 17:25:53',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(165,181,'The Barber Shop','Traditional barbershop with a modern twist. Expert cuts, hot towel shaves, and grooming services for the modern gentleman.','+33 1 42 77 76 17','hello@thebarbershop.fr','45 Rue du Faubourg Saint-Antoine','Paris','France',48.8534000,2.3735000,1,'2026-01-12 17:25:53',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(166,182,'Glow Beauty Bar','Your destination for facials, waxing, lash extensions, and makeup services. We help you look and feel your best.','+33 1 43 26 48 23','contact@glowbeauty.fr','12 Boulevard Saint-Germain','Paris','France',48.8529000,2.3499000,1,'2026-01-12 17:25:53',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(167,183,'Serenity Spa','Escape to tranquility with our massage therapy, body treatments, and wellness services. Your urban oasis awaits.','+33 1 42 60 34 86','info@serenityspa.fr','8 Rue de la Paix','Paris','France',48.8692000,2.3311000,1,'2026-01-12 17:25:53',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(168,184,'Studio 54 Salon','Trendy salon offering cutting-edge hair services, balayage, and hair treatments. Walk-ins welcome!','+33 1 48 87 63 42','booking@studio54salon.fr','54 Rue de Charonne','Paris','France',48.8533000,2.3816000,1,'2026-01-12 17:25:53',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active');
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
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_categories`
--

LOCK TABLES `service_categories` WRITE;
/*!40000 ALTER TABLE `service_categories` DISABLE KEYS */;
INSERT INTO `service_categories` VALUES (21,163,'Hair Cuts',1),(22,163,'Hair Color',2),(23,163,'Hair Treatments',3),(24,164,'Manicures',1),(25,164,'Pedicures',2),(26,164,'Spa Services',3),(27,165,'Haircuts',1),(28,165,'Shaving',2),(29,165,'Grooming',3),(30,166,'Facials',1),(31,166,'Waxing',2),(32,166,'Lashes & Brows',3),(33,167,'Massage',1),(34,167,'Body Treatments',2),(35,167,'Wellness',3),(36,168,'Cuts & Styling',1),(37,168,'Color Services',2),(38,168,'Treatments',3);
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
  CONSTRAINT `fk_services_category` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_services_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES (32,163,21,'Women\'s Haircut',60,75.00,1,NULL,0,0,NULL,1),(33,163,21,'Men\'s Haircut',45,55.00,1,NULL,0,0,NULL,1),(34,163,21,'Bang Trim',15,20.00,1,NULL,0,0,NULL,0),(35,163,22,'Full Color',120,150.00,1,NULL,0,0,NULL,1),(36,163,22,'Balayage',180,250.00,1,NULL,0,0,NULL,1),(37,163,22,'Root Touch-Up',90,95.00,1,NULL,0,0,NULL,0),(38,163,23,'Deep Conditioning',30,45.00,1,NULL,0,0,NULL,0),(39,163,23,'Keratin Treatment',150,300.00,1,NULL,0,0,NULL,1),(40,164,24,'Classic Manicure',45,35.00,1,NULL,0,0,NULL,1),(41,164,24,'Gel Manicure',60,55.00,1,NULL,0,0,NULL,1),(42,164,24,'Acrylic Full Set',90,75.00,1,NULL,0,0,NULL,1),(43,164,25,'Classic Pedicure',60,45.00,1,NULL,0,0,NULL,1),(44,164,25,'Spa Pedicure',75,65.00,1,NULL,0,0,NULL,1),(45,164,25,'Deluxe Pedicure',90,85.00,1,NULL,0,0,NULL,0),(46,164,26,'Paraffin Treatment',30,25.00,1,NULL,0,0,NULL,0),(47,164,26,'Hand & Foot Massage',30,40.00,1,NULL,0,0,NULL,0),(48,165,27,'Classic Cut',45,45.00,1,NULL,0,0,NULL,1),(49,165,27,'Fade Haircut',60,55.00,1,NULL,0,0,NULL,1),(50,165,27,'Buzz Cut',30,35.00,1,NULL,0,0,NULL,0),(51,165,28,'Hot Towel Shave',45,50.00,1,NULL,0,0,NULL,1),(52,165,28,'Beard Trim',30,30.00,1,NULL,0,0,NULL,1),(53,165,29,'Beard Shaping',45,40.00,1,NULL,0,0,NULL,0),(54,165,29,'Hair & Beard Combo',75,75.00,1,NULL,0,0,NULL,1);
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_salon_user` (`salon_id`,`user_id`),
  KEY `idx_staff_salon_id` (`salon_id`),
  KEY `idx_staff_user_id` (`user_id`),
  KEY `idx_staff_visible` (`salon_id`,`is_active`,`is_visible`),
  CONSTRAINT `fk_staff_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_emergency_contacts`
--

LOCK TABLES `staff_emergency_contacts` WRITE;
/*!40000 ALTER TABLE `staff_emergency_contacts` DISABLE KEYS */;
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
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=189 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (179,'owner@fresh.com','+1234567890',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','John','Smith',NULL,'owner','2026-01-12 17:25:53','2026-01-12 17:25:53',0,NULL,NULL,NULL,NULL),(180,'owner2@fresh.com','+1234567891',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','Sarah','Connor',NULL,'owner','2026-01-12 17:25:53','2026-01-12 17:25:53',0,NULL,NULL,NULL,NULL),(181,'owner3@fresh.com','+1234567892',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','James','Bond',NULL,'owner','2026-01-12 17:25:53','2026-01-12 17:25:53',0,NULL,NULL,NULL,NULL),(182,'owner4@fresh.com','+1234567893',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','Ellen','Ripley',NULL,'owner','2026-01-12 17:25:53','2026-01-12 17:25:53',0,NULL,NULL,NULL,NULL),(183,'owner5@fresh.com','+1234567894',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','Tony','Stark',NULL,'owner','2026-01-12 17:25:53','2026-01-12 17:25:53',0,NULL,NULL,NULL,NULL),(184,'owner6@fresh.com','+1234567895',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','Bruce','Wayne',NULL,'owner','2026-01-12 17:25:53','2026-01-12 17:25:53',0,NULL,NULL,NULL,NULL),(185,'client@fresh.com','+1234567896',NULL,NULL,NULL,NULL,NULL,NULL,'$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu','Waynee','Waynee',NULL,'client','2026-01-12 17:25:53','2026-01-12 23:35:52',0,NULL,NULL,NULL,NULL),(186,'testpro_country@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$KPN1h3cBzDAXG2OoHC.0/.8rtTpTVFGWCqlXV5LBmaxz69JwRwBra','Test','Pro','DZ','owner','2026-01-13 00:07:24','2026-01-13 00:07:24',0,NULL,NULL,NULL,NULL),(187,'testclient_no_country@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$ARXrdSCbqoGNipokHOPaJ.ujBkwMkF1Sjz4VWIeNabnljFnsQM7mO','Test','Client','','client','2026-01-13 00:09:11','2026-01-13 00:09:11',0,NULL,NULL,NULL,NULL),(188,'onboarding_test_999@example.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2b$12$ixRZsHbNiEsxhp0/JMhzn.4k7jbNIHp9zFYZ/NzucHg9nQMtYePeu','Onboarding','Test','DZ','owner','2026-01-13 00:23:42','2026-01-13 00:23:42',0,NULL,NULL,NULL,NULL);
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

-- Dump completed on 2026-01-18 12:37:22
