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
-- Table structure for table `tour_destinations`
--

DROP TABLE IF EXISTS `tour_destinations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tour_destinations` (
  `tour_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `destination_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`tour_id`,`destination_id`),
  KEY `idx_tour_destinations_destination` (`destination_id`),
  CONSTRAINT `FK_0827afe7c419abec07bd490d81d` FOREIGN KEY (`tour_id`) REFERENCES `tours` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_906bab0bf6b18ff6671a5cd5342` FOREIGN KEY (`destination_id`) REFERENCES `destinations` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tour_destinations`
--

LOCK TABLES `tour_destinations` WRITE;
/*!40000 ALTER TABLE `tour_destinations` DISABLE KEYS */;
INSERT INTO `tour_destinations` VALUES ('0ea37c53-eed2-4582-9c74-a4c15476ce68','6e0bf030-7507-4674-8463-11c6040c795b',0),('0ea37c53-eed2-4582-9c74-a4c15476ce68','92d14ae0-4672-483e-a6ac-20996dd22a7e',1),('0ea37c53-eed2-4582-9c74-a4c15476ce68','b11fbf9e-9f6a-4df0-8485-c8d28d9d9811',2),('0ea37c53-eed2-4582-9c74-a4c15476ce68','b8f5ffd4-fad6-47c3-8dd3-eca98f96fb1d',3),('4fdf289d-42e5-47f5-9228-00417e3ccdf5','3115955b-aacf-43f7-af89-d900a96a4804',0),('52a95074-8a23-4618-860a-0e91ea84726f','ad376146-7ea5-4011-a3d6-4b7ed89a5eeb',0),('8d3308ac-3767-4355-9b9f-24ca5267bd52','71284a76-859e-49b1-88a2-0282ed4c1883',0),('a9f34825-b730-402b-8347-462cbc4753e0','b7353f9a-e13a-4a86-bb85-90c3a2a9802b',1),('a9f34825-b730-402b-8347-462cbc4753e0','d16494a7-2a65-4e6b-9dae-a67f826b49b2',0),('eb9b1c60-dac3-41dc-9a89-8bc28bfa818d','39566ea4-2fe0-46c1-9b1b-3f1a116b0db5',0),('eb9b1c60-dac3-41dc-9a89-8bc28bfa818d','ddab9fab-fbf4-4388-856e-32a6a6b757a7',1);
/*!40000 ALTER TABLE `tour_destinations` ENABLE KEYS */;
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
