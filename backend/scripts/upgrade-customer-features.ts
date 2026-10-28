/** Additive local upgrade: creates only the support table; never drops existing data. */
import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';

await ConfigModule.forRoot({ envFilePath: '.env' });
const source = new DataSource({ type: 'mysql', host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3306), username: process.env.DB_USERNAME ?? 'root', password: process.env.DB_PASSWORD ?? '', database: process.env.DB_DATABASE ?? 'tour_management', synchronize: false, entities: [] });
try {
  await source.initialize();
  const sql = await readFile(resolve(process.cwd(), '../database/add-support-tickets.sql'), 'utf8');
  await source.query(sql);
  console.log('Support table ready; existing tables untouched.');
} finally { if (source.isInitialized) await source.destroy(); }