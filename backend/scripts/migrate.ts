import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/common/entities/entity-list.js';
import { ALL_MIGRATIONS } from '../src/database/migrations/index.js';
import { databaseSsl } from '../src/config/database-ssl.js';

await ConfigModule.forRoot({ envFilePath: '.env' });
const source = new DataSource({
  type: 'mysql', host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root', password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'tour_management', timezone: '+07:00', charset: 'utf8mb4',
  synchronize: false, entities: ALL_ENTITIES, migrations: ALL_MIGRATIONS,
  ssl: databaseSsl(),
});
try {
  await source.initialize();
  const migrations = await source.runMigrations({ transaction: 'each' });
  console.log(migrations.length ? `Applied: ${migrations.map(migration => migration.name).join(', ')}` : 'Database is up to date.');
} finally {
  if (source.isInitialized) await source.destroy();
}
