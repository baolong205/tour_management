import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { PromotionRedemptionStatus } from '../../../common/enums/index.js';
import { moneyTransformer } from '../../../common/transformers/money.transformer.js';
import type { Booking } from '../../booking/entities/booking.entity.js';
import type { Promotion } from './promotion.entity.js';

/**
 * `promotion_redemptions` – sổ cái từng lượt dùng mã.
 *
 * Vì sao cần bảng này dù `promotions.used_count` đã có:
 * - `used_count` là counter, không trả lời được "ai dùng, đơn nào, giảm bao nhiêu".
 * - `per_user_limit` trước đây đếm bằng `COUNT(bookings)` nên không phân biệt
 *   "đang giữ chỗ" với "đã thanh toán", và không hoàn đúng lượt khi hủy.
 * - Khi cần đối chiếu (job `reconcilePromotionUsage`) thì sổ cái là nguồn sự thật,
 *   counter chỉ để đọc nhanh.
 *
 * Một booking có thể có nhiều dòng (khi bật cộng dồn nhiều mã), nên unique key
 * là `(promotion_id, booking_id)` chứ không phải `booking_id`.
 */
@Entity('promotion_redemptions')
@Index('uq_promotion_redemptions', ['promotionId', 'bookingId'], { unique: true })
@Index('idx_promotion_redemptions_status', ['promotionId', 'status'])
@Index('idx_promotion_redemptions_customer', ['customerId', 'status'])
export class PromotionRedemption extends BaseEntity {
  @Column({ name: 'promotion_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  promotionId: string;

  @ManyToOne('Promotion', (promotion: any) => promotion.redemptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id', foreignKeyConstraintName: 'fk_promotion_redemptions_promotion' })
  promotion?: Relation<Promotion>;

  @Column({ name: 'booking_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  bookingId: string;

  // Dùng chuỗi 'Booking' thay vì biến để tránh circular dependency (TDZ lúc runtime)
  @ManyToOne('Booking', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id', foreignKeyConstraintName: 'fk_promotion_redemptions_booking' })
  booking?: Relation<Booking>;

  @Column({ name: 'customer_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  customerId: string;

  /** Số tiền thực tế đã giảm cho đơn này – chốt tại thời điểm tạo đơn. */
  @Column({ name: 'discount_amount', type: 'decimal', precision: 14, scale: 0, default: 0, transformer: moneyTransformer })
  discountAmount: number;

  /** Tạm tính của đơn lúc áp mã, để tính lại tỉ lệ giảm khi báo cáo. */
  @Column({ name: 'subtotal_at_use', type: 'decimal', precision: 14, scale: 0, default: 0, transformer: moneyTransformer })
  subtotalAtUse: number;

  @Column({ type: 'varchar', length: 20, default: PromotionRedemptionStatus.RESERVED })
  status: PromotionRedemptionStatus;

  @Column({ name: 'reserved_at', type: 'datetime', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)' })
  reservedAt: Date;

  @Column({ name: 'confirmed_at', type: 'datetime', precision: 3, nullable: true })
  confirmedAt?: Date | null;

  @Column({ name: 'released_at', type: 'datetime', precision: 3, nullable: true })
  releasedAt?: Date | null;

  /** Lý do hoàn lượt: `CANCELLED` / `REJECTED` / `EXPIRED` / `MANUAL`. */
  @Column({ name: 'release_reason', type: 'varchar', length: 30, nullable: true })
  releaseReason?: string | null;

  @BeforeInsert()
  protected assignId(): void {
    this.id ??= uuidv4();
    this.reservedAt ??= new Date();
  }
}
