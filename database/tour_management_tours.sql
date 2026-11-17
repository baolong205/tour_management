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
-- Table structure for table `tours`
--

DROP TABLE IF EXISTS `tours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tours` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL,
  `code` varchar(30) NOT NULL,
  `slug` varchar(220) NOT NULL,
  `name` varchar(200) NOT NULL,
  `summary` varchar(500) DEFAULT NULL,
  `description` text,
  `duration_days` int unsigned NOT NULL,
  `duration_nights` int unsigned NOT NULL DEFAULT '0',
  `departure_city` varchar(100) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'DRAFT',
  `cancel_policy_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `avg_rating` decimal(2,1) NOT NULL DEFAULT '0.0',
  `review_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tours_slug` (`slug`),
  UNIQUE KEY `uq_tours_code` (`code`),
  KEY `idx_tours_status` (`status`),
  KEY `FK_2af505a9f7d6c75508d4886b575` (`cancel_policy_id`),
  FULLTEXT KEY `ft_tours_name` (`name`),
  CONSTRAINT `FK_2af505a9f7d6c75508d4886b575` FOREIGN KEY (`cancel_policy_id`) REFERENCES `cancel_policies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tours`
--

LOCK TABLES `tours` WRITE;
/*!40000 ALTER TABLE `tours` DISABLE KEYS */;
INSERT INTO `tours` VALUES ('0ea37c53-eed2-4582-9c74-a4c15476ce68','2026-11-03 13:35:59.867','2026-11-03 13:35:59.867',NULL,'DEMO-NB','demo-ninh-binh-trang-an-2n1d','Ninh Bình – Tràng An: Về miền non nước','Khám phá cảnh sắc non nước Tràng An, ghé cố đô Hoa Lư và tận hưởng nhịp sống chậm tại Ninh Bình.','Khám phá cảnh sắc non nước Tràng An, ghé cố đô Hoa Lư và tận hưởng nhịp sống chậm tại Ninh Bình.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',2,1,'Hà Nội','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('2cd9d21e-26f1-42d4-8a7d-1df5d2bf517a','2026-11-17 11:19:03.994','2026-11-17 11:19:03.994',NULL,'DEMO-NT','demo-nha-trang-3n2d','Nha Trang: Nắng vàng biển xanh','Tắm biển, khám phá các đảo quanh vịnh Nha Trang và thưởng thức hải sản tươi ngon.','Tắm biển, khám phá các đảo quanh vịnh Nha Trang và thưởng thức hải sản tươi ngon.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',3,2,'TP. Hồ Chí Minh','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('4fdf289d-42e5-47f5-9228-00417e3ccdf5','2026-11-03 13:35:59.819','2026-11-03 13:35:59.819',NULL,'DEMO-PQ','demo-phu-quoc-3n2d','Phú Quốc: Chạm vào mùa biển xanh','Nghỉ dưỡng bên bờ biển, khám phá đảo ngọc và ngắm hoàng hôn trên biển.','Nghỉ dưỡng bên bờ biển, khám phá đảo ngọc và ngắm hoàng hôn trên biển.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',3,2,'TP. Hồ Chí Minh','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('52a95074-8a23-4618-860a-0e91ea84726f','2026-11-03 13:35:59.847','2026-11-03 13:35:59.847',NULL,'DEMO-HL','demo-ha-long-2n1d','Hạ Long: Một đêm giữa miền kỳ quan','Trải nghiệm nghỉ đêm trên du thuyền, ngắm cảnh vịnh và tận hưởng không gian biển bình yên.','Trải nghiệm nghỉ đêm trên du thuyền, ngắm cảnh vịnh và tận hưởng không gian biển bình yên.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',2,1,'Hà Nội','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('53acc064-c496-4164-a7b0-daef677bce4a','2026-11-17 11:19:04.051','2026-11-17 11:19:04.051',NULL,'DEMO-HUE','demo-hue-co-do-3n2d','Huế: Dấu xưa cố đô','Thăm Đại Nội, lăng tẩm triều Nguyễn, nghe ca Huế trên sông Hương và thưởng thức ẩm thực cung đình.','Thăm Đại Nội, lăng tẩm triều Nguyễn, nghe ca Huế trên sông Hương và thưởng thức ẩm thực cung đình.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',3,2,'Hà Nội','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('80f2277c-3ac2-402b-b575-67e73a0a3165','2026-11-17 11:19:04.136','2026-11-17 11:19:04.136',NULL,'DEMO-MN','demo-mui-ne-phan-thiet-2n1d','Mũi Né: Đồi cát và biển gió','Ngắm bình minh trên đồi cát, ghé suối Tiên, làng chài và thưởng thức hải sản Phan Thiết.','Ngắm bình minh trên đồi cát, ghé suối Tiên, làng chài và thưởng thức hải sản Phan Thiết.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',2,1,'TP. Hồ Chí Minh','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('814fed76-a590-4146-a634-bb26e353caf3','2026-11-17 11:19:04.081','2026-11-17 11:19:04.081',NULL,'DEMO-CT','demo-can-tho-mien-tay-2n1d','Cần Thơ: Sông nước miền Tây','Trải nghiệm chợ nổi Cái Răng, vườn trái cây và ẩm thực miệt vườn Nam Bộ.','Trải nghiệm chợ nổi Cái Răng, vườn trái cây và ẩm thực miệt vườn Nam Bộ.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',2,1,'TP. Hồ Chí Minh','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('8b0b6e6b-6ed9-43e7-91f2-637233dde14d','2026-11-17 11:19:04.101','2026-11-17 11:19:04.101',NULL,'DEMO-HG','demo-ha-giang-4n3d','Hà Giang: Hành trình cực Bắc','Chinh phục đèo Mã Pí Lèng, ngắm sông Nho Quế và khám phá văn hóa các dân tộc vùng cao.','Chinh phục đèo Mã Pí Lèng, ngắm sông Nho Quế và khám phá văn hóa các dân tộc vùng cao.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',4,3,'Hà Nội','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('8d3308ac-3767-4355-9b9f-24ca5267bd52','2026-11-03 13:35:59.839','2026-11-03 13:35:59.839',NULL,'DEMO-DL','demo-da-lat-3n2d','Đà Lạt: Một khoảng trời bình yên','Dạo quanh thành phố ngàn hoa, ghé những quán cà phê và tận hưởng không khí cao nguyên.','Dạo quanh thành phố ngàn hoa, ghé những quán cà phê và tận hưởng không khí cao nguyên.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',3,2,'TP. Hồ Chí Minh','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('a9f34825-b730-402b-8347-462cbc4753e0','2026-11-03 13:35:59.800','2026-11-03 13:35:59.800',NULL,'DEMO-DNHA','demo-da-nang-hoi-an-4n3d','Đà Nẵng – Hội An: Hành trình miền di sản','Dạo bước phố cổ Hội An, tận hưởng biển Mỹ Khê và khám phá vẻ đẹp miền Trung.','Dạo bước phố cổ Hội An, tận hưởng biển Mỹ Khê và khám phá vẻ đẹp miền Trung.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',4,3,'Hà Nội','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('ae2aece0-5df9-4e60-beab-d96cb4062c39','2026-11-17 11:19:04.125','2026-11-17 11:19:04.125',NULL,'DEMO-PN','demo-phong-nha-quang-binh-3n2d','Phong Nha – Quảng Bình: Thế giới hang động','Khám phá động Phong Nha, Thiên Đường và vẻ đẹp rừng núi vườn quốc gia.','Khám phá động Phong Nha, Thiên Đường và vẻ đẹp rừng núi vườn quốc gia.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',3,2,'Hà Nội','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('e37eabe6-5910-4e2d-a88e-f95883b57a80','2026-11-17 11:19:04.114','2026-11-17 11:19:04.114',NULL,'DEMO-CD','demo-con-dao-3n2d','Côn Đảo: Hành trình tâm linh và biển xanh','Viếng các di tích lịch sử, tắm biển hoang sơ và tận hưởng không gian yên bình của đảo.','Viếng các di tích lịch sử, tắm biển hoang sơ và tận hưởng không gian yên bình của đảo.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',3,2,'TP. Hồ Chí Minh','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('e614d2b5-ce70-4ea7-9b93-e26b87f15c83','2026-11-17 11:19:04.090','2026-11-17 11:19:04.090',NULL,'DEMO-MC','demo-moc-chau-2n1d','Mộc Châu: Đồi chè và mùa hoa','Ngắm đồi chè, thung lũng hoa theo mùa và thưởng thức sữa, đặc sản vùng cao nguyên.','Ngắm đồi chè, thung lũng hoa theo mùa và thưởng thức sữa, đặc sản vùng cao nguyên.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',2,1,'Hà Nội','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('eae6d0f9-7082-45a3-84ee-5d0282a362d9','2026-11-17 11:19:04.064','2026-11-17 11:19:04.064',NULL,'DEMO-QN','demo-quy-nhon-phu-yen-4n3d','Quy Nhơn – Phú Yên: Miền biển hoang sơ','Khám phá Kỳ Co, Eo Gió, Gành Đá Đĩa và những bãi biển yên tĩnh của miền Trung.','Khám phá Kỳ Co, Eo Gió, Gành Đá Đĩa và những bãi biển yên tĩnh của miền Trung.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',4,3,'TP. Hồ Chí Minh','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0),('eb9b1c60-dac3-41dc-9a89-8bc28bfa818d','2026-11-03 13:35:59.829','2026-11-03 13:35:59.829',NULL,'DEMO-SP','demo-sa-pa-fansipan-3n2d','Sa Pa – Fansipan: Hẹn với mây trời','Tận hưởng không khí vùng cao, khám phá bản làng và trải nghiệm hành trình chạm mây.','Tận hưởng không khí vùng cao, khám phá bản làng và trải nghiệm hành trình chạm mây.\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.',3,2,'Hà Nội','PUBLISHED','9169c1e5-0bcf-4b87-8621-d8ddb0362f72',0.0,0);
/*!40000 ALTER TABLE `tours` ENABLE KEYS */;
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
