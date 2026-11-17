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
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `booking_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tour_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `rating` tinyint unsigned NOT NULL,
  `comment` text,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `moderated_by` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_booking` (`booking_id`),
  UNIQUE KEY `REL_bbd6ac6e3e6a8f8c6e0e8692d6` (`booking_id`),
  KEY `idx_reviews_user` (`user_id`),
  KEY `idx_reviews_tour_status` (`tour_id`,`status`),
  KEY `FK_aa0cc85bea595654ce1ebfd24c3` (`moderated_by`),
  CONSTRAINT `FK_728447781a30bc3fcfe5c2f1cdf` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_aa0cc85bea595654ce1ebfd24c3` FOREIGN KEY (`moderated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_ad8f030e70663afeb8b9e3c325f` FOREIGN KEY (`tour_id`) REFERENCES `tours` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_bbd6ac6e3e6a8f8c6e0e8692d63` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-17 11:49:50
