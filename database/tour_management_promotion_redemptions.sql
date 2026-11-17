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
-- Table structure for table `promotion_redemptions`
--

DROP TABLE IF EXISTS `promotion_redemptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotion_redemptions` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `promotion_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `booking_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `customer_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `discount_amount` decimal(14,0) NOT NULL DEFAULT '0',
  `subtotal_at_use` decimal(14,0) NOT NULL DEFAULT '0',
  `status` varchar(20) NOT NULL DEFAULT 'RESERVED',
  `reserved_at` datetime(3) NOT NULL,
  `confirmed_at` datetime(3) DEFAULT NULL,
  `released_at` datetime(3) DEFAULT NULL,
  `release_reason` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_promotion_redemptions` (`promotion_id`,`booking_id`),
  KEY `idx_promotion_redemptions_customer` (`customer_id`,`status`),
  KEY `idx_promotion_redemptions_status` (`promotion_id`,`status`),
  KEY `FK_dccc0719a074504c80cddd0c7f3` (`booking_id`),
  CONSTRAINT `FK_39d64a2df33d0b8bc4341085416` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_dccc0719a074504c80cddd0c7f3` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotion_redemptions`
--

LOCK TABLES `promotion_redemptions` WRITE;
/*!40000 ALTER TABLE `promotion_redemptions` DISABLE KEYS */;
INSERT INTO `promotion_redemptions` VALUES ('0c7f4376-56a2-4769-9596-173a729fdff0','2026-11-13 22:09:16.935','2026-11-13 22:09:25.694','9678ff9c-20e9-4f85-b23d-eeee462ae7c1','f07c9d21-438f-4223-a26f-e26d79f7580c','e366fbee-3ab1-4241-87d7-b6eb09bceab2',141750,2835000,'CONFIRMED','2026-11-13 22:09:16.934','2026-11-13 22:09:25.693',NULL,NULL);
/*!40000 ALTER TABLE `promotion_redemptions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-17 11:49:48
