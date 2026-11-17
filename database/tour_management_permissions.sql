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
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `code` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissions_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES ('09ff5da8-58ac-41ae-89c9-b60ca7408956','2026-11-03 13:32:44.779','2026-11-03 13:32:44.779','guide:assign','Phân công hướng dẫn viên'),('126d469b-e912-42cf-acd7-4b956430406a','2026-11-03 13:32:44.781','2026-11-03 13:32:44.781','guide:attend','Điểm danh khách'),('1c25b26e-8a37-49f3-bb02-7a3482882916','2026-11-03 13:32:44.801','2026-11-03 13:32:44.801','system:setting','Thay đổi cấu hình hệ thống'),('26eb48f8-120f-41e0-94c7-0fcd2b6a3759','2026-11-03 13:32:44.766','2026-11-03 13:32:44.766','schedule:write','Tạo và điều chỉnh lịch khởi hành'),('38208464-c245-42c7-9d5e-163c0cd44773','2026-11-03 13:32:44.752','2026-11-03 13:32:44.752','role:manage','Xem vai trò và gán quyền'),('3e67cadb-939a-44b6-8a2e-133299c0da4e','2026-11-03 13:32:44.774','2026-11-03 13:32:44.774','booking:cancel','Xử lý yêu cầu hủy'),('402c0c09-0339-4d0b-a428-3bfc725c3086','2026-11-03 13:32:44.770','2026-11-03 13:32:44.770','booking:create','Tạo đơn đặt tour'),('402fe5ac-1292-457b-bbe1-2c37fe08ea67','2026-11-03 13:32:44.762','2026-11-03 13:32:44.762','category:write','Quản lý danh mục và điểm đến'),('43666b46-4092-47fb-ae4a-d7f268e154e7','2026-11-03 13:32:44.768','2026-11-03 13:32:44.768','booking:read','Xem đơn đặt tour'),('4d8e9315-2a0e-4f17-99cd-564f705dcd49','2026-11-03 13:32:44.777','2026-11-03 13:32:44.777','payment:refund','Hoàn tiền'),('69d3dcb4-ac3e-4ea4-91e7-ba6229b71c23','2026-11-03 13:32:44.803','2026-11-03 13:32:44.803','file:upload','Tải tệp lên hệ thống (ảnh tour, biên lai, tài liệu)'),('6bf6d492-0bd2-418e-a293-ce6e273384ed','2026-11-03 13:32:44.776','2026-11-03 13:32:44.776','payment:read','Xem giao dịch thanh toán'),('7ea13b1e-b09e-4ec6-82e2-5120681e51c6','2026-11-03 13:32:44.749','2026-11-03 13:32:44.749','user:manage','Cập nhật, khóa, xóa người dùng'),('8861caa7-636a-4937-8b9a-4c53901e0360','2026-11-03 13:32:44.797','2026-11-03 13:32:44.797','report:read','Xem báo cáo thống kê'),('8d869e4f-b3bf-40c7-9129-bb61a28c0935','2026-11-03 13:32:44.738','2026-11-03 13:32:44.738','support:manage','Tiếp nhận và trả lời yêu cầu CSKH'),('a4bddc05-ace5-45d3-bae9-a7025a423607','2026-11-03 13:32:44.772','2026-11-03 13:32:44.772','booking:confirm','Xác nhận / từ chối đơn'),('b2301fcc-67f9-415a-94f4-0c23d39eab9e','2026-11-03 13:32:44.757','2026-11-03 13:32:44.757','tour:write','Tạo, sửa, ẩn/hiện tour'),('b2f4a49e-2c3e-41a4-98b7-74353447a223','2026-11-03 13:32:44.755','2026-11-03 13:32:44.755','tour:read','Xem tour'),('b7387560-8007-48bc-ae5c-b434338a1555','2026-11-03 13:32:44.783','2026-11-03 13:32:44.783','incident:manage','Xử lý sự cố'),('baf0912f-9c17-4948-b20c-b08e00f6be1a','2026-11-03 13:32:44.787','2026-11-03 13:32:44.787','promotion:manage','Quản lý khuyến mãi'),('be7b647c-0695-4750-ac17-fdf90c8e2654','2026-11-03 13:32:44.746','2026-11-03 13:32:44.746','user:read','Xem danh sách và hồ sơ người dùng'),('d25976dc-379f-4024-a925-6ab161477149','2026-11-03 13:32:44.793','2026-11-03 13:32:44.793','notification:manage','Gửi thông báo cho người dùng'),('de170719-39b6-47ee-8e55-2ecb7c2da3a2','2026-11-03 13:32:44.785','2026-11-03 13:32:44.785','supplier:manage','Quản lý nhà cung cấp và phân bổ nguồn lực'),('e3a8a242-aabb-4e4a-b38d-8f73098e6e64','2026-11-03 13:32:44.789','2026-11-03 13:32:44.789','review:moderate','Kiểm duyệt đánh giá'),('f70a7969-d57e-4164-b533-688fa9c17ca0','2026-11-03 13:32:44.764','2026-11-03 13:32:44.764','schedule:read','Xem lịch khởi hành'),('fffa79b3-d63e-4929-a48c-121f7ed2f573','2026-11-03 13:32:44.759','2026-11-03 13:32:44.759','tour:delete','Xóa tour');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
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
