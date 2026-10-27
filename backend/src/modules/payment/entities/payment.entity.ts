import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, VersionColumn } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { PaymentMethod, PaymentStatus } from '../../../common/enums/index.js';
import { moneyTransformer } from '../../../common/transformers/money.transformer.js';
import { Booking } from '../../booking/entities/booking.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { PaymentEvent } from './payment-event.entity.js';
import { Refund } from './refund.entity.js';

/**
 * `payments` – giao dịch thanh toán của booking.
 *
 * Hai ràng buộc của bản PostgreSQL phải xử lý khác trên MySQL:
 *
 * 1. `UQ(gateway, gateway_txn_ref) WHERE gateway IS NOT NULL`
 *    → partial index không hỗ trợ. MySQL coi các dòng có NULL là **không trùng nhau**,
 *    nên chỉ cần `UNIQUE(gateway, gateway_txn_ref)` là đủ: payment nội bộ (gateway NULL)
 *    không bị chặn, còn cặp (gateway, txn_ref) thì thật sự duy nhất.
 *
 * 2. `UQ(booking_id) WHERE status IN ('SUCCESS','PARTIALLY_REFUNDED')`
 *    → MySQL không có partial index. Dùng **generated column**:
 *    `success_flag CHAR(36) AS (IF(status IN ('SUCCESS','PARTIALLY_REFUNDED'), booking_id, NULL)) STORED`
 *    rồi `UNIQUE(success_flag)`. Xem migration trong `docs/DANH_GIA_MODEL.md`.
 *    Nếu không muốn generated column, cách bù thứ hai là khóa dòng booking
 *    (`SELECT ... FOR UPDATE`) rồi kiểm tra "đã có payment SUCCESS chưa" trước khi
 *    cập nhật – cách này chạy được ở mọi MySQL nhưng phụ thuộc kỷ luật của service.
 */
@Entity('payments')
@Index('uq_payments_gateway_ref', ['gateway', 'gatewayTxnRef'], { unique: true })
@Index('idx_payments_booking', ['bookingId'])
@Index('idx_payments_status', ['status'])
export class Payment extends BaseEntity {
  @Column({ name: 'booking_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  bookingId: string;

  @ManyToOne(() => Booking, (b) => b.payments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Relation<Booking>;

  @Column({ type: 'varchar', length: 20 })
  method: PaymentMethod;

  @Column({ type: 'decimal', precision: 14, scale: 0, transformer: moneyTransformer })
  amount: number;

  @Column({ type: 'varchar', length: 25, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gateway?: string | null;

  /** Mã tham chiếu mình sinh, gửi sang cổng. */
  @Column({ name: 'gateway_txn_ref', type: 'varchar', length: 64, nullable: true })
  gatewayTxnRef?: string | null;

  /** Mã giao dịch phía cổng trả về. */
  @Column({ name: 'gateway_txn_no', type: 'varchar', length: 64, nullable: true })
  gatewayTxnNo?: string | null;

  @Column({ name: 'payment_url', type: 'text', nullable: true })
  paymentUrl?: string | null;

  /** Ảnh chụp chuyển khoản (thanh toán thủ công). */
  @Column({ name: 'proof_url', type: 'text', nullable: true })
  proofUrl?: string | null;

  @Column({ name: 'proof_note', type: 'text', nullable: true })
  proofNote?: string | null;

  /** Nhân viên đối chiếu chứng từ. */
  @Column({ name: 'reviewed_by', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  reviewedBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: Relation<User> | null;

  @Column({ name: 'paid_at', type: 'datetime', precision: 3, nullable: true })
  paidAt?: Date | null;

  @Column({ name: 'expires_at', type: 'datetime', precision: 3, nullable: true })
  expiresAt?: Date | null;

  @Column({
    name: 'refunded_amount',
    type: 'decimal',
    precision: 14,
    scale: 0,
    default: 0,
    transformer: moneyTransformer,
  })
  refundedAmount: number;

  @VersionColumn({ type: 'int', default: 1 })
  version: number;

  // --- quan hệ ---
  @OneToMany(() => Refund, (r) => r.payment)
  refunds?: Relation<Refund[]>;

  @OneToMany(() => PaymentEvent, (e) => e.payment)
  events?: Relation<PaymentEvent[]>;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }

  /** Còn tiền chưa hoàn – dùng để tạo refund. */
  refundableAmount(): number {
    return Math.max(this.amount - this.refundedAmount, 0);
  }
}