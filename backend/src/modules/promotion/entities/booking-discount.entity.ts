import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { PromotionType } from '../../../common/enums/index.js';
import { moneyTransformer } from '../../../common/transformers/money.transformer.js';
import type { Booking } from '../../booking/entities/booking.entity.js';
import type { Promotion } from './promotion.entity.js';

/**
 * `booking_discounts` – chi tiết từng dòng giảm giá của một đơn.
 *
 * `bookings.discount` vẫn là **tổng** (giữ nguyên để không phá hóa đơn cũ và
 * mọi truy vấn hiện có). Bảng này chỉ thêm chi tiết: đơn được giảm bởi những mã
 * nào, mỗi mã bao nhiêu tiền.
 *
 * Các cột `*_snapshot` chốt giá trị tại thời điểm đặt đơn: admin sửa mã về sau
 * không làm sai lệch lịch sử. Hóa đơn đã phát hành vẫn đọc từ `invoices.snapshot`,
 * không đọc bảng này.
 */
@Entity('booking_discounts')
@Index('uq_booking_discounts', ['bookingId', 'promotionId'], { unique: true })
@Index('idx_booking_discounts_promotion', ['promotionId'])
export class BookingDiscount extends BaseEntity {
  @Column({ name: 'booking_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  bookingId: string;

  @ManyToOne('Booking', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id', foreignKeyConstraintName: 'fk_booking_discounts_booking' })
  booking?: Relation<Booking>;

  @Column({ name: 'promotion_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  promotionId: string;

  @ManyToOne('Promotion', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'promotion_id', foreignKeyConstraintName: 'fk_booking_discounts_promotion' })
  promotion?: Relation<Promotion>;

  @Column({ name: 'code_snapshot', type: 'varchar', length: 40 })
  codeSnapshot: string;

  @Column({ name: 'type_snapshot', type: 'varchar', length: 20 })
  typeSnapshot: PromotionType;

  @Column({ name: 'value_snapshot', type: 'decimal', precision: 14, scale: 2, transformer: moneyTransformer })
  valueSnapshot: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 14, scale: 0, transformer: moneyTransformer })
  discountAmount: number;

  /** Nhóm loại trừ tại thời điểm áp – phục vụ giải thích vì sao mã khác bị bỏ. */
  @Column({ name: 'exclusive_group', type: 'varchar', length: 40, nullable: true })
  exclusiveGroup?: string | null;

  @BeforeInsert()
  protected assignId(): void {
    this.id ??= uuidv4();
  }
}
