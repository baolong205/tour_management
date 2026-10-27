import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { DepartureSchedule } from './departure-schedule.entity.js';
import { Attendance } from '../../operations/entities/attendance.entity.js';

/**
 * `schedule_checkpoints` – điểm hẹn/điểm danh trong chuyến (đón khách, tập trung…).
 * `meet_time` là `time` (giờ trong ngày), không kèm ngày.
 */
@Entity('schedule_checkpoints')
@Index('idx_schedule_checkpoints_schedule', ['scheduleId'])
export class ScheduleCheckpoint extends BaseEntity {
  @Column({ name: 'schedule_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  scheduleId: string;

  @ManyToOne(() => DepartureSchedule, (s) => s.checkpoints, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule?: Relation<DepartureSchedule>;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'meet_time', type: 'time' })
  meetTime: string;

  @Column({ name: 'day_no', type: 'int', unsigned: true, default: 1 })
  dayNo: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => Attendance, (a) => a.checkpoint)
  attendances?: Relation<Attendance[]>;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}