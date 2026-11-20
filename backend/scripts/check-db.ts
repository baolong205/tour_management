/**
 * Kiểm tra kết nối MySQL (và tuỳ chọn: tạo schema theo entity) mà KHÔNG cần bật server HTTP.
 *
 * Cách dùng (trong thư mục `backend/`):
 *   npm run db:check              # chỉ kiểm tra kết nối + đếm bảng
 *   npm run db:sync              # tạo schema khi database còn trống
 *   npm run db:sync -- --force   # XOÁ toàn bộ bảng rồi tạo lại theo entity
 *
 * Thông tin DB lấy từ `.env` giống hệt `app.module.ts` (ConfigModule).
 *
 * Ghi chú: giữ `DB_SYNCHRONIZE=false` trong `.env`; production cần quản lý schema
 * bằng migration. Cờ `--force` chỉ phục vụ việc dựng lại DB dev từ đầu.
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/common/entities/entity-list.js';
import databaseConfig from '../src/config/database.config.js';

const force = process.argv.includes('--force');
const shouldSync = process.argv.includes('--sync') || force;

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
        ssl: config.get('database.ssl'),
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
      const [{ count }] = (await dataSource.query(
        'SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE()',
      )) as { count: number | string }[];
      if (Number(count) > 0 && !force) {
        throw new Error('Database đã có bảng. Dừng đồng bộ để giữ dữ liệu; dùng migration để cập nhật schema. Chỉ thêm --force nếu muốn XÓA toàn bộ dữ liệu.');
      }
      console.log(force ? '\nĐang xoá và tạo lại schema từ entity...' : '\nĐang tạo schema từ entity cho database trống...');
      await dataSource.synchronize(force);
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
      console.log('\nDB đang trống. Chạy `npm run db:sync` để tạo toàn bộ bảng từ entity.');
    }
  } finally {
    await app.close();
  }
}

await bootstrap();
