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
-- Table structure for table `tour_categories`
--

DROP TABLE IF EXISTS `tour_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tour_categories` (
  `tour_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `category_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`tour_id`,`category_id`),
  KEY `IDX_8db618654792a1cfe57a229a81` (`tour_id`),
  KEY `IDX_87454b2e946918e81d78dc6ce6` (`category_id`),
  CONSTRAINT `FK_87454b2e946918e81d78dc6ce6b` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `FK_8db618654792a1cfe57a229a816` FOREIGN KEY (`tour_id`) REFERENCES `tours` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tour_categories`
--

LOCK TABLES `tour_categories` WRITE;
/*!40000 ALTER TABLE `tour_categories` DISABLE KEYS */;
INSERT INTO `tour_categories` VALUES ('0ea37c53-eed2-4582-9c74-a4c15476ce68','7b5d3150-d52a-46bb-9948-f8173d0ddef6'),('2cd9d21e-26f1-42d4-8a7d-1df5d2bf517a','c9834280-c42a-40e8-8b6f-f18c20d29b17'),('4fdf289d-42e5-47f5-9228-00417e3ccdf5','b22219aa-6e4c-485f-be2a-94445d3ae749'),('52a95074-8a23-4618-860a-0e91ea84726f','c9834280-c42a-40e8-8b6f-f18c20d29b17'),('53acc064-c496-4164-a7b0-daef677bce4a','c9834280-c42a-40e8-8b6f-f18c20d29b17'),('80f2277c-3ac2-402b-b575-67e73a0a3165','b22219aa-6e4c-485f-be2a-94445d3ae749'),('814fed76-a590-4146-a634-bb26e353caf3','9fd80c8b-0c8e-40b5-b568-ab8c98e59295'),('8b0b6e6b-6ed9-43e7-91f2-637233dde14d','7b5d3150-d52a-46bb-9948-f8173d0ddef6'),('8d3308ac-3767-4355-9b9f-24ca5267bd52','b22219aa-6e4c-485f-be2a-94445d3ae749'),('a9f34825-b730-402b-8347-462cbc4753e0','c9834280-c42a-40e8-8b6f-f18c20d29b17'),('ae2aece0-5df9-4e60-beab-d96cb4062c39','7b5d3150-d52a-46bb-9948-f8173d0ddef6'),('e37eabe6-5910-4e2d-a88e-f95883b57a80','b22219aa-6e4c-485f-be2a-94445d3ae749'),('e614d2b5-ce70-4ea7-9b93-e26b87f15c83','7b5d3150-d52a-46bb-9948-f8173d0ddef6'),('eae6d0f9-7082-45a3-84ee-5d0282a362d9','c9834280-c42a-40e8-8b6f-f18c20d29b17'),('eb9b1c60-dac3-41dc-9a89-8bc28bfa818d','7b5d3150-d52a-46bb-9948-f8173d0ddef6');
/*!40000 ALTER TABLE `tour_categories` ENABLE KEYS */;
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
