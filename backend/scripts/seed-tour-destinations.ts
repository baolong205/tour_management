import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { databaseSsl } from '../src/config/database-ssl.js';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/common/entities/entity-list.js';
import { seedDemoDestinations } from './lib/demo-destinations.js';

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
  const result = await source.transaction(manager => seedDemoDestinations(manager));
  console.log(`Đã thêm ${result.destinationsCreated} điểm đến, ${result.linksCreated} liên kết cho ${result.toursLinked} tour mẫu. Giữ nguyên các tour đã có điểm đến.`);
} finally {
  if (source.isInitialized) await source.destroy();
}
