/**
 * Kiểm tra kết nối MySQL (và tuỳ chọn: tạo schema theo entity) mà KHÔNG cần bật server HTTP.
 *
 * Cách dùng (trong thư mục `backend/`):
 *   npm run db:check              # chỉ kiểm tra kết nối + đếm bảng
 *   npm run db:sync -- --force    # XOÁ toàn bộ bảng rồi tạo lại theo entity
 *
 * Thông tin DB lấy từ `.env` giống hệt `app.module.ts` (ConfigModule).
 *
 * Ghi chú: `DB_SYNCHRONIZE=false` trong `.env` là cố ý – dự án dùng migration/schema.sql
 * cho production. Cờ `--force` ở đây chỉ phục vụ việc dựng DB dev từ đầu.
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/common/entities/entity-list.js';
import databaseConfig from '../src/config/database.config.js';

const shouldSync = process.argv.includes('--sync') || process.argv.includes('--force');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [databaseConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        // Tắt synchronize lúc khởi tạo để đọc được DB kể cả khi schema lệch;
        // việc đồng bộ (nếu có) được gọi tường minh bên dưới.
        synchronize: false,
        logging: false,
        timezone: config.get<string>('database.timezone'),
        charset: config.get<string>('database.charset'),
        entities: ALL_ENTITIES,
      }),
    }),
  ],
})
class CheckDbModule { }

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(CheckDbModule, { logger: ['error', 'warn'] });

  try {
    const dataSource = app.get(DataSource);
    const options = dataSource.driver.options as unknown as { host: string; port: number; database: string };
    const [{ version }] = (await dataSource.query('SELECT VERSION() AS version')) as { version: string }[];

    console.log('Kết nối MySQL: OK');
    console.log(`  host     : ${options.host}:${options.port}`);
    console.log(`  database : ${options.database}`);
    console.log(`  version  : ${version}`);
    console.log(`  entities : ${ALL_ENTITIES.length} (khai báo trong ALL_ENTITIES)`);

    if (shouldSync) {
      console.log('\nĐang tạo schema từ entity (drop + create)...');
      await dataSource.synchronize(true);
      console.log('Đồng bộ schema: OK');
    }

    const tables = (await dataSource.query(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name',
    )) as { name: string }[];

    console.log(`\nSố bảng hiện có: ${tables.length}`);
    for (const table of tables) {
      console.log(`  - ${table.name}`);
    }

    if (!shouldSync && tables.length === 0) {
      console.log('\nDB đang trống. Chạy `npm run db:sync -- --force` để tạo toàn bộ bảng từ entity.');
    }
  } finally {
    await app.close();
  }
}

await bootstrap();
