import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { CancelPolicy } from './cancel-policy.entity.js';

/**
 * `cancel_policy_rules` – từng mốc phí hủy.
 * `UQ(policy_id, days_before)`: mỗi chính sách chỉ có tối đa một mức phí cho mỗi mốc.
 */
@Entity('cancel_policy_rules')
@Index('uq_cancel_policy_rules_policy_days', ['policyId', 'daysBefore'], { unique: true })
export class CancelPolicyRule extends BaseEntity {
  @Column({ name: 'policy_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  policyId: string;

  @ManyToOne(() => CancelPolicy, (p) => p.rules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policy_id' })
  policy?: Relation<CancelPolicy>;

  /** Hủy trước ít nhất bao nhiêu ngày thì áp mức phí này. */
  @Column({ name: 'days_before', type: 'int', unsigned: true })
  daysBefore: number;

  /** 0–100. */
  @Column({ name: 'fee_percent', type: 'tinyint', unsigned: true })
  feePercent: number;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}
