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
-- Table structure for table `payment_events`
--

DROP TABLE IF EXISTS `payment_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `gateway` varchar(20) NOT NULL,
  `txn_ref` varchar(64) NOT NULL,
  `gateway_txn_no` varchar(64) DEFAULT NULL,
  `event_type` varchar(20) NOT NULL,
  `signature_valid` tinyint NOT NULL,
  `result` varchar(20) NOT NULL,
  `raw_payload` json NOT NULL,
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_events_gateway_txn` (`gateway`,`gateway_txn_no`,`event_type`),
  KEY `idx_payment_events_created` (`created_at`),
  KEY `idx_payment_events_payment` (`payment_id`),
  CONSTRAINT `FK_829c2f9024093a7f56a239acd97` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_events`
--

LOCK TABLES `payment_events` WRITE;
/*!40000 ALTER TABLE `payment_events` DISABLE KEYS */;
INSERT INTO `payment_events` VALUES (1,'9c6f4ff7-549e-4e19-8b6b-c0d76f77f1b2','MOMO','PAY26000001','MOCK1794303753383','RETURN',1,'PROCESSED','\"{\\\"gateway\\\":\\\"MOMO\\\",\\\"txnRef\\\":\\\"PAY26000001\\\",\\\"gatewayTxnNo\\\":\\\"MOCK1794303753383\\\",\\\"amount\\\":1417500,\\\"success\\\":true,\\\"responseCode\\\":\\\"00\\\",\\\"signature\\\":\\\"dc6ecf2b49f2db9d3b3d376be03a48a69876b958e5142d471b9655d2be907c49\\\",\\\"eventType\\\":\\\"RETURN\\\"}\"','2026-11-10 16:42:33.401'),(2,'65427a51-32b9-4190-acb4-b6b80ec43780','MOMO','PAY26000002','MOCK1794303916969','RETURN',1,'PROCESSED','\"{\\\"gateway\\\":\\\"MOMO\\\",\\\"txnRef\\\":\\\"PAY26000002\\\",\\\"gatewayTxnNo\\\":\\\"MOCK1794303916969\\\",\\\"amount\\\":1417500,\\\"success\\\":true,\\\"responseCode\\\":\\\"00\\\",\\\"signature\\\":\\\"c16132a918abcf8823c3ae6ea60a63bfbcf1e6f40137141bbc4ddb218dc754b0\\\",\\\"eventType\\\":\\\"RETURN\\\"}\"','2026-11-10 16:45:16.990'),(3,'d0610797-b8b7-481c-b45a-471241df596b','MOMO','PAY26000003','MOCK1794375147792','RETURN',1,'PROCESSED','\"{\\\"gateway\\\":\\\"MOMO\\\",\\\"txnRef\\\":\\\"PAY26000003\\\",\\\"gatewayTxnNo\\\":\\\"MOCK1794375147792\\\",\\\"amount\\\":3367500,\\\"success\\\":true,\\\"responseCode\\\":\\\"00\\\",\\\"signature\\\":\\\"debf86df3558f00e558f1cec195d4a90c8c6d7af8574c450d017b8fe7432ed44\\\",\\\"eventType\\\":\\\"RETURN\\\"}\"','2026-11-11 12:32:27.812'),(4,'6f43afc6-e5e4-48d2-b324-96cb7d679a84','MOMO','PAY26000004','MOCK1794376203952','RETURN',1,'PROCESSED','\"{\\\"gateway\\\":\\\"MOMO\\\",\\\"txnRef\\\":\\\"PAY26000004\\\",\\\"gatewayTxnNo\\\":\\\"MOCK1794376203952\\\",\\\"amount\\\":1417500,\\\"success\\\":true,\\\"responseCode\\\":\\\"00\\\",\\\"signature\\\":\\\"2933972df00aa5a41460516f4569aabee95afcf4d5c7d627bb428feaf9a5a40a\\\",\\\"eventType\\\":\\\"RETURN\\\"}\"','2026-11-11 12:50:03.962'),(5,'bd2aff18-3cb9-4c4b-99e2-4c3dabddf571','MOMO','PAY26000005','MOCK1794376433215','RETURN',1,'PROCESSED','\"{\\\"gateway\\\":\\\"MOMO\\\",\\\"txnRef\\\":\\\"PAY26000005\\\",\\\"gatewayTxnNo\\\":\\\"MOCK1794376433215\\\",\\\"amount\\\":1417500,\\\"success\\\":true,\\\"responseCode\\\":\\\"00\\\",\\\"signature\\\":\\\"4dc10f1b0d9cc3d7034507e98fcc2fdd25e87eba493e342fcc65694a72deab67\\\",\\\"eventType\\\":\\\"RETURN\\\"}\"','2026-11-11 12:53:53.225'),(6,'b888266d-126c-4f68-bd85-b49a1f282acb','MOMO','PAY26000006','MOCK1794376662019','RETURN',1,'PROCESSED','\"{\\\"gateway\\\":\\\"MOMO\\\",\\\"txnRef\\\":\\\"PAY26000006\\\",\\\"gatewayTxnNo\\\":\\\"MOCK1794376662019\\\",\\\"amount\\\":3367500,\\\"success\\\":true,\\\"responseCode\\\":\\\"00\\\",\\\"signature\\\":\\\"1ba4038cc5ca15cbb7c690bc8c980cf6149e73ee7789a8f2cf13a8d7518efab6\\\",\\\"eventType\\\":\\\"RETURN\\\"}\"','2026-11-11 12:57:42.034'),(7,'854fd1f6-2c79-4c99-b6ee-431718094473','MOMO','PAY26000007','MOCK1794376754932','RETURN',1,'PROCESSED','\"{\\\"gateway\\\":\\\"MOMO\\\",\\\"txnRef\\\":\\\"PAY26000007\\\",\\\"gatewayTxnNo\\\":\\\"MOCK1794376754932\\\",\\\"amount\\\":2692500,\\\"success\\\":true,\\\"responseCode\\\":\\\"00\\\",\\\"signature\\\":\\\"522a2d3a68903563f6759b125afb0f7cca1c4bba9ea88dfe9e0f691a1318d370\\\",\\\"eventType\\\":\\\"RETURN\\\"}\"','2026-11-11 12:59:14.941'),(8,'0c4c7494-42ae-4949-a6ca-6b01f602362b','MOMO','PAY26000008','MOCK1794582565664','RETURN',1,'PROCESSED','\"{\\\"gateway\\\":\\\"MOMO\\\",\\\"txnRef\\\":\\\"PAY26000008\\\",\\\"gatewayTxnNo\\\":\\\"MOCK1794582565664\\\",\\\"amount\\\":2693250,\\\"success\\\":true,\\\"responseCode\\\":\\\"00\\\",\\\"signature\\\":\\\"868066f6b4254976f6f795554e68b521f415b6a682c5eb3b37c7d372c0824f68\\\",\\\"eventType\\\":\\\"RETURN\\\"}\"','2026-11-13 22:09:25.686'),(9,'ac63e380-e94c-472d-8287-3633b5c1574d','MOMO','PAY26000009','MOCK1794722208088','RETURN',1,'PROCESSED','\"{\\\"gateway\\\":\\\"MOMO\\\",\\\"txnRef\\\":\\\"PAY26000009\\\",\\\"gatewayTxnNo\\\":\\\"MOCK1794722208088\\\",\\\"amount\\\":1890000,\\\"success\\\":true,\\\"responseCode\\\":\\\"00\\\",\\\"signature\\\":\\\"7822fd9c74c82df637ad8a587d1d31cb6b9206071a77ae25bde34f3162782fbf\\\",\\\"eventType\\\":\\\"RETURN\\\"}\"','2026-11-15 12:56:48.111');
/*!40000 ALTER TABLE `payment_events` ENABLE KEYS */;
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
