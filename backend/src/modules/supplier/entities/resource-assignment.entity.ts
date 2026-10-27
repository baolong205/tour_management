import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { ResourceType } from '../../../common/enums/index.js';
import { moneyTransformer } from '../../../common/transformers/money.transformer.js';
import { DepartureSchedule } from '../../schedule/entities/departure-schedule.entity.js';
import { Supplier } from './supplier.entity.js';

/**
 * `resource_assignments` – phân bổ nguồn lực (khách sạn, xe, vé máy bay…) cho một lịch.
 * `type` ở đây mô tả **loại nguồn lực** (BUS/FLIGHT…), khác `suppliers.type` (HOTEL/TRANSPORT).
 */
@Entity('resource_assignments')
@Index('idx_resource_assignments_schedule', ['scheduleId'])
@Index('idx_resource_assignments_supplier', ['supplierId'])
export class ResourceAssignment extends BaseEntity {
  @Column({ name: 'schedule_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  scheduleId: string;

  @ManyToOne(() => DepartureSchedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule?: Relation<DepartureSchedule>;

  @Column({
    name: 'supplier_id',
    type: 'char',
    length: 36,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  supplierId: string;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Relation<Supplier>;

  @Column({ type: 'varchar', length: 30 })
  type: ResourceType;

  @Column({ type: 'int', unsigned: true, default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 14, scale: 0, nullable: true, transformer: moneyTransformer })
  cost?: number | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}