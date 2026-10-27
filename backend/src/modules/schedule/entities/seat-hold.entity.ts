import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { DepartureSchedule } from './departure-schedule.entity.js';
import { User } from '../../users/entities/user.entity.js';

/**
 * `seat_holds` – bản ghi giữ chỗ **bền** (Redis chỉ là lớp cache nhanh).
 *
 * Lý do tồn tại: nếu Redis mất dữ liệu, vẫn khôi phục được số chỗ đang giữ và job
 * quét hết hạn có nguồn đối chiếu. `id` chính là `holdId` trả cho FE.
 *
 * Index `(schedule_id, released_at, expires_at)` phục vụ truy vấn tổng chỗ đang giữ
 * của một lịch – đây là truy vấn chạy trong mọi lần đặt tour nên cần index tốt.
 */
@Entity('seat_holds')
@Index('idx_seat_holds_schedule_active', ['scheduleId', 'releasedAt', 'expiresAt'])
@Index('idx_seat_holds_expires', ['expiresAt'])
export class SeatHold extends BaseEntity {
  @Column({ name: 'schedule_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  scheduleId: string;

  @ManyToOne(() => DepartureSchedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule?: Relation<DepartureSchedule>;

  @Column({ name: 'user_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User> | null;

  @Column({ type: 'int', unsigned: true })
  seats: number;

  @Column({ name: 'expires_at', type: 'datetime', precision: 3 })
  expiresAt: Date;

  /** Gắn khi Booking được tạo từ hold này. */
  @Column({ name: 'booking_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  bookingId?: string | null;

  /** null = còn hiệu lực. */
  @Column({ name: 'released_at', type: 'datetime', precision: 3, nullable: true })
  releasedAt?: Date | null;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }

  isActive(now: Date = new Date()): boolean {
    return this.releasedAt == null && this.expiresAt.getTime() > now.getTime();
  }
}