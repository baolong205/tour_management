import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { AttendanceStatus } from '../../../common/enums/index.js';
import { ScheduleCheckpoint } from '../../schedule/entities/schedule-checkpoint.entity.js';
import { Passenger } from '../../booking/entities/passenger.entity.js';
import { User } from '../../users/entities/user.entity.js';

/**
 * `attendances` – điểm danh hành khách tại một checkpoint.
 * `UQ(checkpoint_id, passenger_id)`: mỗi khách chỉ có một bản ghi điểm danh/checkpoint.
 */
@Entity('attendances')
@Index('uq_attendances_checkpoint_passenger', ['checkpointId', 'passengerId'], { unique: true })
export class Attendance extends BaseEntity {
  @Column({ name: 'checkpoint_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  checkpointId: string;

  @ManyToOne(() => ScheduleCheckpoint, (c) => c.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'checkpoint_id' })
  checkpoint?: Relation<ScheduleCheckpoint>;

  @Column({ name: 'passenger_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  passengerId: string;

  @ManyToOne(() => Passenger, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'passenger_id' })
  passenger?: Relation<Passenger>;

  @Column({ type: 'varchar', length: 20 })
  status: AttendanceStatus;

  @Column({ name: 'marked_by', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  markedBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'marked_by' })
  marker?: Relation<User> | null;

  @Column({ name: 'marked_at', type: 'datetime', precision: 3 })
  markedAt: Date;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}