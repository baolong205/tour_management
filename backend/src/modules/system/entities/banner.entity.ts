import { BeforeInsert, Column, Entity, Index } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';

/** `banners` – banner trang chủ, có lịch chạy (`start_at`/`end_at`). */
@Entity('banners')
@Index('idx_banners_active_sort', ['active', 'sortOrder'])
export class Banner extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @Column({ name: 'link_url', type: 'text', nullable: true })
  linkUrl?: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'start_at', type: 'datetime', precision: 3, nullable: true })
  startAt?: Date | null;

  @Column({ name: 'end_at', type: 'datetime', precision: 3, nullable: true })
  endAt?: Date | null;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }

  isVisible(now: Date = new Date()): boolean {
    if (!this.active) return false;
    if (this.startAt && now < this.startAt) return false;
    if (this.endAt && now > this.endAt) return false;
    return true;
  }
}