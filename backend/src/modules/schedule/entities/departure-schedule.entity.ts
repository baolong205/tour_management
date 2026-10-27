import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, VersionColumn } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { ScheduleStatus } from '../../../common/enums/index.js';
import { moneyTransformer } from '../../../common/transformers/money.transformer.js';
import { Tour } from '../../catalog/entities/tour.entity.js';
import { Booking } from '../../booking/entities/booking.entity.js';
import { ScheduleCheckpoint } from './schedule-checkpoint.entity.js';

/**
 * `departure_schedules` – một chuyến khởi hành cụ thể của tour (ngày + giá + số chỗ).
 *
 * Khác bản PostgreSQL (`docs/schema.md`):
 * - `date` → `date` (MySQL hỗ trợ sẵn).
 * - `timestamptz` → `datetime(3)`; MySQL không lưu offset, nên **mọi mốc thời gian
 *   phải ghi theo giờ VN** (connection đã đặt `timezone: '+07:00'` trong
 *   `database.config.ts`). Nếu deploy server ở UTC, phải đổi cấu hình đó.
 * - `CHECK (end_date >= start_date)` và `CHECK (sold_seats BETWEEN 0 AND max_seats)`
 *   **không** khai báo được bằng decorator `@Check` trên MySQL (TypeORM chỉ hỗ trợ
 *   `@Check` cho PostgreSQL/Oracle). Phải thêm bằng migration SQL thủ công.
 * - `@VersionColumn` giữ nguyên: TypeORM dùng cột `version` cho optimistic lock.
 */
@Entity('departure_schedules')
@Index('idx_departure_schedules_tour_start', ['tourId', 'startDate'])
@Index('idx_departure_schedules_status_start', ['status', 'startDate'])
export class DepartureSchedule extends BaseEntity {
  @Column({ name: 'tour_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  tourId: string;

  @ManyToOne(() => Tour, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tour_id' })
  tour?: Relation<Tour>;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'price_adult', type: 'decimal', precision: 14, scale: 0, transformer: moneyTransformer })
  priceAdult: number;

  @Column({ name: 'price_child', type: 'decimal', precision: 14, scale: 0, transformer: moneyTransformer })
  priceChild: number;

  @Column({
    name: 'price_infant',
    type: 'decimal',
    precision: 14,
    scale: 0,
    default: 0,
    transformer: moneyTransformer,
  })
  priceInfant: number;

  @Column({ name: 'max_seats', type: 'int', unsigned: true })
  maxSeats: number;

  /** Số chỗ đã bán (chỉ tăng khi payment SUCCESS). */
  @Column({ name: 'sold_seats', type: 'int', unsigned: true, default: 0 })
  soldSeats: number;

  @Column({ type: 'varchar', length: 20, default: ScheduleStatus.DRAFT })
  status: ScheduleStatus;

  @Column({ name: 'meeting_point', type: 'varchar', length: 255, nullable: true })
  meetingPoint?: string | null;

  @Column({ name: 'started_at', type: 'datetime', precision: 3, nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'finished_at', type: 'datetime', precision: 3, nullable: true })
  finishedAt?: Date | null;

  @VersionColumn({ type: 'int', default: 1 })
  version: number;

  // --- quan hệ ---
  @OneToMany(() => Booking, (b) => b.schedule)
  bookings?: Relation<Booking[]>;

  @OneToMany(() => ScheduleCheckpoint, (c) => c.schedule, { cascade: ['insert', 'update'] })
  checkpoints?: Relation<ScheduleCheckpoint[]>;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }

  /**
   * Chỗ còn lại thực tế = `max_seats − sold_seats − chỗ đang giữ`.
   * `heldSeats` phải được truyền vào từ service (tổng `seat_holds` còn hiệu lực),
   * vì entity không tự truy vấn DB.
   */
  availableSeats(heldSeats = 0): number {
    return this.maxSeats - this.soldSeats - heldSeats;
  }

  canBook(seats: number, heldSeats = 0): boolean {
    return this.status === ScheduleStatus.OPEN && this.availableSeats(heldSeats) >= seats;
  }
}