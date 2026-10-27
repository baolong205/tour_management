import { ConflictException } from '@nestjs/common';
import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, VersionColumn } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { BookingChannel, BookingStatus } from '../../../common/enums/index.js';
import { moneyTransformer } from '../../../common/transformers/money.transformer.js';
import { Promotion } from '../../promotion/entities/promotion.entity.js';
import { DepartureSchedule } from '../../schedule/entities/departure-schedule.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { CancelRequest } from './cancel-request.entity.js';
import { Invoice } from './invoice.entity.js';
import { Passenger } from './passenger.entity.js';
import { Payment } from '../../payment/entities/payment.entity.js';
import { Review } from '../../review/entities/review.entity.js';

/**
 * Máy trạng thái booking – khớp sơ đồ 10.9 + phần vá ở `docs/schema.md` mục 9.
 * Trạng thái kết thúc: CANCELLED / REJECTED / EXPIRED / COMPLETED (không có cạnh ra).
 */
const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  [BookingStatus.PENDING_PAYMENT]: [
    BookingStatus.PENDING_CONFIRMATION,
    BookingStatus.EXPIRED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.PENDING_CONFIRMATION]: [
    BookingStatus.CONFIRMED,
    BookingStatus.REJECTED,
    BookingStatus.CANCEL_REQUESTED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.CANCEL_REQUESTED,
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CANCEL_REQUESTED]: [
    BookingStatus.CANCELLED,
    BookingStatus.PENDING_CONFIRMATION,
    BookingStatus.CONFIRMED,
  ],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.REJECTED]: [],
  [BookingStatus.EXPIRED]: [],
  [BookingStatus.COMPLETED]: [],
};

export { BOOKING_TRANSITIONS };

/**
 * `bookings`
 *
 * Khác bản PostgreSQL:
 * - `contact_email citext` → `varchar(191)` với collation mặc định (MySQL
 *   `utf8mb4_unicode_ci`/`0900_ai_ci` đều không phân biệt hoa thường).
 * - Partial index `IDX(expires_at) WHERE status='PENDING_PAYMENT'` không khai báo
 *   bằng decorator được ⇒ tạo bằng migration SQL (xem `docs/DANH_GIA_MODEL.md`).
 * - `CHECK (total = subtotal - discount)` không sinh được ⇒ kiểm ở service:
 *   tiền luôn được tính lại ở server từ giá lịch + passengers, **không** tin số tiền FE gửi.
 */
@Entity('bookings')
@Index('uq_bookings_code', ['code'], { unique: true })
@Index('idx_bookings_schedule', ['scheduleId'])
@Index('idx_bookings_customer_created', ['customerId', 'createdAt'])
@Index('idx_bookings_status_expires', ['status', 'expiresAt'])
export class Booking extends BaseEntity {
  /** Mã hiển thị cho khách, vd `BK260001`. */
  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ name: 'schedule_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  scheduleId: string;

  @ManyToOne(() => DepartureSchedule, (s) => s.bookings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'schedule_id' })
  schedule?: Relation<DepartureSchedule>;

  @Column({ name: 'customer_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  customerId: string;

  /** Khách tại quầy cũng được tạo `users` (không có mật khẩu) để giữ FK chặt. */
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Relation<User>;

  /** Nhân viên tạo booking tại quầy. */
  @Column({ name: 'created_by', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  createdBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: Relation<User> | null;

  @Column({ type: 'varchar', length: 20, default: BookingChannel.ONLINE })
  channel: BookingChannel;

  @Column({ name: 'contact_name', type: 'varchar', length: 150 })
  contactName: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20 })
  contactPhone: string;

  @Column({ name: 'contact_email', type: 'varchar', length: 191 })
  contactEmail: string;

  @Column({ type: 'decimal', precision: 14, scale: 0, transformer: moneyTransformer })
  subtotal: number;

  @Column({ type: 'decimal', precision: 14, scale: 0, default: 0, transformer: moneyTransformer })
  discount: number;

  /** = `subtotal - discount`. Luôn tính lại ở server. */
  @Column({ type: 'decimal', precision: 14, scale: 0, transformer: moneyTransformer })
  total: number;

  @Column({ name: 'promotion_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  promotionId?: string | null;

  @ManyToOne(() => Promotion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'promotion_id' })
  promotion?: Relation<Promotion> | null;

  @Column({ type: 'varchar', length: 30, default: BookingStatus.PENDING_PAYMENT })
  status: BookingStatus;

  /** Để quay về đúng trạng thái nếu yêu cầu hủy bị từ chối. */
  @Column({ name: 'status_before_cancel', type: 'varchar', length: 30, nullable: true })
  statusBeforeCancel?: BookingStatus | null;

  /** Hạn giữ chỗ khi `PENDING_PAYMENT` – job `expire-bookings` quét cột này. */
  @Column({ name: 'expires_at', type: 'datetime', precision: 3, nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'hold_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  holdId?: string | null;

  /** Số chỗ chiếm trên lịch (infant có thể không tính chỗ – theo `system_settings`). */
  @Column({ name: 'seat_count', type: 'int', unsigned: true })
  seatCount: number;

  @Column({ name: 'confirmed_by', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  confirmedBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'confirmed_by' })
  confirmer?: Relation<User> | null;

  @Column({ name: 'confirmed_at', type: 'datetime', precision: 3, nullable: true })
  confirmedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @VersionColumn({ type: 'int', default: 1 })
  version: number;

  // --- quan hệ ---
  /** Composition: hành khách chỉ tồn tại cùng booking, cascade insert/update. */
  @OneToMany(() => Passenger, (p) => p.booking, { cascade: ['insert', 'update'] })
  passengers?: Relation<Passenger[]>;

  @OneToMany(() => Payment, (p) => p.booking)
  payments?: Relation<Payment[]>;

  @OneToMany(() => CancelRequest, (c) => c.booking)
  cancelRequests?: Relation<CancelRequest[]>;

  @OneToOne(() => Invoice, (i) => i.booking)
  invoice?: Relation<Invoice> | null;

  @OneToOne(() => Review, (r) => r.booking)
  review?: Relation<Review> | null;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }

  /** Chuyển trạng thái theo bảng `BOOKING_TRANSITIONS`, sai thì ném 409. */
  transitionTo(next: BookingStatus): void {
    const allowed = BOOKING_TRANSITIONS[this.status] ?? [];
    if (!allowed.includes(next)) {
      throw new ConflictException(`Không thể chuyển trạng thái booking ${this.status} → ${next}`);
    }
    this.status = next;
  }

  requestCancel(): void {
    this.statusBeforeCancel = this.status;
    this.transitionTo(BookingStatus.CANCEL_REQUESTED);
  }

  /** Từ chối hủy → quay lại đúng trạng thái trước khi khách gửi yêu cầu. */
  rejectCancel(): void {
    if (!this.statusBeforeCancel) throw new ConflictException('Thiếu trạng thái trước khi hủy');
    this.transitionTo(this.statusBeforeCancel);
    this.statusBeforeCancel = null;
  }

  /** Tính lại tiền khi thêm/xóa passengers hoặc áp mã giảm giá. */
  recalculateTotals(discount = this.discount): void {
    const passengers = this.passengers ?? [];
    this.subtotal = passengers.reduce((sum, p) => sum + Number(p.unitPrice ?? 0), 0);
    this.discount = Math.min(discount, this.subtotal);
    this.total = this.subtotal - this.discount;
  }
}