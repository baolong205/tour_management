-- Additive migration only. Never drop or synchronize existing tables.
CREATE TABLE IF NOT EXISTS support_tickets (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  customer_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  replies JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_support_customer (customer_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;