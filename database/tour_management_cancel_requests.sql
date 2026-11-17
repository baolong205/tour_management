-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: tour_management
-- ------------------------------------------------------
-- Server version	8.4.7

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
-- Table structure for table `cancel_requests`
--

DROP TABLE IF EXISTS `cancel_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cancel_requests` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `booking_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `requested_by` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `reason` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `fee_percent` tinyint unsigned NOT NULL,
  `fee_amount` decimal(14,0) NOT NULL,
  `refund_amount` decimal(14,0) NOT NULL,
  `policy_snapshot` json NOT NULL,
  `processed_by` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `processed_at` datetime(3) DEFAULT NULL,
  `reject_reason` text,
  PRIMARY KEY (`id`),
  KEY `idx_cancel_requests_status` (`booking_id`,`status`),
  KEY `idx_cancel_requests_booking` (`booking_id`),
  KEY `FK_a02df5aab78ef4e61f5384220ed` (`requested_by`),
  KEY `FK_c92ffe3b307b421b34af3815151` (`processed_by`),
  CONSTRAINT `FK_226a3464da05fc5400b27c46d96` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_a02df5aab78ef4e61f5384220ed` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_c92ffe3b307b421b34af3815151` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cancel_requests`
--

LOCK TABLES `cancel_requests` WRITE;
/*!40000 ALTER TABLE `cancel_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `cancel_requests` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-17 11:49:51
