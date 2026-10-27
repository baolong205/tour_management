import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { ReviewStatus } from '../../../common/enums/index.js';
import { Booking } from '../../booking/entities/booking.entity.js';
import { Tour } from '../../catalog/entities/tour.entity.js';
import { User } from '../../users/entities/user.entity.js';

/**
 * `reviews` – đánh giá tour, gắn 1-1 với booking (mỗi booking một đánh giá).
 *
 * `tour_id` được denormalize từ booking để truy vấn "review của tour" không phải join
 * qua `bookings` → `departure_schedules`. Service phải set đúng khi tạo review.
 * Chỉ cho tạo khi booking ở trạng thái `COMPLETED` (kiểm ở service).
 */
@Entity('reviews')
@Index('uq_reviews_booking', ['bookingId'], { unique: true })
@Index('idx_reviews_tour_status', ['tourId', 'status'])
@Index('idx_reviews_user', ['userId'])
export class Review extends BaseEntity {
  @Column({ name: 'booking_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  bookingId: string;

  @OneToOne(() => Booking, (b) => b.review, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Relation<Booking>;

  @Column({ name: 'tour_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  tourId: string;

  @ManyToOne(() => Tour, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tour_id' })
  tour?: Relation<Tour>;

  @Column({ name: 'user_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  /** 1–5. */
  @Column({ type: 'tinyint', unsigned: true })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ type: 'varchar', length: 20, default: ReviewStatus.PENDING })
  status: ReviewStatus;

  @Column({ name: 'moderated_by', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  moderatedBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'moderated_by' })
  moderator?: Relation<User> | null;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}