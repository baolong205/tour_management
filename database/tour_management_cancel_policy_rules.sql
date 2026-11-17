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
-- Table structure for table `cancel_policy_rules`
--

DROP TABLE IF EXISTS `cancel_policy_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cancel_policy_rules` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `policy_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `days_before` int unsigned NOT NULL,
  `fee_percent` tinyint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cancel_policy_rules_policy_days` (`policy_id`,`days_before`),
  CONSTRAINT `FK_d2ab3a826710b8fe547fcdcb2b5` FOREIGN KEY (`policy_id`) REFERENCES `cancel_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cancel_policy_rules`
--

LOCK TABLES `cancel_policy_rules` WRITE;
/*!40000 ALTER TABLE `cancel_policy_rules` DISABLE KEYS */;
INSERT INTO `cancel_policy_rules` VALUES ('00f4100f-1caf-4161-8fad-e6206dd33396','2026-11-03 13:35:59.793','2026-11-03 13:35:59.793','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',3,50),('b7a843d5-8844-434c-9aa2-13a2429c0ca8','2026-11-03 13:35:59.794','2026-11-03 13:35:59.794','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0,100),('d7ba9d56-8325-4551-875f-8dfedf30d487','2026-11-03 13:35:59.792','2026-11-03 13:35:59.792','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',7,30),('da0a549f-fa6a-4bf0-8124-5285285c778f','2026-11-03 13:35:59.791','2026-11-03 13:35:59.791','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',14,0);
/*!40000 ALTER TABLE `cancel_policy_rules` ENABLE KEYS */;
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
