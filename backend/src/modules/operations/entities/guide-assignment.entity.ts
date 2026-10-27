import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { AssignmentStatus } from '../../../common/enums/index.js';
import { DepartureSchedule } from '../../schedule/entities/departure-schedule.entity.js';
import { GuideProfile } from '../../users/entities/guide-profile.entity.js';
import { User } from '../../users/entities/user.entity.js';

/**
 * `guide_assignments` – phân công HDV cho lịch khởi hành.
 *
 * **Điểm quan trọng nhất của bảng này trên PostgreSQL là `period daterange` +
 * `EXCLUDE USING gist (guide_id WITH =, period WITH &&) WHERE status = 'ACTIVE'`
 * để chống một HDV nhận hai tour trùng lịch. MySQL **không có** range type lẫn
 * EXCLUDE constraint, nên ở đây:
 *
 * - Lưu `period_start` / `period_end` (`date`), sao chép `start_date`/`end_date`
 *   của lịch tại thời điểm phân công.
 * - Chống trùng ở tầng ứng dụng: trong transaction phân công, chạy
 *   `SELECT ... FOR UPDATE` (hoặc đặt khóa Redis theo `guide_id`) rồi kiểm tra
 *   giao khoảng: `existing.period_start <= new.period_end AND existing.period_end >= new.period_start`.
 * - Index `(guide_id, status, period_start)` giúp truy vấn kiểm tra nhanh.
 *
 * Đây là một trong các rủi ro cần chấp nhận khi chuyển từ PG sang MySQL (xem
 * `docs/DANH_GIA_MODEL.md` mục "Rủi ro & cách bù").
 */
@Entity('guide_assignments')
@Index('idx_guide_assignments_schedule', ['scheduleId'])
@Index('idx_guide_assignments_guide_period', ['guideId', 'status', 'periodStart'])
export class GuideAssignment extends BaseEntity {
  @Column({ name: 'schedule_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  scheduleId: string;

  @ManyToOne(() => DepartureSchedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule?: Relation<DepartureSchedule>;

  @Column({ name: 'guide_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  guideId: string;

  @ManyToOne(() => GuideProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'guide_id' })
  guide?: Relation<GuideProfile>;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  @Column({ type: 'varchar', length: 20, default: AssignmentStatus.ACTIVE })
  status: AssignmentStatus;

  @Column({ name: 'assigned_by', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  assignedBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assigner?: Relation<User> | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }

  /** Kiểm tra giao khoảng – dùng ở service trước khi tạo phân công mới. */
  overlaps(otherStart: string, otherEnd: string): boolean {
    return this.periodStart <= otherEnd && this.periodEnd >= otherStart;
  }
}