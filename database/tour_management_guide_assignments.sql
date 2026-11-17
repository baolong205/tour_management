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
-- Table structure for table `guide_assignments`
--

DROP TABLE IF EXISTS `guide_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `guide_assignments` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `schedule_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `guide_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `assigned_by` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `note` text,
  PRIMARY KEY (`id`),
  KEY `idx_guide_assignments_guide_period` (`guide_id`,`status`,`period_start`),
  KEY `idx_guide_assignments_schedule` (`schedule_id`),
  KEY `FK_c406040dc55f4eeafa954155206` (`assigned_by`),
  CONSTRAINT `FK_0eb0693ca4c1da21f98e47a7c86` FOREIGN KEY (`guide_id`) REFERENCES `guide_profiles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_777e9dd910a8517df112d71053b` FOREIGN KEY (`schedule_id`) REFERENCES `departure_schedules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_c406040dc55f4eeafa954155206` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `guide_assignments`
--

LOCK TABLES `guide_assignments` WRITE;
/*!40000 ALTER TABLE `guide_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `guide_assignments` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-17 11:49:49
