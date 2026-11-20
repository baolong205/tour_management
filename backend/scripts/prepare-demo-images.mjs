import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Restore bundled demo photos on every start, including after Render loses its local disk.
// Does not modify the database or overwrite user uploads.
const originals = join(process.cwd(), '../frontend/public/images');
const manifest = JSON.parse(await readFile(join(originals, 'sources.json'), 'utf8'));
const folder = join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads', 'tours', 'demo');
await mkdir(folder, { recursive: true });
for (const photo of manifest.photos) {
  if (!/^[a-z-]+\.jpg$/.test(photo.file)) throw new Error('Invalid demo image filename');
  const bytes = await readFile(join(originals, photo.file));
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  await writeFile(join(folder, `${photo.file.slice(0, -4)}-${hash}.jpg`), bytes);
}
console.log(`Prepared ${manifest.photos.length} bundled demo images.`);