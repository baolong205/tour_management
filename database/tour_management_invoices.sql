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
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `booking_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `number` varchar(30) NOT NULL,
  `issued_at` datetime(3) NOT NULL,
  `pdf_url` text,
  `snapshot` json NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoices_number` (`number`),
  UNIQUE KEY `uq_invoices_booking` (`booking_id`),
  UNIQUE KEY `REL_ed9c7aa7846704bbcb648377e8` (`booking_id`),
  CONSTRAINT `FK_ed9c7aa7846704bbcb648377e8f` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES ('0f5a73a6-354a-49f5-bf32-3da3f9d631ca','2026-11-13 22:09:25.708','2026-11-13 22:09:25.708','f07c9d21-438f-4223-a26f-e26d79f7580c','INV2026-287D43162B194C22A224','2026-11-13 22:09:25.705',NULL,'\"{\\\"bookingCode\\\":\\\"BK260008\\\",\\\"promotionCode\\\":\\\"TOURGO5\\\",\\\"seller\\\":{\\\"name\\\":\\\"TourGo\\\",\\\"address\\\":\\\"\\\",\\\"email\\\":\\\"\\\",\\\"phone\\\":\\\"\\\"},\\\"payment\\\":{\\\"id\\\":\\\"0c4c7494-42ae-4949-a6ca-6b01f602362b\\\",\\\"method\\\":\\\"MOMO\\\",\\\"reference\\\":\\\"MOCK1794582565664\\\",\\\"paidAt\\\":\\\"2026-11-13T15:09:25.682Z\\\",\\\"amount\\\":2693250},\\\"customerName\\\":\\\"Tran Ngoc Hoang\\\",\\\"customerEmail\\\":\\\"hoangdtntaluoi@gmail.com\\\",\\\"customerPhone\\\":\\\"+84987180042\\\",\\\"tourName\\\":\\\"Ninh Bình – Tràng An: Về miền non nước\\\",\\\"startDate\\\":\\\"2026-11-22\\\",\\\"lines\\\":[{\\\"description\\\":\\\"Vé trẻ em\\\",\\\"quantity\\\":2,\\\"unitPrice\\\":1417500,\\\"amount\\\":2835000}],\\\"subtotal\\\":2835000,\\\"discount\\\":141750,\\\"total\\\":2693250}\"'),('3b5f7332-6dbc-4e8a-8498-76e44fb66b24','2026-11-11 12:59:14.959','2026-11-11 12:59:14.959','8dbe7a53-1df2-4535-8616-e9691331b48c','INV2026-092BA51F52114CD0A46D','2026-11-11 12:59:14.957',NULL,'\"{\\\"bookingCode\\\":\\\"BK260007\\\",\\\"promotionCode\\\":null,\\\"seller\\\":{\\\"name\\\":\\\"TourGo\\\",\\\"address\\\":\\\"\\\",\\\"email\\\":\\\"\\\",\\\"phone\\\":\\\"\\\"},\\\"payment\\\":{\\\"id\\\":\\\"854fd1f6-2c79-4c99-b6ee-431718094473\\\",\\\"method\\\":\\\"MOMO\\\",\\\"reference\\\":\\\"MOCK1794376754932\\\",\\\"paidAt\\\":\\\"2026-11-11T05:59:14.938Z\\\",\\\"amount\\\":2692500},\\\"customerName\\\":\\\"Tran Ngoc Hoang\\\",\\\"customerEmail\\\":\\\"hoangdtntaluoi@gmail.com\\\",\\\"customerPhone\\\":\\\"+84987180042\\\",\\\"tourName\\\":\\\"Hạ Long: Một đêm giữa miền kỳ quan\\\",\\\"startDate\\\":\\\"2026-11-21\\\",\\\"lines\\\":[{\\\"description\\\":\\\"Vé trẻ em\\\",\\\"quantity\\\":1,\\\"unitPrice\\\":2692500,\\\"amount\\\":2692500}],\\\"subtotal\\\":2692500,\\\"discount\\\":0,\\\"total\\\":2692500}\"'),('5e63c2c4-02bd-4403-a9ab-5691dcdeebab','2026-11-11 12:57:42.053','2026-11-11 12:57:42.053','399cfa8f-b57b-4759-9884-0783f6e806c6','INV2026-70EA6A1450FC49C7B109','2026-11-11 12:57:42.051',NULL,'\"{\\\"bookingCode\\\":\\\"BK260006\\\",\\\"promotionCode\\\":null,\\\"seller\\\":{\\\"name\\\":\\\"TourGo\\\",\\\"address\\\":\\\"\\\",\\\"email\\\":\\\"\\\",\\\"phone\\\":\\\"\\\"},\\\"payment\\\":{\\\"id\\\":\\\"b888266d-126c-4f68-bd85-b49a1f282acb\\\",\\\"method\\\":\\\"MOMO\\\",\\\"reference\\\":\\\"MOCK1794376662019\\\",\\\"paidAt\\\":\\\"2026-11-11T05:57:42.030Z\\\",\\\"amount\\\":3367500},\\\"customerName\\\":\\\"Tran Ngoc Hoang\\\",\\\"customerEmail\\\":\\\"hoangdtntaluoi@gmail.com\\\",\\\"customerPhone\\\":\\\"+84987180042\\\",\\\"tourName\\\":\\\"Phú Quốc: Chạm vào mùa biển xanh\\\",\\\"startDate\\\":\\\"2026-11-18\\\",\\\"lines\\\":[{\\\"description\\\":\\\"Vé trẻ em\\\",\\\"quantity\\\":1,\\\"unitPrice\\\":3367500,\\\"amount\\\":3367500}],\\\"subtotal\\\":3367500,\\\"discount\\\":0,\\\"total\\\":3367500}\"'),('5edcd957-cb67-4471-bf5f-57589fbd97a2','2026-11-10 16:45:17.014','2026-11-10 16:45:17.014','42762754-7ba7-4ae3-8aed-db0a41bc475f','INV2026-7D4532FD71834F7BB26F','2026-11-10 16:45:17.010',NULL,'\"{\\\"bookingCode\\\":\\\"BK260002\\\",\\\"promotionCode\\\":null,\\\"seller\\\":{\\\"name\\\":\\\"TourGo\\\",\\\"address\\\":\\\"\\\",\\\"email\\\":\\\"\\\",\\\"phone\\\":\\\"\\\"},\\\"payment\\\":{\\\"id\\\":\\\"65427a51-32b9-4190-acb4-b6b80ec43780\\\",\\\"method\\\":\\\"MOMO\\\",\\\"reference\\\":\\\"MOCK1794303916969\\\",\\\"paidAt\\\":\\\"2026-11-10T09:45:16.981Z\\\",\\\"amount\\\":1417500},\\\"customerName\\\":\\\"Tran Ngoc Hoang\\\",\\\"customerEmail\\\":\\\"hoangdtntaluoi@gmail.com\\\",\\\"customerPhone\\\":\\\"+84987180042\\\",\\\"tourName\\\":\\\"Ninh Bình – Tràng An: Về miền non nước\\\",\\\"startDate\\\":\\\"2026-11-22\\\",\\\"lines\\\":[{\\\"description\\\":\\\"Vé trẻ em\\\",\\\"quantity\\\":1,\\\"unitPrice\\\":1417500,\\\"amount\\\":1417500}],\\\"subtotal\\\":1417500,\\\"discount\\\":0,\\\"total\\\":1417500}\"'),('8e1bfb1e-f383-4e22-96a0-f4770a909709','2026-11-10 16:42:33.422','2026-11-10 16:42:33.422','1519b12f-c0c1-4510-b13d-a7cd7a0154ea','INV2026-A67037C10ADE492BBF10','2026-11-10 16:42:33.418',NULL,'\"{\\\"bookingCode\\\":\\\"BK260001\\\",\\\"promotionCode\\\":null,\\\"seller\\\":{\\\"name\\\":\\\"TourGo\\\",\\\"address\\\":\\\"\\\",\\\"email\\\":\\\"\\\",\\\"phone\\\":\\\"\\\"},\\\"payment\\\":{\\\"id\\\":\\\"9c6f4ff7-549e-4e19-8b6b-c0d76f77f1b2\\\",\\\"method\\\":\\\"MOMO\\\",\\\"reference\\\":\\\"MOCK1794303753383\\\",\\\"paidAt\\\":\\\"2026-11-10T09:42:33.399Z\\\",\\\"amount\\\":1417500},\\\"customerName\\\":\\\"Tran Ngoc Hoang\\\",\\\"customerEmail\\\":\\\"hoangdtntaluoi@gmail.com\\\",\\\"customerPhone\\\":\\\"+84987180042\\\",\\\"tourName\\\":\\\"Ninh Bình – Tràng An: Về miền non nước\\\",\\\"startDate\\\":\\\"2026-11-22\\\",\\\"lines\\\":[{\\\"description\\\":\\\"Vé trẻ em\\\",\\\"quantity\\\":1,\\\"unitPrice\\\":1417500,\\\"amount\\\":1417500}],\\\"subtotal\\\":1417500,\\\"discount\\\":0,\\\"total\\\":1417500}\"'),('8ed0133c-1db8-493d-a3ca-1eca54086b30','2026-11-11 12:50:03.982','2026-11-11 12:50:03.982','687f40b0-5407-4859-b5ad-f79f3c636e12','INV2026-62C3E74EC41E409AA9B7','2026-11-11 12:50:03.978',NULL,'\"{\\\"bookingCode\\\":\\\"BK260004\\\",\\\"promotionCode\\\":null,\\\"seller\\\":{\\\"name\\\":\\\"TourGo\\\",\\\"address\\\":\\\"\\\",\\\"email\\\":\\\"\\\",\\\"phone\\\":\\\"\\\"},\\\"payment\\\":{\\\"id\\\":\\\"6f43afc6-e5e4-48d2-b324-96cb7d679a84\\\",\\\"method\\\":\\\"MOMO\\\",\\\"reference\\\":\\\"MOCK1794376203952\\\",\\\"paidAt\\\":\\\"2026-11-11T05:50:03.958Z\\\",\\\"amount\\\":1417500},\\\"customerName\\\":\\\"Tran Ngoc Hoang\\\",\\\"customerEmail\\\":\\\"hoangdtntaluoi@gmail.com\\\",\\\"customerPhone\\\":\\\"+84987180042\\\",\\\"tourName\\\":\\\"Ninh Bình – Tràng An: Về miền non nước\\\",\\\"startDate\\\":\\\"2026-11-22\\\",\\\"lines\\\":[{\\\"description\\\":\\\"Vé trẻ em\\\",\\\"quantity\\\":1,\\\"unitPrice\\\":1417500,\\\"amount\\\":1417500}],\\\"subtotal\\\":1417500,\\\"discount\\\":0,\\\"total\\\":1417500}\"'),('b8458ad3-183c-4029-b666-3c1d6b970e9e','2026-11-11 12:32:27.834','2026-11-11 12:32:27.834','5f7e3478-5dfc-42c5-8014-b977d6f45ed5','INV2026-FDE40B1E162346A7AE2A','2026-11-11 12:32:27.831',NULL,'\"{\\\"bookingCode\\\":\\\"BK260003\\\",\\\"promotionCode\\\":null,\\\"seller\\\":{\\\"name\\\":\\\"TourGo\\\",\\\"address\\\":\\\"\\\",\\\"email\\\":\\\"\\\",\\\"phone\\\":\\\"\\\"},\\\"payment\\\":{\\\"id\\\":\\\"d0610797-b8b7-481c-b45a-471241df596b\\\",\\\"method\\\":\\\"MOMO\\\",\\\"reference\\\":\\\"MOCK1794375147792\\\",\\\"paidAt\\\":\\\"2026-11-11T05:32:27.808Z\\\",\\\"amount\\\":3367500},\\\"customerName\\\":\\\"Tran Ngoc Hoang\\\",\\\"customerEmail\\\":\\\"hoangdtntaluoi@gmail.com\\\",\\\"customerPhone\\\":\\\"+84987180042\\\",\\\"tourName\\\":\\\"Phú Quốc: Chạm vào mùa biển xanh\\\",\\\"startDate\\\":\\\"2026-11-18\\\",\\\"lines\\\":[{\\\"description\\\":\\\"Vé trẻ em\\\",\\\"quantity\\\":1,\\\"unitPrice\\\":3367500,\\\"amount\\\":3367500}],\\\"subtotal\\\":3367500,\\\"discount\\\":0,\\\"total\\\":3367500}\"'),('dc588c83-3f4d-49b4-b75b-aaaced79e907','2026-11-15 12:56:48.153','2026-11-15 12:56:48.153','ebf6cffa-d947-4a02-b05b-c401198d8645','INV2026-3D2846CB440F4C81A076','2026-11-15 12:56:48.149',NULL,'\"{\\\"bookingCode\\\":\\\"BK260009\\\",\\\"promotionCode\\\":null,\\\"seller\\\":{\\\"name\\\":\\\"TourGo\\\",\\\"address\\\":\\\"\\\",\\\"email\\\":\\\"\\\",\\\"phone\\\":\\\"\\\"},\\\"payment\\\":{\\\"id\\\":\\\"ac63e380-e94c-472d-8287-3633b5c1574d\\\",\\\"method\\\":\\\"MOMO\\\",\\\"reference\\\":\\\"MOCK1794722208088\\\",\\\"paidAt\\\":\\\"2026-11-15T05:56:48.108Z\\\",\\\"amount\\\":1890000},\\\"customerName\\\":\\\"Tran Ngoc Hoang\\\",\\\"customerEmail\\\":\\\"hoangdtntaluoi@gmail.com\\\",\\\"customerPhone\\\":\\\"+84987180042\\\",\\\"tourName\\\":\\\"Ninh Bình – Tràng An: Về miền non nước\\\",\\\"startDate\\\":\\\"2026-11-22\\\",\\\"lines\\\":[{\\\"description\\\":\\\"Vé người lớn\\\",\\\"quantity\\\":1,\\\"unitPrice\\\":1890000,\\\"amount\\\":1890000}],\\\"subtotal\\\":1890000,\\\"discount\\\":0,\\\"total\\\":1890000}\"'),('fc581407-e184-4102-a603-d2b166e253e0','2026-11-11 12:53:53.244','2026-11-11 12:53:53.244','c62f0869-cf1c-4088-859a-057d5eb1d16b','INV2026-D1FC1E49D0C34D899B91','2026-11-11 12:53:53.241',NULL,'\"{\\\"bookingCode\\\":\\\"BK260005\\\",\\\"promotionCode\\\":null,\\\"seller\\\":{\\\"name\\\":\\\"TourGo\\\",\\\"address\\\":\\\"\\\",\\\"email\\\":\\\"\\\",\\\"phone\\\":\\\"\\\"},\\\"payment\\\":{\\\"id\\\":\\\"bd2aff18-3cb9-4c4b-99e2-4c3dabddf571\\\",\\\"method\\\":\\\"MOMO\\\",\\\"reference\\\":\\\"MOCK1794376433215\\\",\\\"paidAt\\\":\\\"2026-11-11T05:53:53.221Z\\\",\\\"amount\\\":1417500},\\\"customerName\\\":\\\"Tran Ngoc Hoang\\\",\\\"customerEmail\\\":\\\"hoangdtntaluoi@gmail.com\\\",\\\"customerPhone\\\":\\\"+84987180042\\\",\\\"tourName\\\":\\\"Ninh Bình – Tràng An: Về miền non nước\\\",\\\"startDate\\\":\\\"2026-12-06\\\",\\\"lines\\\":[{\\\"description\\\":\\\"Vé trẻ em\\\",\\\"quantity\\\":1,\\\"unitPrice\\\":1417500,\\\"amount\\\":1417500}],\\\"subtotal\\\":1417500,\\\"discount\\\":0,\\\"total\\\":1417500}\"');
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
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
