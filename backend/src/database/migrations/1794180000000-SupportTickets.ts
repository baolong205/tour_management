import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Replaces the old manual database/add-support-tickets.sql upgrade. */
export class SupportTickets1794180000000 implements MigrationInterface {
  name = 'SupportTickets1794180000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS support_tickets (
      id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      customer_id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      customer_name varchar(150) NOT NULL,
      subject varchar(200) NOT NULL,
      message text NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'OPEN',
      replies json NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY idx_support_customer (customer_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  async down(): Promise<void> {
    throw new Error('Không tự xóa lịch sử hỗ trợ khi rollback.');
  }
}
