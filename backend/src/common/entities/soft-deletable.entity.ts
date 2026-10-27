import { DeleteDateColumn } from 'typeorm';
import { BaseEntity } from './base.entity.js';

/**
 * Dùng cho `users`, `tours`, `suppliers`: xóa mềm bằng `deleted_at`.
 *
 * Lưu ý: TypeORM **không** tự lọc `deleted_at IS NULL` cho quan hệ `ManyToOne`/
 * `OneToMany`, chỉ lọc ở truy vấn gốc khi dùng `find`/`findOne`/`createQueryBuilder`
 * trên chính entity đó. Với các query join, phải thêm điều kiện thủ công
 * (`.andWhere('tour.deleted_at IS NULL')`).
 */
export abstract class SoftDeletableEntity extends BaseEntity {
  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt?: Date | null;
}
