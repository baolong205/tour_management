import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { Tour } from './tour.entity.js';

/**
 * `itinerary_days` – lịch trình từng ngày của tour.
 * `UQ(tour_id, day_no)`: mỗi tour không có hai ngày cùng số.
 */
@Entity('itinerary_days')
@Index('uq_itinerary_days_tour_day', ['tourId', 'dayNo'], { unique: true })
export class ItineraryDay extends BaseEntity {
  @Column({ name: 'tour_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  tourId: string;

  @ManyToOne(() => Tour, (t) => t.itinerary, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tour_id' })
  tour?: Relation<Tour>;

  @Column({ name: 'day_no', type: 'int', unsigned: true })
  dayNo: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content?: string | null;

  /** Mô tả bữa ăn, vd `Sáng, Trưa`. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  meals?: string | null;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}