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
-- Table structure for table `tour_images`
--

DROP TABLE IF EXISTS `tour_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tour_images` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `tour_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `url` text NOT NULL,
  `public_id` varchar(255) DEFAULT NULL,
  `is_cover` tinyint NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_tour_images_tour` (`tour_id`),
  CONSTRAINT `FK_1a71ebe72121098dfcc2188ce4e` FOREIGN KEY (`tour_id`) REFERENCES `tours` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tour_images`
--

LOCK TABLES `tour_images` WRITE;
/*!40000 ALTER TABLE `tour_images` DISABLE KEYS */;
INSERT INTO `tour_images` VALUES ('1534e014-7426-4bea-babf-3c2ed9f72f4e','2026-11-17 11:40:54.636','2026-11-17 11:40:54.636','e614d2b5-ce70-4ea7-9b93-e26b87f15c83','/uploads/tours/demo/moc-chau-0215fcc45a1f.jpg','demo-pexels-ID_MC',1,0),('24c89140-ac20-4c07-8741-a6ccf361ba67','2026-11-03 13:36:06.737','2026-11-03 13:36:06.737','eb9b1c60-dac3-41dc-9a89-8bc28bfa818d','/uploads/tours/demo/sa-pa-619f7a81419f.jpg','demo-pexels-36754846',1,0),('32bc53af-9e17-455e-8e83-859a432e8151','2026-11-17 11:40:54.642','2026-11-17 11:40:54.642','e37eabe6-5910-4e2d-a88e-f95883b57a80','/uploads/tours/demo/con-dao-91d1707d6d7f.jpg','demo-pexels-ID_CD',1,0),('39f25737-2aa7-4edb-afe9-0f215a3ef518','2026-11-03 13:36:06.740','2026-11-03 13:36:06.740','8d3308ac-3767-4355-9b9f-24ca5267bd52','/uploads/tours/demo/da-lat-9475d4113bd0.jpg','demo-pexels-35731527',1,0),('450cd706-c13a-42ee-9e63-fa168b73a4df','2026-11-03 13:36:06.743','2026-11-03 13:36:06.743','52a95074-8a23-4618-860a-0e91ea84726f','/uploads/tours/demo/ha-long-db26988ba7f6.jpg','demo-pexels-7276642',1,0),('45853452-bf14-43f9-97a1-c14d41fddbaa','2026-11-17 11:40:54.620','2026-11-17 11:40:54.620','2cd9d21e-26f1-42d4-8a7d-1df5d2bf517a','/uploads/tours/demo/nha-trang-23bd26ce1e92.jpg','demo-pexels-ID_NT',1,0),('5656270b-fa6d-448a-a3c7-38201b45b68b','2026-11-17 11:40:54.645','2026-11-17 11:40:54.645','ae2aece0-5df9-4e60-beab-d96cb4062c39','/uploads/tours/demo/phong-nha-95af9c623dfd.jpg','demo-pexels-ID_PN',1,0),('5bc3f9d5-cdde-4615-9e71-58c84a21047b','2026-11-03 13:36:06.728','2026-11-03 13:36:06.728','a9f34825-b730-402b-8347-462cbc4753e0','/uploads/tours/demo/hoi-an-5c0bace19cef.jpg','demo-pexels-4695913',1,0),('6da4a11a-c90c-47fb-9c15-fc63418a879f','2026-11-17 11:40:54.632','2026-11-17 11:40:54.632','814fed76-a590-4146-a634-bb26e353caf3','/uploads/tours/demo/can-tho-90cd7017e5d1.jpg','demo-pexels-ID_CT',1,0),('81b93145-e8ae-453e-9fd3-5ff123ba7751','2026-11-17 11:40:54.625','2026-11-17 11:40:54.625','53acc064-c496-4164-a7b0-daef677bce4a','/uploads/tours/demo/hue-70ed9aecca71.jpg','demo-pexels-ID_HUE',1,0),('90c092e2-0072-4fe5-b084-9bb203acf374','2026-11-03 13:36:06.745','2026-11-03 13:36:06.745','0ea37c53-eed2-4582-9c74-a4c15476ce68','/uploads/tours/demo/ninh-binh-27a5441039ca.jpg','demo-pexels-30280829',1,0),('9231c9dc-d741-455f-b4e5-6590977ab8bc','2026-11-03 13:36:06.734','2026-11-03 13:36:06.734','4fdf289d-42e5-47f5-9228-00417e3ccdf5','/uploads/tours/demo/phu-quoc-66830adb0bcf.jpg','demo-pexels-4603354',1,0),('a51280d8-93b4-4aaf-9c30-f77d5abc40c5','2026-11-17 11:40:54.629','2026-11-17 11:40:54.629','eae6d0f9-7082-45a3-84ee-5d0282a362d9','/uploads/tours/demo/quy-nhon-3ea569fae1a9.jpg','demo-pexels-ID_QN',1,0),('c1e88f79-267b-4926-885c-e4364827036b','2026-11-17 11:40:54.639','2026-11-17 11:40:54.639','8b0b6e6b-6ed9-43e7-91f2-637233dde14d','/uploads/tours/demo/ha-giang-cd041492425d.jpg','demo-pexels-ID_HG',1,0),('f3a55939-b975-426b-a667-dfef358b7b11','2026-11-17 11:40:54.648','2026-11-17 11:40:54.648','80f2277c-3ac2-402b-b575-67e73a0a3165','/uploads/tours/demo/mui-ne-ac3050d98b9d.jpg','demo-pexels-ID_MN',1,0);
/*!40000 ALTER TABLE `tour_images` ENABLE KEYS */;
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
