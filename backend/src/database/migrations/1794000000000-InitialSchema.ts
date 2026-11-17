import type { MigrationInterface, QueryRunner } from 'typeorm';
import { INITIAL_SCHEMA_SQL, INITIAL_TABLES } from './initial-schema.snapshot.js';

/** Frozen baseline for new databases; adopts complete legacy schemas without rewriting them. */
export class InitialSchema1794000000000 implements MigrationInterface {
  name = 'InitialSchema1794000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tables: { name: string }[] = await queryRunner.query(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()',
    );
    const names = new Set(tables.map(table => table.name));
    const legacyTables = INITIAL_TABLES.filter(name => name !== 'mail_messages' && name !== 'support_tickets');
    if (legacyTables.some(name => names.has(name))) {
      const missing = legacyTables.filter(name => !names.has(name));
      if (missing.length) throw new Error(`Schema hiện có chưa đầy đủ; không tự sửa hoặc xóa bảng. Thiếu: ${missing.join(', ')}. Xem docs/DATABASE.md.`);
      return;
    }
    const migrationTable = queryRunner.connection.options.migrationsTableName ?? 'migrations';
    const unexpected = tables.filter(table => ![migrationTable, 'typeorm_metadata'].includes(table.name));
    if (unexpected.length) throw new Error('Database không trống và không phải schema TourGo đầy đủ. Kiểm tra DB_DATABASE trước khi migrate.');
    for (const sql of INITIAL_SCHEMA_SQL) await queryRunner.query(sql);
  }

  async down(): Promise<void> {
    throw new Error('Baseline không tự xóa dữ liệu; khôi phục từ backup nếu cần rollback.');
  }
}
