import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { Tour } from './tour.entity.js';

/**
 * `tour_images` – ảnh của tour.
 *
 * Ràng buộc "mỗi tour chỉ một ảnh bìa" (partial unique `WHERE is_cover` của PostgreSQL)
 * **không** khai báo được bằng decorator trên MySQL. Cách xử lý:
 * - Cột `is_cover` là `boolean` (tinyint(1)).
 * - Tạo **generated column** `cover_flag` = `IF(is_cover, tour_id, NULL)` rồi đặt
 *   `UNIQUE(cover_flag)` – NULL không bị tính là trùng nên mỗi tour chỉ giữ được
 *   một dòng `is_cover = 1`. Xem migration trong `docs/DANH_GIA_MODEL.md`.
 */
@Entity('tour_images')
@Index('idx_tour_images_tour', ['tourId'])
export class TourImage extends BaseEntity {
  @Column({ name: 'tour_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  tourId: string;

  @ManyToOne(() => Tour, (t) => t.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tour_id' })
  tour?: Relation<Tour>;

  @Column({ type: 'text' })
  url: string;

  /** Khóa trên Cloudinary/S3 để xóa file khi bản ghi bị xóa. */
  @Column({ name: 'public_id', type: 'varchar', length: 255, nullable: true })
  publicId?: string | null;

  @Column({ name: 'is_cover', type: 'boolean', default: false })
  isCover: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}