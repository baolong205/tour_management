import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
// 1. Đổi sang import type để tránh binding lúc runtime
import type { Promotion } from './promotion.entity.js';

@Entity('promotion_assignments')
@Index('uq_promotion_assignments', ['promotionId', 'customerId'], { unique: true })
@Index('idx_promotion_assignments_customer', ['customerId', 'usedAt'])
export class PromotionAssignment extends BaseEntity {
  @Column({ name: 'promotion_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  promotionId: string;

  // 2. Dùng chuỗi 'Promotion' thay vì biến Promotion
  @ManyToOne('Promotion', (promotion: any) => promotion.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id', foreignKeyConstraintName: 'fk_promotion_assignments_promotion' })
  promotion?: Promotion;

  @Column({ name: 'customer_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  customerId: string;

  @Column({ name: 'assigned_at', type: 'datetime', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)' })
  assignedAt: Date;

  @Column({ name: 'used_at', type: 'datetime', precision: 3, nullable: true })
  usedAt?: Date | null;

  @Column({ name: 'booking_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  bookingId?: string | null;

  @BeforeInsert()
  protected assignId(): void {
    this.id ??= uuidv4();
    this.assignedAt ??= new Date();
  }
}
