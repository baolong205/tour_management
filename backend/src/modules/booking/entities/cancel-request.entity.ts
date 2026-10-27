import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { CancelRequestStatus } from '../../../common/enums/index.js';
import { jsonTransformer, moneyTransformer } from '../../../common/transformers/money.transformer.js';
import { Refund } from '../../payment/entities/refund.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Booking } from './booking.entity.js';

export type PolicySnapshotRule = { daysBefore: number; feePercent: number };
export type PolicySnapshot = {
  policyId: string;
  policyName: string;
  rules: PolicySnapshotRule[];
  /** Ngày khởi hành tại thời điểm gửi – cần để đối soát lại phí. */
  startDate: string;
};

/**
 * `cancel_requests` – yêu cầu hủy booking của khách.
 *
 * `policy_snapshot` chụp lại rule tại thời điểm khách gửi yêu cầu. Bắt buộc, vì nếu
 * chỉ giữ `policyId` thì admin sửa chính sách sau đó sẽ làm thay đổi số tiền hoàn
 * của một yêu cầu đã gửi (điểm 7 trong mục "điểm đã sửa" của `docs/schema.md`).
 *
 * Ràng buộc "mỗi booking chỉ một yêu cầu PENDING" (partial unique) phải xử lý bằng
 * generated column giống `payments` – xem `docs/DANH_GIA_MODEL.md`.
 */
@Entity('cancel_requests')
@Index('idx_cancel_requests_booking', ['bookingId'])
@Index('idx_cancel_requests_status', ['bookingId', 'status'])
export class CancelRequest extends BaseEntity {
  @Column({ name: 'booking_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  bookingId: string;

  @ManyToOne(() => Booking, (b) => b.cancelRequests, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Relation<Booking>;

  @Column({ name: 'requested_by', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  requestedBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'requested_by' })
  requester?: Relation<User> | null;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 20, default: CancelRequestStatus.PENDING })
  status: CancelRequestStatus;

  @Column({ name: 'fee_percent', type: 'tinyint', unsigned: true })
  feePercent: number;

  @Column({ name: 'fee_amount', type: 'decimal', precision: 14, scale: 0, transformer: moneyTransformer })
  feeAmount: number;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 14, scale: 0, transformer: moneyTransformer })
  refundAmount: number;

  /** Chụp rule + ngày khởi hành tại thời điểm gửi yêu cầu. */
  @Column({ name: 'policy_snapshot', type: 'json', transformer: jsonTransformer })
  policySnapshot: PolicySnapshot;

  @Column({ name: 'processed_by', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  processedBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'processed_by' })
  processor?: Relation<User> | null;

  @Column({ name: 'processed_at', type: 'datetime', precision: 3, nullable: true })
  processedAt?: Date | null;

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason?: string | null;

  @OneToMany(() => Refund, (r) => r.cancelRequest)
  refunds?: Relation<Refund[]>;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}