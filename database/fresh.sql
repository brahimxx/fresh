CREATE DATABASE  IF NOT EXISTS `fresh` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `fresh`;
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
INSERT INTO `platform_settings` VALUES (1,'platform_fee_percent','2.5','number','Platform fee percentage','2026-01-07 11:06:35','2026-01-07 11:06:35'),(2,'new_client_fee_percent','20','number','Fee for new marketplace clients','2026-01-07 11:06:35','2026-01-07 11:06:35'),(3,'default_currency','EUR','string','Default currency','2026-01-07 11:06:35','2026-01-07 11:06:35'),(4,'default_timezone','Europe/Paris','string','Default timezone','2026-01-07 11:06:35','2026-01-07 11:06:35'),(5,'maintenance_mode','false','boolean','Maintenance mode','2026-01-07 11:06:35','2026-01-07 11:06:35'),(6,'support_email','support@fresh.app','string','Support email','2026-01-07 11:06:35','2026-01-07 11:06:35');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salon_photos`
--

LOCK TABLES `salon_photos` WRITE;
/*!40000 ALTER TABLE `salon_photos` DISABLE KEYS */;
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
INSERT INTO `salon_settings` VALUES (1,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(2,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(3,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(4,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(5,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(6,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(7,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(8,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(9,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(10,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(11,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(12,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(13,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(14,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(15,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(16,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(17,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(18,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(19,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(20,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(21,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(22,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(23,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(24,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(25,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(26,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(27,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(28,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(29,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(30,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(31,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(32,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(33,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(34,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(35,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(36,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(37,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(38,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(39,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(40,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(41,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(42,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(43,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(44,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(45,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(46,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(47,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(48,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(49,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(50,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(51,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(52,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(53,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(54,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(55,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(56,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(57,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(58,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(59,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(60,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(61,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(62,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(63,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(64,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(65,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(66,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(67,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(68,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(69,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(70,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(71,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(72,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(73,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(74,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(75,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(76,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(77,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(78,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(79,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(80,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(81,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(82,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(83,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(84,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(85,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(86,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(87,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(88,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(89,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(90,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(91,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(92,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(93,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(94,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(95,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(96,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(97,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(98,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(99,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(100,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(101,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(102,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(103,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(104,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(105,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(106,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(107,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(108,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(109,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(110,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(111,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(112,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(113,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(114,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(115,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(116,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(117,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(118,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(119,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(120,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(121,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(122,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(123,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(124,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(125,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(126,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(127,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(128,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(129,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(130,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(131,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(132,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(133,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(134,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(135,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(136,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(137,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(138,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(139,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(140,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(141,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(142,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(143,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(144,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(145,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(146,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(147,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(148,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(149,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(150,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(151,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(152,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(153,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(154,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(155,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(156,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(157,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(158,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(159,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24),(160,24,0.00,0,0,'09:00:00','19:00:00',1,1,90,0,1,24);
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
) ENGINE=InnoDB AUTO_INCREMENT=161 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salons`
--

