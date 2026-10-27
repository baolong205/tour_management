import type { Relation } from 'typeorm';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { WebhookEventType, WebhookResult } from '../../../common/enums/index.js';
import { jsonTransformer } from '../../../common/transformers/money.transformer.js';
import { Payment } from './payment.entity.js';

/**
 * `payment_events` – nhật ký IPN/return từ cổng thanh toán (append-only).
 *
 * Mục đích: idempotent + đối soát. Cổng gọi lại IPN nhiều lần thì lần 2 ghi
 * `result = IGNORED` nhưng vẫn trả mã thành công cho cổng.
 *
 * Bản PostgreSQL dùng unique theo biểu thức `(raw_payload->>'vnp_TransactionNo')`.
 * MySQL **không** hỗ trợ functional index trước 8.0.13 (và cú pháp khác), nên ở đây
 * thêm cột `gateway_txn_no` (service tự bóc từ payload) + `UNIQUE(gateway, gateway_txn_no,
 * event_type)`. Với cổng không trả mã giao dịch, cột này NULL ⇒ không chặn trùng,
 * khi đó dựa vào khóa idempotency của service (Redis SET NX theo `gateway:txn_ref:event_type`).
 */
@Entity('payment_events')
@Index('uq_payment_events_gateway_txn', ['gateway', 'gatewayTxnNo', 'eventType'], { unique: true })
@Index('idx_payment_events_payment', ['paymentId'])
@Index('idx_payment_events_created', ['createdAt'])
export class PaymentEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'payment_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  paymentId?: string | null;

  /** null nếu IPN đến mà không tìm thấy payment tương ứng. */
  @ManyToOne(() => Payment, (p) => p.events, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment?: Relation<Payment> | null;

  @Column({ type: 'varchar', length: 20 })
  gateway: string;

  @Column({ name: 'txn_ref', type: 'varchar', length: 64 })
  txnRef: string;

  @Column({ name: 'gateway_txn_no', type: 'varchar', length: 64, nullable: true })
  gatewayTxnNo?: string | null;

  @Column({ name: 'event_type', type: 'varchar', length: 20 })
  eventType: WebhookEventType;

  @Column({ name: 'signature_valid', type: 'boolean' })
  signatureValid: boolean;

  /** `LATE` = tiền về sau khi booking đã hết hạn → phải tạo refund. */
  @Column({ type: 'varchar', length: 20 })
  result: WebhookResult;

  @Column({ name: 'raw_payload', type: 'json', transformer: jsonTransformer })
  rawPayload: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}