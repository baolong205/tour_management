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
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `google_id` varchar(64) DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `avatar_url` text,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING_VERIFY',
  `email_verified_at` datetime(3) DEFAULT NULL,
  `last_login_at` datetime(3) DEFAULT NULL,
  `failed_login_count` int NOT NULL DEFAULT '0',
  `locked_until` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_google_id` (`google_id`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('91dae977-4d89-46e6-93eb-0bd529c26543','2026-11-03 13:32:45.040','2026-11-16 10:29:32.306',NULL,'admin@tour.local','$2b$12$6CjdZ/acsJ9xFU6A77QPw.Iu3TxO1jJSCLbgKtlnKGPZPEq8Mf/4.',NULL,'Quản trị viên',NULL,NULL,'ACTIVE','2026-11-03 13:32:45.037','2026-11-16 10:29:32.304',0,NULL),('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','2026-11-03 14:30:28.759','2026-11-16 10:35:23.616',NULL,'demo-staff-21cf99eb@example.test','$2b$12$6CjdZ/acsJ9xFU6A77QPw.Iu3TxO1jJSCLbgKtlnKGPZPEq8Mf/4.',NULL,'Demo Staff',NULL,NULL,'ACTIVE',NULL,'2026-11-16 10:35:23.614',0,NULL),('e366fbee-3ab1-4241-87d7-b6eb09bceab2','2026-11-10 16:12:25.220','2026-11-16 22:57:43.966',NULL,'hoangdtntaluoi@gmail.com','$2b$12$nLsxXkeJJ2LZMqBUy.MCXu6k/MjN6DvHtzjsSX8qKL9/08fGZe93i',NULL,'Tran Ngoc Hoang','+84987180042',NULL,'ACTIVE',NULL,'2026-11-16 22:57:43.964',0,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
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
