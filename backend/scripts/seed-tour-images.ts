/** Bổ sung ảnh Pexels đã tải về cho 6 tour DEMO; không thay ảnh người dùng tự thêm. */
import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/common/entities/entity-list.js';
import { Tour } from '../src/modules/catalog/entities/tour.entity.js';
import { TourImage } from '../src/modules/catalog/entities/tour-image.entity.js';

await ConfigModule.forRoot({ envFilePath: '.env' });
const originals = join(process.cwd(), '../frontend/public/images');
const manifest = JSON.parse(await readFile(join(originals, 'sources.json'), 'utf8')) as {
  photos: { code: string; file: string; photoId: number }[];
};
const folder = join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads', 'tours', 'demo');
await mkdir(folder, { recursive: true });
// Kiểm tra ảnh trước khi ghi DB. Tên có hash để tương thích cache immutable của backend.
const photos = await Promise.all(manifest.photos.map(async photo => {
  if (!/^[a-z-]+\.jpg$/.test(photo.file)) throw new Error('Tên ảnh không hợp lệ');
  const bytes = await readFile(join(originals, photo.file));
  if (bytes.length < 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error(`Không phải JPEG: ${photo.file}`);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const filename = `${photo.file.slice(0, -4)}-${hash}.jpg`;
  await writeFile(join(folder, filename), bytes);
  return { ...photo, url: `/uploads/tours/demo/${filename}` };
}));
const source = new DataSource({
  type: 'mysql', host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root', password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'tour_management', timezone: '+07:00', charset: 'utf8mb4',
  entities: ALL_ENTITIES, synchronize: false, logging: false,
});
try {
  await source.initialize();
  await source.transaction(async manager => {
    const images = manager.getRepository(TourImage);
    for (const photo of photos) {
      const tour = await manager.getRepository(Tour).findOneBy({ code: photo.code });
      if (!tour) { console.log(`Bỏ qua ${photo.code}: chưa có tour. Chạy db:seed:tours trước.`); continue; }
      const publicId = `demo-pexels-${photo.photoId}`;
      const existing = await images.findOneBy({ tourId: tour.id, publicId });
      if (existing) {
        if (existing.url !== photo.url) { existing.url = photo.url; await images.save(existing); }
        console.log(`Ảnh đã có: ${photo.code}`);
        continue;
      }
      const cover = await images.findOneBy({ tourId: tour.id, isCover: true });
      await images.save(images.create({ tourId: tour.id, publicId, url: photo.url, isCover: !cover, sortOrder: cover ? 1 : 0 }));
      console.log(`Đã thêm ảnh ${photo.code}${cover ? ' (giữ ảnh bìa hiện tại)' : ' (ảnh bìa)'}`);
    }
  });
} finally {
  if (source.isInitialized) await source.destroy();
}