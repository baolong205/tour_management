import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { moneyTransformer } from '../../../common/transformers/money.transformer.js';
import { DepartureSchedule } from '../../schedule/entities/departure-schedule.entity.js';
import { User } from '../../users/entities/user.entity.js';

/** `incidents` – sự cố phát sinh trong chuyến kèm chi phí phát sinh. */
@Entity('incidents')
@Index('idx_incidents_schedule', ['scheduleId'])
export class Incident extends BaseEntity {
  @Column({ name: 'schedule_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  scheduleId: string;

  @ManyToOne(() => DepartureSchedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule?: Relation<DepartureSchedule>;

  @Column({ name: 'reported_by', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  reportedBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reported_by' })
  reporter?: Relation<User> | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'extra_cost', type: 'decimal', precision: 14, scale: 0, default: 0, transformer: moneyTransformer })
  extraCost: number;

  @Column({ name: 'occurred_at', type: 'datetime', precision: 3 })
  occurredAt: Date;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}