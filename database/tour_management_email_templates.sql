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
-- Table structure for table `email_templates`
--

DROP TABLE IF EXISTS `email_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_templates` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `code` varchar(60) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body_html` longtext NOT NULL,
  `active` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email_templates_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_templates`
--

LOCK TABLES `email_templates` WRITE;
/*!40000 ALTER TABLE `email_templates` DISABLE KEYS */;
INSERT INTO `email_templates` VALUES ('31deec1c-50ec-4d51-a36b-fc71bfea8856','2026-11-10 15:48:50.225','2026-11-10 15:48:50.225','BOOKING_CONFIRMED','Đơn {{bookingCode}} đã được xác nhận – {{tourName}}','<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172b38\">\n<h1 style=\"font-size:22px;color:#086b77\">Đơn đặt tour đã được xác nhận</h1>\n<p>Xin chào <strong>{{contactName}}</strong>,</p>\n<p>Đơn <strong>{{bookingCode}}</strong> của bạn đã được TourGo xác nhận. Vui lòng có mặt đúng giờ tại điểm hẹn.</p>\n<table style=\"width:100%;border-collapse:collapse;margin:16px 0\">\n<tr><td style=\"padding:6px 0;color:#586b78\">Tour</td><td style=\"text-align:right\">{{tourName}}</td></tr>\n<tr><td style=\"padding:6px 0;color:#586b78\">Khởi hành</td><td style=\"text-align:right\">{{startDate}} – {{endDate}}</td></tr>\n<tr><td style=\"padding:6px 0;color:#586b78\">Điểm hẹn</td><td style=\"text-align:right\">{{meetingPoint}}</td></tr>\n<tr><td style=\"padding:6px 0;color:#586b78\">Số chỗ</td><td style=\"text-align:right\">{{seatCount}}</td></tr>\n<tr><td style=\"padding:6px 0;color:#586b78\">Tổng tiền</td><td style=\"text-align:right\"><strong>{{total}}</strong></td></tr>\n<tr><td style=\"padding:6px 0;color:#586b78\">Xác nhận lúc</td><td style=\"text-align:right\">{{confirmedAt}}</td></tr>\n</table>\n<h2 style=\"font-size:15px\">Hành khách</h2>\n{{{passengerList}}}\n<p>Cảm ơn bạn đã tin tưởng TourGo. Chúc bạn có một chuyến đi thật vui vẻ!</p>\n<p style=\"color:#586b78;font-size:12px\">Email gửi tự động tới {{contactEmail}}.</p>\n</div>',1),('c997a448-f117-4321-b02f-0b268dc81cbc','2026-11-10 15:48:50.215','2026-11-10 15:48:50.215','BOOKING_CREATED','Đã ghi nhận đơn {{bookingCode}} – {{tourName}}','<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172b38\">\n<h1 style=\"font-size:22px;color:#086b77\">Đơn đặt tour đã được ghi nhận</h1>\n<p>Xin chào <strong>{{contactName}}</strong>,</p>\n<p>TourGo đã ghi nhận đơn <strong>{{bookingCode}}</strong> của bạn.</p>\n<table style=\"width:100%;border-collapse:collapse;margin:16px 0\">\n<tr><td style=\"padding:6px 0;color:#586b78\">Tour</td><td style=\"text-align:right\">{{tourName}}</td></tr>\n<tr><td style=\"padding:6px 0;color:#586b78\">Khởi hành</td><td style=\"text-align:right\">{{startDate}} – {{endDate}}</td></tr>\n<tr><td style=\"padding:6px 0;color:#586b78\">Điểm hẹn</td><td style=\"text-align:right\">{{meetingPoint}}</td></tr>\n<tr><td style=\"padding:6px 0;color:#586b78\">Số chỗ</td><td style=\"text-align:right\">{{seatCount}}</td></tr>\n<tr><td style=\"padding:6px 0;color:#586b78\">Tổng tiền</td><td style=\"text-align:right\"><strong>{{total}}</strong></td></tr>\n<tr><td style=\"padding:6px 0;color:#586b78\">Trạng thái</td><td style=\"text-align:right\">{{status}}</td></tr>\n</table>\n<h2 style=\"font-size:15px\">Hành khách</h2>\n{{{passengerList}}}\n<p>Vui lòng hoàn tất thanh toán trước <strong>{{expiresAt}}</strong> để giữ chỗ.</p>\n<p style=\"color:#586b78;font-size:12px\">Email gửi tự động tới {{contactEmail}}.</p>\n</div>',1);
/*!40000 ALTER TABLE `email_templates` ENABLE KEYS */;
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
