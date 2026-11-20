/** Add the campaign catalog without resetting existing promotions or bookings. */
import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { databaseSsl } from '../src/config/database-ssl.js';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/common/entities/entity-list.js';
import { Promotion } from '../src/modules/promotion/entities/promotion.entity.js';
import { PROMOTION_CATALOG, seedPromotionCatalog } from './lib/promotion-catalog.js';

await ConfigModule.forRoot({ envFilePath: '.env' });
const source = new DataSource({
  ssl: databaseSsl(),
  type: 'mysql', host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root', password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'tour_management', timezone: '+07:00', charset: 'utf8mb4',
  entities: ALL_ENTITIES, synchronize: false, logging: false,
});

try {
  await source.initialize();
  const result = await source.transaction(manager => seedPromotionCatalog(manager));
  for (const item of PROMOTION_CATALOG) {
    const promotion = await source.getRepository(Promotion).findOneByOrFail({ code: item.code });
    console.log(`${promotion.code}: ${promotion.type === 'PERCENT' ? `${promotion.value}%` : `${promotion.value.toLocaleString('vi-VN')}đ`} · Đơn từ ${promotion.minOrder.toLocaleString('vi-VN')}đ · ${promotion.active ? 'Đang bật' : 'Đang tắt'}`);
  }
  console.log(`Hoàn tất: thêm ${result.created} mã, giữ nguyên ${result.skipped} mã đã tồn tại.`);
} finally {
  if (source.isInitialized) await source.destroy();
}
