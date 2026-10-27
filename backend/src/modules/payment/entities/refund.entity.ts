import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { RefundReason, RefundStatus } from '../../../common/enums/index.js';
import { moneyTransformer } from '../../../common/transformers/money.transformer.js';
import { CancelRequest } from '../../booking/entities/cancel-request.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Payment } from './payment.entity.js';

/**
 * `refunds` – hoàn tiền cho một payment.
 * Có thể phát sinh từ yêu cầu hủy (`cancel_request_id`) hoặc từ luồng khác
 * (`LATE_PAYMENT`, `SCHEDULE_CANCELLED`, `REJECTED`).
 */
@Entity('refunds')
@Index('idx_refunds_payment', ['paymentId'])
@Index('idx_refunds_status', ['status'])
export class Refund extends BaseEntity {
  @Column({ name: 'payment_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  paymentId: string;

  @ManyToOne(() => Payment, (p) => p.refunds, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment?: Relation<Payment>;

  @Column({
    name: 'cancel_request_id',
    type: 'char',
    length: 36,
    charset: 'ascii',
    collation: 'ascii_bin',
    nullable: true,
  })
  cancelRequestId?: string | null;

  @ManyToOne(() => CancelRequest, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cancel_request_id' })
  cancelRequest?: Relation<CancelRequest> | null;

  @Column({ type: 'decimal', precision: 14, scale: 0, transformer: moneyTransformer })
  amount: number;

  @Column({ type: 'varchar', length: 20, default: RefundStatus.PENDING })
  status: RefundStatus;

  @Column({ type: 'varchar', length: 30 })
  reason: RefundReason;

  /** Mã hoàn tiền phía cổng (khi hoàn tự động). */
  @Column({ name: 'gateway_ref', type: 'varchar', length: 64, nullable: true })
  gatewayRef?: string | null;

  /** Hoàn tay (chuyển khoản) – không qua API cổng. */
  @Column({ name: 'is_manual', type: 'boolean', default: false })
  isManual: boolean;

  @Column({ name: 'processed_by', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  processedBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'processed_by' })
  processor?: Relation<User> | null;

  @Column({ name: 'refunded_at', type: 'datetime', precision: 3, nullable: true })
  refundedAt?: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}