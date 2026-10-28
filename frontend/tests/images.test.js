import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../public/images/', import.meta.url);
test('six demo tours have local JPEGs and a recorded source', async () => {
  const manifest = JSON.parse(await readFile(new URL('sources.json', root), 'utf8'));
  assert.equal(manifest.photos.length, 6);
  assert.equal(new Set(manifest.photos.map(photo => photo.code)).size, 6);
  for (const photo of manifest.photos) {
    assert.match(photo.source, /^https:\/\/www\.pexels\.com\/photo\/\d+\/$/);
    assert.ok(photo.alt.length > 10);
    const bytes = await readFile(new URL(photo.file, root));
    assert.ok(bytes.length > 1024 && bytes.length < 1024 * 1024, photo.file);
    assert.deepEqual([...bytes.subarray(0, 3)], [255, 216, 255], photo.file);
  }
});
test('homepage and promotional banner reference local photos', async () => {
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(css, /url\('\/images\/ninh-binh\.jpg'\)/);
  assert.match(css, /url\('\/images\/sa-pa\.jpg'\)/);
  const login = await readFile(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8');
  assert.match(login, /src="\/images\/hoi-an\.jpg"/);
});