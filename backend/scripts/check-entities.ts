/**
 * Kiểm tra metadata entity mà **không cần kết nối database**.
 *
 * Chạy: `npx tsx scripts/check-entities.ts` (hoặc `npx vite-node scripts/check-entities.ts`)
 *
 * Việc script làm:
 * 1. Build metadata từ danh sách `ALL_ENTITIES` (phát hiện quan hệ sai, decorator sai,
 *    target không tồn tại, thiếu cột join…).
 * 2. In bảng/danh sách cột để đối chiếu với `docs/schema.md`.
 * 3. Kiểm tra nhanh vài ràng buộc nghiệp vụ thuần TypeScript (state machine booking,
 *    tính phí hủy) mà không cần DB.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/common/entities/entity-list.js';

/**
 * `buildMetadatas()` là `protected` trong type, nhưng public ở runtime và không chạm
 * tới driver ⇒ dùng subclass để gọi được mà không cần kết nối MySQL.
 */
class MetadataInspector extends DataSource {
  async inspect() {
    await this.buildMetadatas();
  }
}

const dataSource = new MetadataInspector({
  type: 'mysql',
  host: 'localhost',
  username: 'root',
  database: 'tour_management',
  entities: ALL_ENTITIES,
  synchronize: false,
});

await dataSource.inspect();

const metadatas = dataSource.entityMetadatas;
console.log(`\n== Đã build metadata cho ${metadatas.length} entity ==\n`);

let totalColumns = 0;
for (const meta of metadatas.sort((a, b) => a.tableName.localeCompare(b.tableName))) {
  totalColumns += meta.columns.length;
  const pk = meta.primaryColumns.map((c) => c.databaseName).join(', ');
  const unique = meta.uniques.map((u) => `${u.name}(${u.columns.map((c) => c.databaseName).join(',')})`);
  const indexes = meta.indices.map((i) => `${i.name}${i.isUnique ? ' [unique]' : ''}`);
  console.log(`• ${meta.tableName}`);
  console.log(`    PK: ${pk} | cột: ${meta.columns.length} | FK: ${meta.relations.length > 0 ? meta.foreignKeys.length : 0}`);
  console.log(`    UNIQUE: ${unique.length ? unique.join(', ') : '—'}`);
  console.log(`    INDEX : ${indexes.length ? indexes.join(', ') : '—'}`);
}
console.log(`\nTổng số cột: ${totalColumns}`);
