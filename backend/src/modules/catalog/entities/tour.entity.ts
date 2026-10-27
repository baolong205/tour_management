import type { Relation } from 'typeorm';
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { uuidv4 } from '../../../common/entities/base.entity.js';
import { SoftDeletableEntity } from '../../../common/entities/soft-deletable.entity.js';
import { TourStatus } from '../../../common/enums/index.js';
import { decimalTransformer } from '../../../common/transformers/money.transformer.js';
import { CancelPolicy } from './cancel-policy.entity.js';
import { Category } from './category.entity.js';
import { ItineraryDay } from './itinerary-day.entity.js';
import { TourDestination } from './tour-destination.entity.js';
import { TourImage } from './tour-image.entity.js';

/**
 * `tours`
 *
 * Khác bản PostgreSQL (`docs/schema.md`):
 * - GIN trigram trên `name` → **FULLTEXT index** của MySQL (xem migration trong
 *   `docs/DANH_GIA_MODEL.md`) vì MySQL không có `pg_trgm`. Với từ khóa tiếng Việt,
 *   FULLTEXT cần `ngram` parser (MySQL 5.7+) hoặc chấp nhận tìm theo từ.
 * - `avg_rating numeric(2,1)` giữ `decimal` + transformer sang number.
 * - `tour_destinations` có cột phụ `sort_order` ⇒ không dùng `@ManyToMany` mà tách
 *   entity nối riêng `TourDestination` để giữ được thứ tự điểm đến.
 */
@Entity('tours')
@Index('uq_tours_code', ['code'], { unique: true })
@Index('uq_tours_slug', ['slug'], { unique: true })
@Index('idx_tours_status', ['status'])
@Index('ft_tours_name', ['name'], { fulltext: true })
export class Tour extends SoftDeletableEntity {
  /** Mã hiển thị, vd `TOUR-0001`. */
  @Column({ type: 'varchar', length: 30 })
  code: string;

  @Column({ type: 'varchar', length: 220 })
  slug: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  summary?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'duration_days', type: 'int', unsigned: true })
  durationDays: number;

  @Column({ name: 'duration_nights', type: 'int', unsigned: true, default: 0 })
  durationNights: number;

  @Column({ name: 'departure_city', type: 'varchar', length: 100, nullable: true })
  departureCity?: string | null;

  @Column({ type: 'varchar', length: 20, default: TourStatus.DRAFT })
  status: TourStatus;

  @Column({ name: 'cancel_policy_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  cancelPolicyId: string;

  @ManyToOne(() => CancelPolicy, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cancel_policy_id' })
  cancelPolicy?: Relation<CancelPolicy>;

  /** Denormalize – service review cập nhật lại sau mỗi lần review đổi trạng thái. */
  @Column({
    name: 'avg_rating',
    type: 'decimal',
    precision: 2,
    scale: 1,
    default: 0,
    transformer: decimalTransformer,
  })
  avgRating: number;

  @Column({ name: 'review_count', type: 'int', unsigned: true, default: 0 })
  reviewCount: number;

  // --- quan hệ ---
  @ManyToMany(() => Category, (c) => c.tours, { cascade: ['insert'] })
  @JoinTable({
    name: 'tour_categories',
    joinColumn: { name: 'tour_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories?: Relation<Category[]>;

  /** Quan hệ nối có thứ tự: `tour_destinations.sort_order`. */
  @OneToMany(() => TourDestination, (td) => td.tour, { cascade: ['insert', 'update'] })
  destinations?: Relation<TourDestination[]>;

  @OneToMany(() => TourImage, (i) => i.tour, { cascade: ['insert', 'update'] })
  images?: Relation<TourImage[]>;

  @OneToMany(() => ItineraryDay, (d) => d.tour, { cascade: ['insert', 'update'] })
  itinerary?: Relation<ItineraryDay[]>;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}