LOCK TABLES `salons` WRITE;
/*!40000 ALTER TABLE `salons` DISABLE KEYS */;
INSERT INTO `salons` VALUES (1,9,'E2E Test Salon 1767807781677',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 18:43:01',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(2,10,'E2E Test Salon 1767807814327',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 18:43:34',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(3,11,'E2E Test Salon 1767807839694',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 18:43:59',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(4,12,'E2E Test Salon 1767808097194',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 18:48:17',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(5,13,'E2E Test Salon 1767808114778',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 18:48:34',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(6,14,'E2E Test Salon 1767809205420',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:06:45',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(7,15,'E2E Test Salon 1767809289983',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:08:09',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(8,16,'E2E Test Salon 1767809316149',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:08:36',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(9,17,'E2E Test Salon 1767809355833',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:09:15',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(10,18,'E2E Test Salon 1767809375449',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:09:35',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(11,19,'E2E Test Salon 1767809386164',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:09:46',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(12,20,'E2E Test Salon 1767809427631',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:10:27',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(13,21,'E2E Test Salon 1767809457297',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:10:57',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(14,22,'E2E Test Salon 1767809475496',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:11:15',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(15,23,'E2E Test Salon 1767809531727',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:12:11',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(16,24,'E2E Test Salon 1767809557693',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:12:37',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(17,25,'E2E Test Salon 1767809576659',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:12:56',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(18,26,'E2E Test Salon 1767809598458',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:13:18',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(19,27,'E2E Test Salon 1767809610825',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:13:30',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(20,28,'E2E Test Salon 1767809635857',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:13:55',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(21,29,'E2E Test Salon 1767809653223',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:14:13',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(22,30,'E2E Test Salon 1767809701705',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:15:01',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(23,32,'E2E Test Salon 1767811105830',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:38:25',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(24,34,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 19:39:32',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(25,35,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 19:39:43',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(26,36,'E2E Test Salon 1767811196712',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:39:56',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(27,37,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 19:41:26',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(28,38,'E2E Test Salon 1767811299792',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 19:41:39',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(29,41,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 19:59:50',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(30,43,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:00:02',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(31,42,'E2E Test Salon 1767812404027',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:00:04',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(32,44,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:00:07',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(33,45,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:00:12',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(34,47,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:00:24',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(35,46,'E2E Test Salon 1767812425108',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:00:25',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(36,48,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:00:29',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(37,49,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:01:54',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(38,51,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:02:06',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(39,50,'E2E Test Salon 1767812526870',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:02:06',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(40,53,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:02:29',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(41,52,'E2E Test Salon 1767812550043',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:02:30',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(42,55,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:02:49',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(43,54,'E2E Test Salon 1767812570686',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:02:50',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(44,57,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:03:02',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(45,56,'E2E Test Salon 1767812583627',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:03:03',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(46,59,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:03:17',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(47,58,'E2E Test Salon 1767812599262',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:03:19',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(48,60,'E2E Test Salon 1767812615326',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:03:35',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(49,61,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:04:51',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(50,63,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:05:02',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(51,62,'E2E Test Salon 1767812703661',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:05:03',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(52,65,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:05:21',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(53,64,'E2E Test Salon 1767812722211',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:05:22',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(54,67,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:05:36',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(55,66,'E2E Test Salon 1767812737532',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:05:37',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(56,69,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:05:49',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(57,68,'E2E Test Salon 1767812751811',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:05:51',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(58,70,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:06:06',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(59,71,'E2E Test Salon 1767812769028',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:06:09',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(60,72,'E2E Test Salon 1767812783527',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:06:23',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(61,73,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:07:12',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(62,75,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:07:24',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(63,74,'E2E Test Salon 1767812845673',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:07:25',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(64,77,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:07:44',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(65,76,'E2E Test Salon 1767812865516',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:07:45',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(66,79,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:08:01',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(67,78,'E2E Test Salon 1767812881822',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:08:01',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(68,81,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:08:15',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(69,80,'E2E Test Salon 1767812895698',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:08:15',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(70,83,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:08:31',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(71,82,'E2E Test Salon 1767812913429',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:08:33',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(72,84,'E2E Test Salon 1767812931233',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:08:51',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(73,85,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:09:12',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(74,87,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:09:24',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(75,86,'E2E Test Salon 1767812965967',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:09:25',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(76,89,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:09:44',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(77,88,'E2E Test Salon 1767812985935',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:09:45',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(78,91,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:10:01',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(79,90,'E2E Test Salon 1767813003278',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:10:03',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(80,93,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:10:15',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(81,92,'E2E Test Salon 1767813017199',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:10:17',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(82,95,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:10:32',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(83,94,'E2E Test Salon 1767813035063',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:10:35',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(84,96,'E2E Test Salon 1767813052731',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:10:52',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(85,97,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 20:12:30',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(86,98,'E2E Test Salon 1767813168761',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 20:12:48',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(87,40,'brahim moulahoum','a','+213562105687','bhm.x@live.com','Cooperative Essaada villa 71','Algiers','Algeria',NULL,NULL,1,'2026-01-07 20:14:41',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(88,40,'brahim moulahoum1','a','+213562105687','bhm.x@live.com','Cooperative Essaada villa 71','Algiers','Algeria',NULL,NULL,1,'2026-01-07 20:19:31',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(89,100,'E2E Calendar Test 1767815382197',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 20:49:42',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(90,101,'E2E Calendar Test 1767815413323',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 20:50:13',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(91,102,'E2E Calendar Test 1767815434281',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 20:50:34',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(92,103,'E2E Calendar Test 1767815477963',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 20:51:17',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(93,104,'E2E Calendar Test 1767815513801',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 20:51:53',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(94,105,'E2E Calendar Test 1767815537973',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 20:52:17',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(95,106,'E2E Calendar Test 1767815555078',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 20:52:35',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(96,107,'E2E Calendar Test 1767815593925',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 20:53:13',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(97,108,'E2E Calendar Test 1767815650753',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 20:54:10',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(98,109,'E2E Calendar Test 1767815769296',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 20:56:09',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(99,110,'E2E Services Test 1767816220093',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:03:40',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(100,111,'E2E Services Test 1767816237065',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:03:57',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(101,112,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 21:05:56',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(102,113,'E2E Calendar Test 1767816366300',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:06:06',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(103,115,'E2E Services Test 1767816367940',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:06:07',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(104,116,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 21:06:08',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(105,114,'E2E Test Salon 1767816369319',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 21:06:09',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(106,117,'E2E Calendar Test 1767816382994',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:06:23',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(107,119,'E2E Services Test 1767816385242',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:06:25',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(108,120,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 21:06:25',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(109,118,'E2E Test Salon 1767816387669',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 21:06:27',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(110,121,'E2E Calendar Test 1767816399210',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:06:39',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(111,124,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 21:06:41',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(112,122,'E2E Services Test 1767816401600',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:06:41',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(113,123,'E2E Test Salon 1767816403601',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 21:06:43',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(114,125,'E2E Calendar Test 1767816412705',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:06:52',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(115,127,'E2E Services Test 1767816414113',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:06:54',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(116,128,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 21:06:55',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(117,126,'E2E Test Salon 1767816415780',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 21:06:55',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(118,129,'E2E Calendar Test 1767816427699',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:07:07',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(119,132,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 21:07:10',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(120,131,'E2E Services Test 1767816430475',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:07:10',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(121,130,'E2E Test Salon 1767816432256',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 21:07:12',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(122,133,'E2E Calendar Test 1767816444321',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:07:24',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(123,135,'E2E Services Test 1767816446604',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:07:26',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(124,134,'E2E Test Salon 1767816447579',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 21:07:27',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(125,138,'E2E Calendar Test 1767816618142',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:10:18',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(126,136,'E2E Calendar Test 1767816618190',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:10:18',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(127,139,'E2E Calendar Test 1767816894962',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:14:54',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(128,142,'E2E Calendar Test 1767816961023',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:16:01',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(129,140,'E2E Calendar Test 1767816961052',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:16:01',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(130,141,'E2E Calendar Test 1767816961084',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:16:01',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(131,143,'E2E Services Test 1767816968808',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:16:08',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(132,144,'E2E Services Test 1767816968855',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:16:08',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(133,145,'E2E Services Test 1767817009704',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:16:49',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(134,146,'E2E Services Test 1767817009705',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:16:49',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(135,147,'E2E Services Test 1767817016122',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:16:56',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(136,148,'E2E Services Test 1767817017201',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:16:57',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(137,149,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 21:17:06',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(138,150,'E2E Calendar Test 1767817036103',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:17:16',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(139,152,'E2E Services Test 1767817037515',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:17:17',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(140,153,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 21:17:18',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(141,151,'E2E Test Salon 1767817038926',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 21:17:18',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(142,154,'E2E Calendar Test 1767817055136',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:17:35',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(143,156,'E2E Services Test 1767817057319',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:17:37',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(144,157,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 21:17:37',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(145,155,'E2E Test Salon 1767817059597',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 21:17:39',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(146,158,'E2E Calendar Test 1767817072739',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:17:52',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(147,160,'E2E Services Test 1767817075018',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:17:55',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(148,161,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 21:17:55',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(149,159,'E2E Test Salon 1767817076938',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 21:17:56',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(150,162,'E2E Calendar Test 1767817086826',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:18:06',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(151,165,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 21:18:08',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(152,164,'E2E Services Test 1767817088966',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:18:08',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(153,163,'E2E Test Salon 1767817090826',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 21:18:10',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(154,166,'E2E Calendar Test 1767817103328',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:18:23',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(155,169,'My Test Salon',NULL,NULL,NULL,'123 Test St','Testville','USA',NULL,NULL,1,'2026-01-07 21:18:25',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(156,168,'E2E Services Test 1767817105698',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:18:25',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(157,167,'E2E Test Salon 1767817106968',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 21:18:26',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(158,170,'E2E Calendar Test 1767817120583',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:18:40',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(159,172,'E2E Services Test 1767817122693',NULL,'+1 555 123 4567','contact@example.com','123 Main St','Testville','US',NULL,NULL,1,'2026-01-07 21:18:42',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active'),(160,171,'E2E Test Salon 1767817124344',NULL,'+1 555 999 0000','owner@example.com','456 Market Street','Metropolis','USA',NULL,NULL,1,'2026-01-07 21:18:44',1,'Europe/Paris','EUR',NULL,NULL,NULL,2,'Hair Salon',NULL,NULL,'active');
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
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_categories`
--

LOCK TABLES `service_categories` WRITE;
/*!40000 ALTER TABLE `service_categories` DISABLE KEYS */;
INSERT INTO `service_categories` VALUES (1,99,'Haircuts',0),(2,100,'Haircuts',0),(3,103,'Haircuts',0),(4,107,'Haircuts',0),(5,112,'Haircuts',0),(6,115,'Haircuts',0),(7,120,'Haircuts',0),(8,123,'Haircuts',0),(9,131,'Haircuts',0),(10,132,'Haircuts',0),(11,133,'Haircuts',0),(12,134,'Haircuts',0),(13,135,'Haircuts',0),(14,136,'Haircuts',0),(15,139,'Haircuts',0),(16,143,'Haircuts',0),(17,147,'Haircuts',0),(18,152,'Haircuts',0),(19,156,'Haircuts',0),(20,159,'Haircuts',0);
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
  PRIMARY KEY (`id`),
  KEY `idx_services_salon_id` (`salon_id`),
  KEY `idx_services_category_id` (`category_id`),
  KEY `idx_services_salon_active` (`salon_id`,`is_active`),
  CONSTRAINT `fk_services_category` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_services_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES (1,99,1,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(2,100,2,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(3,103,3,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(4,107,4,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(5,112,5,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(6,115,6,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(7,120,7,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(8,123,8,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(9,131,9,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(10,132,10,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(11,133,11,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(12,134,12,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(13,135,13,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(14,136,14,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(15,139,15,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(16,143,16,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(17,147,17,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(18,152,18,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(19,156,19,'Basic Cut',30,25.00,1,NULL,0,0,NULL),(20,159,20,'Basic Cut',30,25.00,1,NULL,0,0,NULL);
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
  `role` enum('staff','manager') NOT NULL DEFAULT 'staff',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `bio` text,
  `avatar_url` varchar(500) DEFAULT NULL,
  `color` varchar(7) DEFAULT '#3B82F6',
  `display_order` int DEFAULT '0',
  `title` varchar(100) DEFAULT NULL,
  `is_visible` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_salon_user` (`salon_id`,`user_id`),
  KEY `idx_staff_salon_id` (`salon_id`),
  KEY `idx_staff_user_id` (`user_id`),
  KEY `idx_staff_visible` (`salon_id`,`is_active`,`is_visible`),
  CONSTRAINT `fk_staff_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
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
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=173 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'owner_1767807264279@example.com',NULL,'$2b$12$0hASnBm61Zay39DJOmHx6efmQsnXc0C8DRRrAT9pJlTvrtmZWgJDy','Test','Owner','owner','2026-01-07 18:34:24','2026-01-07 18:34:24',0,NULL,NULL,NULL,NULL),(2,'owner_1767807317963@example.com',NULL,'$2b$12$ZPId3veXw/HX2JHyLumb3ugJdBzKHfIWsfeLIVjSbzNezPhx4psAG','Test','Owner','owner','2026-01-07 18:35:18','2026-01-07 18:35:18',0,NULL,NULL,NULL,NULL),(3,'owner_1767807359188@example.com',NULL,'$2b$12$LXQFZtGBWfKJc94.Yml.BeAtAJkyMxoSc.M4SkQ7xN8FKINuf3da6','Test','Owner','owner','2026-01-07 18:35:59','2026-01-07 18:35:59',0,NULL,NULL,NULL,NULL),(4,'owner_1767807382509@example.com',NULL,'$2b$12$J0QN7Qtbd5D6vCvWaFebPeMmcu6dHoNIEZDtwdpWBWi5SymYdncJ.','Test','Owner','owner','2026-01-07 18:36:22','2026-01-07 18:36:22',0,NULL,NULL,NULL,NULL),(5,'owner_1767807453308@example.com',NULL,'$2b$12$bwIZp1UUIemMbPi4WxQC7.tiw8qA2g7vdndsk8FPn90nU1D3XRcGa','Test','Owner','owner','2026-01-07 18:37:33','2026-01-07 18:37:33',0,NULL,NULL,NULL,NULL),(6,'owner_1767807514035@example.com',NULL,'$2b$12$CScZv7T8By2xmqoViChdzuHTf8pe362Fo2ooDIZCA8qAewwXW.j0y','Test','Owner','owner','2026-01-07 18:38:34','2026-01-07 18:38:34',0,NULL,NULL,NULL,NULL),(7,'owner_1767807527793@example.com',NULL,'$2b$12$MwdPnvzZrqDsXq13K4cRjOw1zwHoS9LRuO3fp2v3PGOJ1ZTwLLghK','Test','Owner','owner','2026-01-07 18:38:48','2026-01-07 18:38:48',0,NULL,NULL,NULL,NULL),(8,'owner_1767807766162@example.com',NULL,'$2b$12$.mK/q68RA2bP0wiStBc2ueZKnC5AimPYY8x6zngqrVVlr8ZSWDQ62','Test','Owner','owner','2026-01-07 18:42:46','2026-01-07 18:42:46',0,NULL,NULL,NULL,NULL),(9,'owner_1767807779959@example.com',NULL,'$2b$12$Q/jjLQ2ikdyYmt.S6SImDuZuTYGncb4zcXc2.i9doyMZKdL45zvtS','Test','Owner','owner','2026-01-07 18:43:00','2026-01-07 18:43:00',0,NULL,NULL,NULL,NULL),(10,'owner_1767807812614@example.com',NULL,'$2b$12$aexylARsSBCv3Jgb3HkqTORhS7uLUw0QtL1tIhh2XyQHxMEL8.Vsi','Test','Owner','owner','2026-01-07 18:43:32','2026-01-07 18:43:32',0,NULL,NULL,NULL,NULL),(11,'owner_1767807837966@example.com',NULL,'$2b$12$hvyqePFRLnGtEWohsgxAfeuoAvyRK.38SjAss5rLNul.NUuXnWuve','Test','Owner','owner','2026-01-07 18:43:58','2026-01-07 18:43:58',0,NULL,NULL,NULL,NULL),(12,'owner_1767808095425@example.com',NULL,'$2b$12$54y2jDUe1NWL0GKjxBVEEO.kpsXLV4SSWvMSJuEgtKb8izrVQETb2','Test','Owner','owner','2026-01-07 18:48:15','2026-01-07 18:48:15',0,NULL,NULL,NULL,NULL),(13,'owner_1767808112952@example.com',NULL,'$2b$12$leCzhMMW5wS1Ir3xKiCy0.8zCV1LN755GzNdKLZjAIvBtkB/DVglK','Test','Owner','owner','2026-01-07 18:48:33','2026-01-07 18:48:33',0,NULL,NULL,NULL,NULL),(14,'owner_1767809203559@example.com',NULL,'$2b$12$vkE6L1p2eVD.AnJpnD6PLe8Iz2penB6CSokjNTvAd8Ce3inQ.XnWO','Test','Owner','owner','2026-01-07 19:06:43','2026-01-07 19:06:43',0,NULL,NULL,NULL,NULL),(15,'owner_1767809287851@example.com',NULL,'$2b$12$yqaR5t9bRu/8Dohk049OKueiHEW9GjZtA395JMm8Yw2bld1YGMv4W','Test','Owner','owner','2026-01-07 19:08:08','2026-01-07 19:08:08',0,NULL,NULL,NULL,NULL),(16,'owner_1767809313994@example.com',NULL,'$2b$12$BQv1DUbpTQwwBxlfD5d8kO98bfnmyxO8xcm20ku388xTzJowWxyNG','Test','Owner','owner','2026-01-07 19:08:34','2026-01-07 19:08:34',0,NULL,NULL,NULL,NULL),(17,'owner_1767809353610@example.com',NULL,'$2b$12$A6eHA2FlNMTKGTFgrUQghuVrdovMNhBjTSxHdWXZ0s9XAw8kSpaQK','Test','Owner','owner','2026-01-07 19:09:14','2026-01-07 19:09:14',0,NULL,NULL,NULL,NULL),(18,'owner_1767809373311@example.com',NULL,'$2b$12$0QdZLx4A3BspGla2d5WeUeGL4P807wtBm0cVuh7m0ne3SYeeIQQ9O','Test','Owner','owner','2026-01-07 19:09:33','2026-01-07 19:09:33',0,NULL,NULL,NULL,NULL),(19,'owner_1767809384032@example.com',NULL,'$2b$12$Rbs82DFkPxAujfijPKicQ.q9Imz79oiG26BI/7TwDsQRvjzW/UcHC','Test','Owner','owner','2026-01-07 19:09:44','2026-01-07 19:09:44',0,NULL,NULL,NULL,NULL),(20,'owner_1767809424942@example.com',NULL,'$2b$12$83uNLF.I94P8HlqnXIFnMuwWTrO6BVs5Tm7cUe.cLho2VlPQa4dQW','Test','Owner','owner','2026-01-07 19:10:25','2026-01-07 19:10:25',0,NULL,NULL,NULL,NULL),(21,'owner_1767809455146@example.com',NULL,'$2b$12$ya/p8lg9Xm/B9S7m0Wu.PeH.B977hT6LVcNGG5bfSsFnoTycKCYd6','Test','Owner','owner','2026-01-07 19:10:55','2026-01-07 19:10:55',0,NULL,NULL,NULL,NULL),(22,'owner_1767809473240@example.com',NULL,'$2b$12$iXH369CEYPGtu0cLFgdw8eA/hQHP512ak9.rLl3UEriE6OXYp0t0q','Test','Owner','owner','2026-01-07 19:11:13','2026-01-07 19:11:13',0,NULL,NULL,NULL,NULL),(23,'owner_1767809529599@example.com',NULL,'$2b$12$5p01PUzAunzSNwNZeIA0EuHIIM6h8ekRYRqz2frRxttPEhX/UGl8G','Test','Owner','owner','2026-01-07 19:12:10','2026-01-07 19:12:10',0,NULL,NULL,NULL,NULL),(24,'owner_1767809555551@example.com',NULL,'$2b$12$VYfpQhIMnU3YO4KXB2Qlwu0Ei7lrErXbJjza/pZOLGqiLllWqkmUi','Test','Owner','owner','2026-01-07 19:12:35','2026-01-07 19:12:35',0,NULL,NULL,NULL,NULL),(25,'owner_1767809574514@example.com',NULL,'$2b$12$AGiTopk.d8VGo8EZzs54PuYV1EgbKMwzVTRZlle/UXmJY4hvHSGCe','Test','Owner','owner','2026-01-07 19:12:54','2026-01-07 19:12:54',0,NULL,NULL,NULL,NULL),(26,'owner_1767809596323@example.com',NULL,'$2b$12$ZRlEashVF/JuEWHvRT0Siec0bzzaYmNU/IEDt0j5vcLdq0Xt.kRoC','Test','Owner','owner','2026-01-07 19:13:16','2026-01-07 19:13:16',0,NULL,NULL,NULL,NULL),(27,'owner_1767809608675@example.com',NULL,'$2b$12$yve04.qA5m.okpLQOAo2puuAvbLUz85B9e2Mt6ys5e.TEfljlgbfq','Test','Owner','owner','2026-01-07 19:13:29','2026-01-07 19:13:29',0,NULL,NULL,NULL,NULL),(28,'owner_1767809633703@example.com',NULL,'$2b$12$yZrTaGhaGZ1yylKaTtmvD.f0VwCg8YmtNc5u7YC8sc5zOWURtr2NO','Test','Owner','owner','2026-01-07 19:13:54','2026-01-07 19:13:54',0,NULL,NULL,NULL,NULL),(29,'owner_1767809651057@example.com',NULL,'$2b$12$hpTkSh3G9X10RtdRTY0nquBx40UliRjSM0MjA0B4Y9UMd1QKfB2QK','Test','Owner','owner','2026-01-07 19:14:11','2026-01-07 19:14:11',0,NULL,NULL,NULL,NULL),(30,'owner_1767809699053@example.com',NULL,'$2b$12$Mt2naeEPnDRsF0W5NAdnm.biv1nZnfdmlDN5.U9ng79cEs4PF481W','Test','Owner','owner','2026-01-07 19:14:59','2026-01-07 19:14:59',0,NULL,NULL,NULL,NULL),(31,'api.tester+6ymgu8f9@example.com',NULL,'$2b$12$yRhCTX/LvXaHCSjHUFVVIeo25f6aO5wdEcbE57O87rAi.KU4ux/ay','API','Tester','client','2026-01-07 19:38:12','2026-01-07 19:38:12',0,NULL,NULL,NULL,NULL),(32,'owner_1767811103986@example.com',NULL,'$2b$12$MzzN0Zz8.UlinHKwDKE0pebteWXtZTKseHQiWKI98I1DzJGKHtmxu','Test','Owner','owner','2026-01-07 19:38:24','2026-01-07 19:38:24',0,NULL,NULL,NULL,NULL),(33,'api.tester+hnk87n1v@example.com',NULL,'$2b$12$Epc3ZabaJS7MdxK4kR4CyufziGuNfKXtJAPSFvN22xDxz3OYw1Jqy','API','Tester','client','2026-01-07 19:39:19','2026-01-07 19:39:19',0,NULL,NULL,NULL,NULL),(34,'api.tester+tnali4d0@example.com',NULL,'$2b$12$dWzO8w2ivWNGxBLeTvKdAuh08Rkn.iY.GcGX6N8nmMM9nwbAjZQdq','API','Tester','owner','2026-01-07 19:39:32','2026-01-07 19:39:32',0,NULL,NULL,NULL,NULL),(35,'api.tester+prejbcdl@example.com',NULL,'$2b$12$D8iLeWXz.WD9CQPi2RTHs.3Sv2FUv2C2oiAKy1m9JvYXzQcpxMjim','API','Tester','owner','2026-01-07 19:39:43','2026-01-07 19:39:43',0,NULL,NULL,NULL,NULL),(36,'owner_1767811195006@example.com',NULL,'$2b$12$5NRnrleDn/w6jUjGCvQ9O.yCjS5vsse/rIcirN2uTgxJV8gM5R5DK','Test','Owner','owner','2026-01-07 19:39:55','2026-01-07 19:39:55',0,NULL,NULL,NULL,NULL),(37,'api.tester+p4lk2il1@example.com',NULL,'$2b$12$8vBnKNMa.iRZhEPxnOG.p.pYYdi0Hb9RxQLW11GnkjZRxNQO29Z7y','API','Tester','owner','2026-01-07 19:41:26','2026-01-07 19:41:26',0,NULL,NULL,NULL,NULL),(38,'owner_1767811298010@example.com',NULL,'$2b$12$wRqRtEbxfECacz8YzoFvQuphdNFkkFdW68dIB6CFBACWwi/M4.kl2','Test','Owner','owner','2026-01-07 19:41:38','2026-01-07 19:41:38',0,NULL,NULL,NULL,NULL),(39,'ui.tester+now@example.com',NULL,'$2b$12$KGxxDSde9QE.NkF6z560W.tIY3j3c.8Sl/494HTQyrWZYJyVoanV6','UI','Tester','client','2026-01-07 19:47:03','2026-01-07 19:47:03',0,NULL,NULL,NULL,NULL),(40,'bhm.x@live.com','+213562105687','$2b$12$Fvaljf/QEsB4UKuO4X83h./dPkFqVB1YKDSpcyxVtP3FZo1Trh4Yy','brahim','moulahoum','client','2026-01-07 19:48:10','2026-01-07 19:48:10',0,NULL,NULL,NULL,NULL),(41,'api.tester+4en9uanc@example.com',NULL,'$2b$12$rwJB3M/8.lh6Gzs.MWSHzOtaL2aEzTAXynJlfIxh6gtw76UK7AVgG','API','Tester','owner','2026-01-07 19:59:50','2026-01-07 19:59:50',0,NULL,NULL,NULL,NULL),(42,'owner_1767812401897@example.com',NULL,'$2b$12$PO6BaroY/EivXi/ARcXSq.uScifX1kZ9Zb.O03r11bQNz3guxBxiW','Test','Owner','owner','2026-01-07 20:00:02','2026-01-07 20:00:02',0,NULL,NULL,NULL,NULL),(43,'api.tester+g0b8b4lb@example.com',NULL,'$2b$12$kE3ZrguJUkoyLrVXdNf5PO3hLYYYYD8YubifOut/K7WcyNpvEjHWm','API','Tester','owner','2026-01-07 20:00:02','2026-01-07 20:00:02',0,NULL,NULL,NULL,NULL),(44,'api.tester+gkh7tkon@example.com',NULL,'$2b$12$FCegfHIZ58YeVCpYvxgasu1.SXxLHcCY70wwURSb.pi9ajqd9LgG2','API','Tester','owner','2026-01-07 20:00:07','2026-01-07 20:00:07',0,NULL,NULL,NULL,NULL),(45,'api.tester+2ddhl2mo@example.com',NULL,'$2b$12$TP3dgSZJ4MbPt1dOsa6XuOD3o95vBNpTqf1afhzi0gR9bQ3eeAlSe','API','Tester','owner','2026-01-07 20:00:12','2026-01-07 20:00:12',0,NULL,NULL,NULL,NULL),(46,'owner_1767812423146@example.com',NULL,'$2b$12$3BhyiAzwsJ2Fe71gYn4ar.M89sHt9E/byW7tZBnSMA7CgKwQ4UZ36','Test','Owner','owner','2026-01-07 20:00:23','2026-01-07 20:00:23',0,NULL,NULL,NULL,NULL),(47,'api.tester+258tfpnn@example.com',NULL,'$2b$12$TvDiAY3zldoJD7iod5/wyegkDtbyuhpS2rl4juo9PwUzm.NXz4TXS','API','Tester','owner','2026-01-07 20:00:24','2026-01-07 20:00:24',0,NULL,NULL,NULL,NULL),(48,'api.tester+cdsapzjj@example.com',NULL,'$2b$12$zpVQ21JHcPkN445twqz5Ke4RtstfX/n0dpeJFkgrUsd5tA7vRKzGK','API','Tester','owner','2026-01-07 20:00:29','2026-01-07 20:00:29',0,NULL,NULL,NULL,NULL),(49,'api.tester+26e92n3x@example.com',NULL,'$2b$12$Tx/9DCUy8H7YyEjlvG0zAeVOtswqaCgrQGOi2MfJhx87Rzf1BQggu','API','Tester','owner','2026-01-07 20:01:54','2026-01-07 20:01:54',0,NULL,NULL,NULL,NULL),(50,'owner_1767812524817@example.com',NULL,'$2b$12$RQq/4N6HxkIEimPKL5ksAOW3QjgRNe7PP1mDxKVq72gxiE3TSvYha','Test','Owner','owner','2026-01-07 20:02:05','2026-01-07 20:02:05',0,NULL,NULL,NULL,NULL),(51,'api.tester+z1vixfct@example.com',NULL,'$2b$12$bFpHT1xH/OwXBMbTk.fkk.qokOrbhVEL03Q5NGCY6YaTbEo2m2dHO','API','Tester','owner','2026-01-07 20:02:06','2026-01-07 20:02:06',0,NULL,NULL,NULL,NULL),(52,'owner_1767812547624@example.com',NULL,'$2b$12$jMGOHtPk1gBfZtLcpRa3TOetzINXHUU24BMPLOjExGmyY63Av5/Em','Test','Owner','owner','2026-01-07 20:02:28','2026-01-07 20:02:28',0,NULL,NULL,NULL,NULL),(53,'api.tester+mem1rz5l@example.com',NULL,'$2b$12$/Ma0hq2P7VEeqqqbvnMSnuGQlCst.poG2/Y.xTDjtu8ZclY/biQOe','API','Tester','owner','2026-01-07 20:02:29','2026-01-07 20:02:29',0,NULL,NULL,NULL,NULL),(54,'owner_1767812568012@example.com',NULL,'$2b$12$HIHRRI5BsF04BQ9f5xbhXOlb9mp68qSO1lZTTLfZMPiJPCHKQQLnS','Test','Owner','owner','2026-01-07 20:02:48','2026-01-07 20:02:48',0,NULL,NULL,NULL,NULL),(55,'api.tester+w6jszniv@example.com',NULL,'$2b$12$vTXm9KflyVG0JiCA/BnA1ek19IhgbNQalLhRGjOsn9zQvsqCaz1aW','API','Tester','owner','2026-01-07 20:02:49','2026-01-07 20:02:49',0,NULL,NULL,NULL,NULL),(56,'owner_1767812581241@example.com',NULL,'$2b$12$YIiMNRS7mbPpRreqZwDCmu2foWPaAH8kfRGlj/mfrwo2gDirRDJSm','Test','Owner','owner','2026-01-07 20:03:01','2026-01-07 20:03:01',0,NULL,NULL,NULL,NULL),(57,'api.tester+dt73bf97@example.com',NULL,'$2b$12$WA3PpKZwLKDliq/tTD8mZOrdH.z2MGYBAYIufVxeSzjIMQgEb.P8W','API','Tester','owner','2026-01-07 20:03:02','2026-01-07 20:03:02',0,NULL,NULL,NULL,NULL),(58,'owner_1767812596746@example.com',NULL,'$2b$12$l95whfnZ6DtA5I2BIosTGuGZpxszeLJqxQ5vahRPwHBSJ2FT2nQju','Test','Owner','owner','2026-01-07 20:03:17','2026-01-07 20:03:17',0,NULL,NULL,NULL,NULL),(59,'api.tester+jvabu0wq@example.com',NULL,'$2b$12$/uo3VRZ2EDM9J.ue9ycoOuNOKdJJhlrP5Oth5GayImxP/LvSXCsi2','API','Tester','owner','2026-01-07 20:03:17','2026-01-07 20:03:17',0,NULL,NULL,NULL,NULL),(60,'owner_1767812613386@example.com',NULL,'$2b$12$AywWN06SJq/Ei5kSqH02Bu/IQfVoHZemwkdDGesZEdzcNy2jxlY3u','Test','Owner','owner','2026-01-07 20:03:33','2026-01-07 20:03:33',0,NULL,NULL,NULL,NULL),(61,'api.tester+cs10r1mu@example.com',NULL,'$2b$12$jTWKgRE8it8bNCdDyg0PPOdA.fA61SljRQbk2.x/hf4fjThGtOjUW','API','Tester','owner','2026-01-07 20:04:51','2026-01-07 20:04:51',0,NULL,NULL,NULL,NULL),(62,'owner_1767812701304@example.com',NULL,'$2b$12$KduXXW7WuFdzxq86R2L9k.JtOuKBPDfsuOYx.ER4M1Atur.m8YJ3m','Test','Owner','owner','2026-01-07 20:05:01','2026-01-07 20:05:01',0,NULL,NULL,NULL,NULL),(63,'api.tester+s1cp7rlg@example.com',NULL,'$2b$12$r5RkAdXUJY5gCPKMUqQmbeUf8M9eTfrgsadGmUzfg8XObA5Y/GBBK','API','Tester','owner','2026-01-07 20:05:02','2026-01-07 20:05:02',0,NULL,NULL,NULL,NULL),(64,'owner_1767812719267@example.com',NULL,'$2b$12$DwpOUwG0s/wBru8xvuky0u1QPAVzVDzS9aJn57e6tHsMYRh/DFtt2','Test','Owner','owner','2026-01-07 20:05:19','2026-01-07 20:05:19',0,NULL,NULL,NULL,NULL),(65,'api.tester+7o07osqc@example.com',NULL,'$2b$12$VyNfzO6f7HU1p8jKHmRjaO.0nxQcvTA/w6w26mW812Vpa8u4hllvW','API','Tester','owner','2026-01-07 20:05:21','2026-01-07 20:05:21',0,NULL,NULL,NULL,NULL),(66,'owner_1767812734787@example.com',NULL,'$2b$12$jJOXTXd2ILxKfO369b03oO9gjvCr/hbybuVsr4vpB1fOEk72K57JS','Test','Owner','owner','2026-01-07 20:05:35','2026-01-07 20:05:35',0,NULL,NULL,NULL,NULL),(67,'api.tester+9p7aiouo@example.com',NULL,'$2b$12$m5tAAxYZvs.t/peqppIlJe0DhFvgqG5Pvm00Tq35DoVlC0VlykU4K','API','Tester','owner','2026-01-07 20:05:35','2026-01-07 20:05:35',0,NULL,NULL,NULL,NULL),(68,'owner_1767812748844@example.com',NULL,'$2b$12$LiAkPGfD0Q4m1ZT50yXmaeOdCHgCV3Zlb0cNs.W10mUxz6AH1xyBK','Test','Owner','owner','2026-01-07 20:05:49','2026-01-07 20:05:49',0,NULL,NULL,NULL,NULL),(69,'api.tester+48ahwwjr@example.com',NULL,'$2b$12$MTxP5fnubCCsrJun.XiIaOyn8kFPLNxbz9Sl6A7qodI2DlT.s8i2G','API','Tester','owner','2026-01-07 20:05:49','2026-01-07 20:05:49',0,NULL,NULL,NULL,NULL),(70,'api.tester+zl41g1nn@example.com',NULL,'$2b$12$8JeQXpk9HGFDHBdVrefw7.EnQcum7tiI38JG17I59dVXVcYEnIIyW','API','Tester','owner','2026-01-07 20:06:06','2026-01-07 20:06:06',0,NULL,NULL,NULL,NULL),(71,'owner_1767812765951@example.com',NULL,'$2b$12$ziZ28ITf.EfqjtuXnTcpLOxe/p/JqREXwR0d.i/QSV/oWY46kd35K','Test','Owner','owner','2026-01-07 20:06:06','2026-01-07 20:06:06',0,NULL,NULL,NULL,NULL),(72,'owner_1767812781329@example.com',NULL,'$2b$12$5wHh.kUpCL62ZwiniPey0.pGWrHBcWqRLLyMKhMO4wQOeHUU8mkR2','Test','Owner','owner','2026-01-07 20:06:21','2026-01-07 20:06:21',0,NULL,NULL,NULL,NULL),(73,'api.tester+iyhu06dw@example.com',NULL,'$2b$12$gACU8UioVqJc2aysjiKfF.QXtD58sdOxaHOAOw9WIZ2oNuQT/er0y','API','Tester','owner','2026-01-07 20:07:12','2026-01-07 20:07:12',0,NULL,NULL,NULL,NULL),(74,'owner_1767812843665@example.com',NULL,'$2b$12$/IM2phhQDXaPIl4XViDveOQCWJu2dp.0luNFP.f1hjU7Sp9tgrf9a','Test','Owner','owner','2026-01-07 20:07:23','2026-01-07 20:07:23',0,NULL,NULL,NULL,NULL),(75,'api.tester+w136b7m0@example.com',NULL,'$2b$12$y0XmuQHxrIfTJo4MScqA5OmnReDYj5iMAwzs7SkPlrHSiLAgOAwru','API','Tester','owner','2026-01-07 20:07:24','2026-01-07 20:07:24',0,NULL,NULL,NULL,NULL),(76,'owner_1767812862621@example.com',NULL,'$2b$12$hIqXZ78HYgnMREnIOSr.hupnuLFD6r/t7nQgTW5i5CJIiYyvACbpq','Test','Owner','owner','2026-01-07 20:07:42','2026-01-07 20:07:42',0,NULL,NULL,NULL,NULL),(77,'api.tester+ywv2wz5g@example.com',NULL,'$2b$12$dTK/Gf0x6a/r40X6nIFFV.5aBAueV865oxDWJGa8aSHm.3uQd4kqK','API','Tester','owner','2026-01-07 20:07:44','2026-01-07 20:07:44',0,NULL,NULL,NULL,NULL),(78,'owner_1767812879382@example.com',NULL,'$2b$12$3alqRnc6NI5ybP54uYt7F.oz34C4DRW8Jxc641/BEF2S/ib7uCtxC','Test','Owner','owner','2026-01-07 20:07:59','2026-01-07 20:07:59',0,NULL,NULL,NULL,NULL),(79,'api.tester+hszwpido@example.com',NULL,'$2b$12$4hIo9RbOmcJiUWt0NRZEYu.fFARxQePXB1gwxwIs28XMh2UloAsKe','API','Tester','owner','2026-01-07 20:08:01','2026-01-07 20:08:01',0,NULL,NULL,NULL,NULL),(80,'owner_1767812893485@example.com',NULL,'$2b$12$2eiAOZABfkicY7k0zu6nT.wMN/.pk4vDsp8IYVZ2Xmtv2vQzuy1ce','Test','Owner','owner','2026-01-07 20:08:13','2026-01-07 20:08:13',0,NULL,NULL,NULL,NULL),(81,'api.tester+s7gzu55h@example.com',NULL,'$2b$12$Qf11cT3alzv3jtZV2XhgEuDpvlzd3LJqTaGRyqVk01UH0rHFDSOrS','API','Tester','owner','2026-01-07 20:08:14','2026-01-07 20:08:14',0,NULL,NULL,NULL,NULL),(82,'owner_1767812910282@example.com',NULL,'$2b$12$cTAAheschxpsTF/lGFM3leiWcigtYnKIXIr52bpl8Mfv.c/KnMkLi','Test','Owner','owner','2026-01-07 20:08:30','2026-01-07 20:08:30',0,NULL,NULL,NULL,NULL),(83,'api.tester+gx5jnbhm@example.com',NULL,'$2b$12$Wcy.1VuKxxXmg3azIt36cu5qyN52lP/3VwZIdFDiL/zxUpQZc1wxG','API','Tester','owner','2026-01-07 20:08:31','2026-01-07 20:08:31',0,NULL,NULL,NULL,NULL),(84,'owner_1767812928998@example.com',NULL,'$2b$12$VDeAH130zMcy9/zYnpvOdeiRBJ4Ze5Jdlb248l0KUVWVY0gTUup9a','Test','Owner','owner','2026-01-07 20:08:49','2026-01-07 20:08:49',0,NULL,NULL,NULL,NULL),(85,'api.tester+77moqzcc@example.com',NULL,'$2b$12$56q40D6GgVrOoymLgjZduuT5L5e.ka1ztm3/XIbn0hSSr3OtyuIpy','API','Tester','owner','2026-01-07 20:09:12','2026-01-07 20:09:12',0,NULL,NULL,NULL,NULL),(86,'owner_1767812963624@example.com',NULL,'$2b$12$9JSnEae4SZublKytERcdPucpnyVObcRvuBIelIcVP6gipIHp40.3C','Test','Owner','owner','2026-01-07 20:09:23','2026-01-07 20:09:23',0,NULL,NULL,NULL,NULL),(87,'api.tester+rgb09v2d@example.com',NULL,'$2b$12$BHOWmv.wuhIpVArprwT1EutrX9uSH6uZkLEv1vlVHimo/lH5T/VuO','API','Tester','owner','2026-01-07 20:09:24','2026-01-07 20:09:24',0,NULL,NULL,NULL,NULL),(88,'owner_1767812983035@example.com',NULL,'$2b$12$QbKMRGvkLnYANS9jqlj90OZksiOJWivPVZ/xiMJiFui6QEKZnplje','Test','Owner','owner','2026-01-07 20:09:43','2026-01-07 20:09:43',0,NULL,NULL,NULL,NULL),(89,'api.tester+e2m3einv@example.com',NULL,'$2b$12$ps/AOrH3yKz30eQ6XouJeuPBbIRcu9SomEEW2AFmhxsg2QXnE6Wiq','API','Tester','owner','2026-01-07 20:09:44','2026-01-07 20:09:44',0,NULL,NULL,NULL,NULL),(90,'owner_1767813000230@example.com',NULL,'$2b$12$V4ACJI6j/hRwH0rqUMXRCuWdqvaTYuoTUcVoi1XMNCZn9AeuEU8UW','Test','Owner','owner','2026-01-07 20:10:00','2026-01-07 20:10:00',0,NULL,NULL,NULL,NULL),(91,'api.tester+pzbysote@example.com',NULL,'$2b$12$O1iJAgJXdMfrGBxY3HqKsO0PrGTtEbi.v4QEit.SCLpWHXOeXXS5q','API','Tester','owner','2026-01-07 20:10:01','2026-01-07 20:10:01',0,NULL,NULL,NULL,NULL),(92,'owner_1767813014568@example.com',NULL,'$2b$12$.th8YOwpWdLTfIZ/F14Gs.SCDdTJVhPsZ71kdJNg3yxySeuIw7PC6','Test','Owner','owner','2026-01-07 20:10:14','2026-01-07 20:10:14',0,NULL,NULL,NULL,NULL),(93,'api.tester+j34owvqg@example.com',NULL,'$2b$12$inksU4/0GKz1k4iUu0ZgbOWWjtpKfuTzTU.UvpeyYtlPeDphfeqcy','API','Tester','owner','2026-01-07 20:10:15','2026-01-07 20:10:15',0,NULL,NULL,NULL,NULL),(94,'owner_1767813031883@example.com',NULL,'$2b$12$wQQ3pQ04H7fRpytkAmd6guJe/.WiMgcdUb3sXC3Fg7m8noFEKTfdq','Test','Owner','owner','2026-01-07 20:10:32','2026-01-07 20:10:32',0,NULL,NULL,NULL,NULL),(95,'api.tester+u9lefba6@example.com',NULL,'$2b$12$dI7NzWZJWrRG5d6bd2dgmOezNVIlILW7ejLpwqket5nkwHGGZ/brW','API','Tester','owner','2026-01-07 20:10:32','2026-01-07 20:10:32',0,NULL,NULL,NULL,NULL),(96,'owner_1767813050637@example.com',NULL,'$2b$12$fFylx8Bco6Tg2u/ekjYvceOWm0FEoNM0/tGQc1NTdF5ob8hQuV0cW','Test','Owner','owner','2026-01-07 20:10:50','2026-01-07 20:10:50',0,NULL,NULL,NULL,NULL),(97,'api.tester+5lwsrvdz@example.com',NULL,'$2b$12$MRS0qhODFIoXAFJQMGsJJ.HHYDtVGC2k1A7hiOU50DbVe3t.pPx/.','API','Tester','owner','2026-01-07 20:12:30','2026-01-07 20:12:30',0,NULL,NULL,NULL,NULL),(98,'owner_1767813166640@example.com',NULL,'$2b$12$4HYU6JGWmOcuMtzLxrW/nOE25enm3qFfT/Q0NVZKqQGNqczBbD0cC','Test','Owner','owner','2026-01-07 20:12:46','2026-01-07 20:12:46',0,NULL,NULL,NULL,NULL),(99,'owner_1767815370961@example.com',NULL,'$2b$12$0xpAJsbJIsJt0ga0nElO6.EbHy8iei/fc3l26XdagiX3Jt59mtaA.','Test','Owner','owner','2026-01-07 20:49:31','2026-01-07 20:49:31',0,NULL,NULL,NULL,NULL),(100,'owner_1767815381784@example.com',NULL,'$2b$12$41YcqFSGx6VmI66Y3IxHqOWrI96qfyHb30PhPxhWFVexy3pMy7sim','Test','Owner','owner','2026-01-07 20:49:41','2026-01-07 20:49:41',0,NULL,NULL,NULL,NULL),(101,'owner_1767815412958@example.com',NULL,'$2b$12$4X4KQ2BFAajogRXQCLVH/.zDJJMIVrflixfFS2Qouhj.RrVmBUmxW','Test','Owner','owner','2026-01-07 20:50:13','2026-01-07 20:50:13',0,NULL,NULL,NULL,NULL),(102,'owner_1767815433928@example.com',NULL,'$2b$12$21fcXHvOX128tg6ioI0H0emz5cs9SUba8EIRZJSoVnIRXFtRAxg02','Test','Owner','owner','2026-01-07 20:50:34','2026-01-07 20:50:34',0,NULL,NULL,NULL,NULL),(103,'owner_1767815477596@example.com',NULL,'$2b$12$rNbEYM4tIyvV7/zLTqht5.49nZWM/YfJiTAVSUlNa.6jNYIODusmy','Test','Owner','owner','2026-01-07 20:51:17','2026-01-07 20:51:17',0,NULL,NULL,NULL,NULL),(104,'owner_1767815513437@example.com',NULL,'$2b$12$//xyD7O3gAXc10SsZWt6seZiR3OvCswDuFWLiBKdACRRKbySVUr4W','Test','Owner','owner','2026-01-07 20:51:53','2026-01-07 20:51:53',0,NULL,NULL,NULL,NULL),(105,'owner_1767815537596@example.com',NULL,'$2b$12$dYHLKiDmEWglkE2V4hBeQ.1gFqAsd0ZnmZh1X/bp0zRATv1fXffx6','Test','Owner','owner','2026-01-07 20:52:17','2026-01-07 20:52:17',0,NULL,NULL,NULL,NULL),(106,'owner_1767815554722@example.com',NULL,'$2b$12$n2tkuIrXdVQFIuvMtg8cVuoKRZ23Ls/3WSDC1k.LAbI9C5ngnbnd2','Test','Owner','owner','2026-01-07 20:52:34','2026-01-07 20:52:34',0,NULL,NULL,NULL,NULL),(107,'owner_1767815593547@example.com',NULL,'$2b$12$ZPt4N1HfAvU7MiI3fSALc.WIYRTSQwxTKEVML7jcspZftGhmBt7ai','Test','Owner','owner','2026-01-07 20:53:13','2026-01-07 20:53:13',0,NULL,NULL,NULL,NULL),(108,'owner_1767815650399@example.com',NULL,'$2b$12$YkNdaHrQ2eyz7jMD0ah.JukYnXnkBcZhG.o.nz3wC8U54njmFXpeS','Test','Owner','owner','2026-01-07 20:54:10','2026-01-07 20:54:10',0,NULL,NULL,NULL,NULL),(109,'owner_1767815768875@example.com',NULL,'$2b$12$XS4RaC34IAo1mhDd4LW2R.OM2eXLjZA2uNzABWI4PyMNGFw6CLPZe','Test','Owner','owner','2026-01-07 20:56:09','2026-01-07 20:56:09',0,NULL,NULL,NULL,NULL),(110,'owner_1767816219686@example.com',NULL,'$2b$12$VatLVb6wMlyZ.vLR8zuGPuMfpt27ccyO9dnDYcKuCfgxqeCZj16y6','Test','Owner','owner','2026-01-07 21:03:39','2026-01-07 21:03:39',0,NULL,NULL,NULL,NULL),(111,'owner_1767816236683@example.com',NULL,'$2b$12$ImCzrRwDXbdYd/mYGnQluuDydDqUdhieL8sVR9Tx8u4zupyQfRAyS','Test','Owner','owner','2026-01-07 21:03:56','2026-01-07 21:03:56',0,NULL,NULL,NULL,NULL),(112,'api.tester+9hpiq92k@example.com',NULL,'$2b$12$f4noLKkzzyTrBz4Dc1kxf.1t/66pAZM2vGTlLVPrIStDZeshMF8DS','API','Tester','owner','2026-01-07 21:05:56','2026-01-07 21:05:56',0,NULL,NULL,NULL,NULL),(113,'owner_1767816365651@example.com',NULL,'$2b$12$m3CQdd/Lf0kwNtTR/VF2veM.bBEpJWSPFgE3u1NjTgWLg41.YSswq','Test','Owner','owner','2026-01-07 21:06:05','2026-01-07 21:06:05',0,NULL,NULL,NULL,NULL),(114,'owner_1767816367056@example.com',NULL,'$2b$12$2.ZIixIJSvSR92O0bhj3buloagS.S08sD/y5tjC5NqkSYL01E0OcG','Test','Owner','owner','2026-01-07 21:06:07','2026-01-07 21:06:07',0,NULL,NULL,NULL,NULL),(115,'owner_1767816367205@example.com',NULL,'$2b$12$S1uRGUfv23UWxlkaKg8bdOp88cDbJNMPG6NJsI6dDjyALtAWfmxBW','Test','Owner','owner','2026-01-07 21:06:07','2026-01-07 21:06:07',0,NULL,NULL,NULL,NULL),(116,'api.tester+vvywds7y@example.com',NULL,'$2b$12$WanAHSdPj2wHi2L6WWaxfuLiDfVo5Q8ogwujlsGW6DnvvsC56SMCa','API','Tester','owner','2026-01-07 21:06:08','2026-01-07 21:06:08',0,NULL,NULL,NULL,NULL),(117,'owner_1767816382265@example.com',NULL,'$2b$12$BTOMj3qrQDGRSClqq8p/NOzVDcReAZp81.E32O5ZNeNIBSdSDp17a','Test','Owner','owner','2026-01-07 21:06:22','2026-01-07 21:06:22',0,NULL,NULL,NULL,NULL),(118,'owner_1767816384384@example.com',NULL,'$2b$12$x.9XeFy1OIURrXeRZp0odufErbSZIorT/fi6tQIuQjgwtyaor4pcK','Test','Owner','owner','2026-01-07 21:06:24','2026-01-07 21:06:24',0,NULL,NULL,NULL,NULL),(119,'owner_1767816384554@example.com',NULL,'$2b$12$VpvvgsvCUvn3uIOF1SDwuuy9fmik3zFKWtykdNTro0hVDvhTXMtSm','Test','Owner','owner','2026-01-07 21:06:24','2026-01-07 21:06:24',0,NULL,NULL,NULL,NULL),(120,'api.tester+u1db32tt@example.com',NULL,'$2b$12$R6RbzkNotXp0HHWSf6F4TuIQpAHirjiOZcxYt8f6TKAsCkuNiczwC','API','Tester','owner','2026-01-07 21:06:25','2026-01-07 21:06:25',0,NULL,NULL,NULL,NULL),(121,'owner_1767816398306@example.com',NULL,'$2b$12$NYBTokqMRlpl4dyby7PTA.2..GEFv9poIcoHMKKyHOCA9.UMqQNcS','Test','Owner','owner','2026-01-07 21:06:38','2026-01-07 21:06:38',0,NULL,NULL,NULL,NULL),(122,'owner_1767816399965@example.com',NULL,'$2b$12$6F0HbWeml7zCQREBrmoFGeLOGufGWihmI3LOMZNIIK/TTl7vbySa6','Test','Owner','owner','2026-01-07 21:06:40','2026-01-07 21:06:40',0,NULL,NULL,NULL,NULL),(123,'owner_1767816400513@example.com',NULL,'$2b$12$UJJ7eJKyfbNi8q8dCKpc6ODVqhi.GIMkXlLfIpmsPXF86JNUWoeo6','Test','Owner','owner','2026-01-07 21:06:40','2026-01-07 21:06:40',0,NULL,NULL,NULL,NULL),(124,'api.tester+d9nrr01c@example.com',NULL,'$2b$12$62MOQ3fE50ovp54fIx1tieUckbPtQorbpkiNdyrnEO22uPjq6/nCC','API','Tester','owner','2026-01-07 21:06:41','2026-01-07 21:06:41',0,NULL,NULL,NULL,NULL),(125,'owner_1767816411921@example.com',NULL,'$2b$12$7vqtdItybaultQaHF5EpD.zDyblZewWDP77hIjxkFD00DVjsqtlcO','Test','Owner','owner','2026-01-07 21:06:52','2026-01-07 21:06:52',0,NULL,NULL,NULL,NULL),(126,'owner_1767816413083@example.com',NULL,'$2b$12$wSsXz5/J2w8Y.CXgp9H88./em1rc3UjjAnUzGI2qdVhjmQirsGyiC','Test','Owner','owner','2026-01-07 21:06:53','2026-01-07 21:06:53',0,NULL,NULL,NULL,NULL),(127,'owner_1767816413121@example.com',NULL,'$2b$12$fMOS/j55S5meRizK0InieeH1pah5.OLLgDxDy1LEtjU5k74XVAraa','Test','Owner','owner','2026-01-07 21:06:53','2026-01-07 21:06:53',0,NULL,NULL,NULL,NULL),(128,'api.tester+iorzp479@example.com',NULL,'$2b$12$giFppHwTRsIc8zxI.FbPjeSn3vxGu2lknBioI/XB2nk04dq4eHpLO','API','Tester','owner','2026-01-07 21:06:55','2026-01-07 21:06:55',0,NULL,NULL,NULL,NULL),(129,'owner_1767816426864@example.com',NULL,'$2b$12$OScX2Z8wI96WCOYhjWUrb.4PONsnuus7H2u8KzJJWeHzRvngeest6','Test','Owner','owner','2026-01-07 21:07:07','2026-01-07 21:07:07',0,NULL,NULL,NULL,NULL),(130,'owner_1767816428357@example.com',NULL,'$2b$12$j7B.cvWlbIFPolmtKtDz4uP1gcqU5Vqbk8MGSpuGVKVbIYJQ/q9e2','Test','Owner','owner','2026-01-07 21:07:08','2026-01-07 21:07:08',0,NULL,NULL,NULL,NULL),(131,'owner_1767816429169@example.com',NULL,'$2b$12$Boug0..0fO/kBFOerGcmDOcxi0U.cyQjvInZI3.KVoiD0NYjZsavu','Test','Owner','owner','2026-01-07 21:07:09','2026-01-07 21:07:09',0,NULL,NULL,NULL,NULL),(132,'api.tester+tsxbcdbh@example.com',NULL,'$2b$12$teoqZhmacqW8ZCsGQh8Q5eLfyMytnU/56vA8L6v1KWugOHV/V4FNW','API','Tester','owner','2026-01-07 21:07:10','2026-01-07 21:07:10',0,NULL,NULL,NULL,NULL),(133,'owner_1767816443522@example.com',NULL,'$2b$12$TFyK0Eps1R.sTeCM/G0sCedZ7WJv1dXxCpAW6jI/mJPn7Q6ruLl1u','Test','Owner','owner','2026-01-07 21:07:23','2026-01-07 21:07:23',0,NULL,NULL,NULL,NULL),(134,'owner_1767816445075@example.com',NULL,'$2b$12$9F75HwBsu1pj495GXFNRwOMcQ1FX.H3cq9uj7LvKv8BjcgUo22bF2','Test','Owner','owner','2026-01-07 21:07:25','2026-01-07 21:07:25',0,NULL,NULL,NULL,NULL),(135,'owner_1767816446150@example.com',NULL,'$2b$12$2G032drDoJi91dc7tOayz.M0Vfgu77GOk4Cs4N7g07io6169mtTEm','Test','Owner','owner','2026-01-07 21:07:26','2026-01-07 21:07:26',0,NULL,NULL,NULL,NULL),(136,'owner_1767816617045@example.com',NULL,'$2b$12$5IR.bFyI.i2q45l35S/pZuJ.oM517vC8az2istaCRjWZCSa1K1nAi','Test','Owner','owner','2026-01-07 21:10:17','2026-01-07 21:10:17',0,NULL,NULL,NULL,NULL),(138,'owner_1767816617088@example.com',NULL,'$2b$12$5qtCtxQDJ7uV6ytn2bArV.FdfRNiZa/8BdXae2veiECc5pl30mzLy','Test','Owner','owner','2026-01-07 21:10:17','2026-01-07 21:10:17',0,NULL,NULL,NULL,NULL),(139,'owner_1767816894433@example.com',NULL,'$2b$12$/Le/dJhC9lrHtilssW36y.BBt1xMh6nELZyXh6P9kLkD7C.uO3R0S','Test','Owner','owner','2026-01-07 21:14:54','2026-01-07 21:14:54',0,NULL,NULL,NULL,NULL),(140,'owner_1767816959818@example.com',NULL,'$2b$12$Ouj7tpz4G25gb8Aol8dXZOg/01kyKZ51p/.Ai.2vvguFqzbR3gIh6','Test','Owner','owner','2026-01-07 21:16:00','2026-01-07 21:16:00',0,NULL,NULL,NULL,NULL),(141,'owner_1767816959909@example.com',NULL,'$2b$12$k5eFa2KzhuH0Gd2Z6z2fyOt0WdQwGyCuHpWPK5WZGjfNUTQfiSmM.','Test','Owner','owner','2026-01-07 21:16:00','2026-01-07 21:16:00',0,NULL,NULL,NULL,NULL),(142,'owner_1767816959907@example.com',NULL,'$2b$12$LR/Ns2yXwLE9Gn.4cgJM5eCJW56kOTBGbTbYK4a7J9osEQNBULIBa','Test','Owner','owner','2026-01-07 21:16:00','2026-01-07 21:16:00',0,NULL,NULL,NULL,NULL),(143,'owner_1767816968116@example.com',NULL,'$2b$12$9EFCWgwDT3hIWJ13SkBs1O21cVLTtpoDHAsOCJFNoLLD8UX5ciIQ6','Test','Owner','owner','2026-01-07 21:16:08','2026-01-07 21:16:08',0,NULL,NULL,NULL,NULL),(144,'owner_1767816968220@example.com',NULL,'$2b$12$dPed1MzK6f6gHodyblp5ZeGn6C1B79BwHbIsThXlww0WpmusUnU2m','Test','Owner','owner','2026-01-07 21:16:08','2026-01-07 21:16:08',0,NULL,NULL,NULL,NULL),(145,'owner_1767817009001@example.com',NULL,'$2b$12$ZCQFc8SgP6QM8TTvGB4ml.FVAHsId8xuyFQHltjn1wn2r1VAbCjlO','Test','Owner','owner','2026-01-07 21:16:49','2026-01-07 21:16:49',0,NULL,NULL,NULL,NULL),(146,'owner_1767817009010@example.com',NULL,'$2b$12$Ary970SheVUeMlXXJNeix.gpz3r/0q4LIwjAdVuSBoBGPPbMStPTO','Test','Owner','owner','2026-01-07 21:16:49','2026-01-07 21:16:49',0,NULL,NULL,NULL,NULL),(147,'owner_1767817015696@example.com',NULL,'$2b$12$TBxNMO3rfirXSeS6c/L9nuqM8bvHtEP8z/p9zIrqE8SrlwicNxEfa','Test','Owner','owner','2026-01-07 21:16:55','2026-01-07 21:16:55',0,NULL,NULL,NULL,NULL),(148,'owner_1767817016776@example.com',NULL,'$2b$12$tVSIwIKiiXlebOT/TTO3NeafyrDUP18IMW2ItNaKhVIJpYYbT.noW','Test','Owner','owner','2026-01-07 21:16:57','2026-01-07 21:16:57',0,NULL,NULL,NULL,NULL),(149,'api.tester+xfbrbt0q@example.com',NULL,'$2b$12$mAiSIJqJZXrkxuECBfOLgOgce9zMOxH3gSDXQM5v4.rHhsZIp3Usy','API','Tester','owner','2026-01-07 21:17:06','2026-01-07 21:17:06',0,NULL,NULL,NULL,NULL),(150,'owner_1767817035370@example.com',NULL,'$2b$12$wY/dyw612SdBI7Db/1fYBOM5zr7jliRr/NJToyBvYGeMKoNWfaklm','Test','Owner','owner','2026-01-07 21:17:15','2026-01-07 21:17:15',0,NULL,NULL,NULL,NULL),(151,'owner_1767817036553@example.com',NULL,'$2b$12$MWvV8VmEO6tr.vfKY3bO/.Ij3XyPEdVhOpxDoqhdhcE8KcYe4j5K.','Test','Owner','owner','2026-01-07 21:17:16','2026-01-07 21:17:16',0,NULL,NULL,NULL,NULL),(152,'owner_1767817036606@example.com',NULL,'$2b$12$qKcXq/5QmyP0S3BK.7ot5uKKgEaY2WZch4DNiEKA/CfWryYZU/JPC','Test','Owner','owner','2026-01-07 21:17:17','2026-01-07 21:17:17',0,NULL,NULL,NULL,NULL),(153,'api.tester+cxxxlszo@example.com',NULL,'$2b$12$DPDsCvONoTpH5GDjHHlxS.8SoEUlRNCnHcgQm.d7ioa06C4.EmGl2','API','Tester','owner','2026-01-07 21:17:18','2026-01-07 21:17:18',0,NULL,NULL,NULL,NULL),(154,'owner_1767817054240@example.com',NULL,'$2b$12$hefBnEIv8uma3JHhfD99mOwFas01.gzdwYV4CxjqX7wZ.xp2cWvjy','Test','Owner','owner','2026-01-07 21:17:34','2026-01-07 21:17:34',0,NULL,NULL,NULL,NULL),(155,'owner_1767817056294@example.com',NULL,'$2b$12$muZF8S1alS8WYlFIUF3yYO.MlAIX9fQHQ/1iM.7EbJQE1MxXgq7pG','Test','Owner','owner','2026-01-07 21:17:36','2026-01-07 21:17:36',0,NULL,NULL,NULL,NULL),(156,'owner_1767817056581@example.com',NULL,'$2b$12$ZnBb.9f.w9EQE4JNN0NYhOLclsMxMAyuqp9kY90a/1cGxuzr7pLqu','Test','Owner','owner','2026-01-07 21:17:36','2026-01-07 21:17:36',0,NULL,NULL,NULL,NULL),(157,'api.tester+2c8fv1zp@example.com',NULL,'$2b$12$VkG0fupxmXD45RhL2nYYpO1EStHVBzUhEyfPJJFWzOT0QSl5jJ/I.','API','Tester','owner','2026-01-07 21:17:37','2026-01-07 21:17:37',0,NULL,NULL,NULL,NULL),(158,'owner_1767817071357@example.com',NULL,'$2b$12$/tXk7WM2MnNwGhGQWZQjwOGLo.hk./alMxKbVbqywp8AQi0tTWwHm','Test','Owner','owner','2026-01-07 21:17:51','2026-01-07 21:17:51',0,NULL,NULL,NULL,NULL),(159,'owner_1767817073463@example.com',NULL,'$2b$12$C/ySUZpU70R5SWOgYIu2Q.ZNAJYKOJlKKliQrot7VRhsuTSk8gyXG','Test','Owner','owner','2026-01-07 21:17:53','2026-01-07 21:17:53',0,NULL,NULL,NULL,NULL),(160,'owner_1767817074446@example.com',NULL,'$2b$12$Z4Ghs.xF6UFEMcsf4yMdV.6SFvMZjRolFudHxuaP61zw1lJLvcDDi','Test','Owner','owner','2026-01-07 21:17:54','2026-01-07 21:17:54',0,NULL,NULL,NULL,NULL),(161,'api.tester+qvlq7r1s@example.com',NULL,'$2b$12$kZ..XzBR987mQtP39qUXJ.tPYLDsfcjOe4xVNWj6megqNOTaDwiVq','API','Tester','owner','2026-01-07 21:17:55','2026-01-07 21:17:55',0,NULL,NULL,NULL,NULL),(162,'owner_1767817086168@example.com',NULL,'$2b$12$EZIYY7iCPbZIdvqhFMrl1uZAwSCFI33sIYn9.PhC9spKJj7TmbdHa','Test','Owner','owner','2026-01-07 21:18:06','2026-01-07 21:18:06',0,NULL,NULL,NULL,NULL),(163,'owner_1767817087815@example.com',NULL,'$2b$12$0s0Ki/OGaEDgoWgzhdEw0.TYSvGKCveqoZUPe98N04BSpemDhIggm','Test','Owner','owner','2026-01-07 21:18:08','2026-01-07 21:18:08',0,NULL,NULL,NULL,NULL),(164,'owner_1767817087871@example.com',NULL,'$2b$12$MplnM7tIHZdu5vCqEWOvp./BZDVEyIcIqP4DDWY0eWLXy5Oeebeg6','Test','Owner','owner','2026-01-07 21:18:08','2026-01-07 21:18:08',0,NULL,NULL,NULL,NULL),(165,'api.tester+irjg4l7n@example.com',NULL,'$2b$12$vqwk0n.nL6CafDcozvEqbu7nLgwlJI6xazjx142KAV7rh0oNQLXMK','API','Tester','owner','2026-01-07 21:18:08','2026-01-07 21:18:08',0,NULL,NULL,NULL,NULL),(166,'owner_1767817102462@example.com',NULL,'$2b$12$u7vsSyHbZObwpoMdNK5JUuWyoELEOiM4K3.7a1WInNgnHUhIb1MBS','Test','Owner','owner','2026-01-07 21:18:22','2026-01-07 21:18:22',0,NULL,NULL,NULL,NULL),(167,'owner_1767817104072@example.com',NULL,'$2b$12$eOj8eZM3hRarVQVzM9gyMeeGEbVfKR2h9O4kyiw3OfNxB5zHmmEUW','Test','Owner','owner','2026-01-07 21:18:24','2026-01-07 21:18:24',0,NULL,NULL,NULL,NULL),(168,'owner_1767817104833@example.com',NULL,'$2b$12$DA9TMODkJMsQKsKE0ChwVOOOFm62Ur/XkjrmWIv5PGNwQrp6YeFlO','Test','Owner','owner','2026-01-07 21:18:25','2026-01-07 21:18:25',0,NULL,NULL,NULL,NULL),(169,'api.tester+8n64ne47@example.com',NULL,'$2b$12$Fk2gmpiEob4fLxB7reci5Oo32A0mOdVVAGF.rr27GFi68rggNURdG','API','Tester','owner','2026-01-07 21:18:25','2026-01-07 21:18:25',0,NULL,NULL,NULL,NULL),(170,'owner_1767817119562@example.com',NULL,'$2b$12$e3S0b3VW5UERMVgGsoMOG.suX9pmzMAaKcXJVbodn7NblAiXBKXuu','Test','Owner','owner','2026-01-07 21:18:39','2026-01-07 21:18:39',0,NULL,NULL,NULL,NULL),(171,'owner_1767817121954@example.com',NULL,'$2b$12$LZKICGge03xldBQU2JbtIu.2ln5s753X3eg6Jghq9mvZcN19elFZq','Test','Owner','owner','2026-01-07 21:18:42','2026-01-07 21:18:42',0,NULL,NULL,NULL,NULL),(172,'owner_1767817121975@example.com',NULL,'$2b$12$MCRza8LVmxc3RD1aWT38Y.UnwYD3WoQpkil4lkh5thJcmRc8Kcy0i','Test','Owner','owner','2026-01-07 21:18:42','2026-01-07 21:18:42',0,NULL,NULL,NULL,NULL);
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

-- Dump completed on 2026-01-08 13:33:14
