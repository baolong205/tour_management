import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { AssignmentStatus, GuideStatus } from '../../common/enums/index.js';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { GuideProfile } from '../users/entities/guide-profile.entity.js';
import { User } from '../users/entities/user.entity.js';
import type { CreateAssignmentDto, QueryAssignmentsDto } from './dto/operations.dto.js';
import { GuideAssignment } from './entities/guide-assignment.entity.js';
import type { GuideAssignmentView } from './types/operations.types.js';

/**
 * Phân công hướng dẫn viên cho lịch khởi hành.
 *
 * **Chống trùng lịch**: PostgreSQL dùng `EXCLUDE USING gist` trên `daterange`;
 * MySQL không có, nên ở đây khóa theo `guide_id` (một "mutex" dạng khóa dòng
 * `guide_profiles`) rồi kiểm tra giao khoảng `period_start/period_end`.
 * Khóa `guide_profiles` thay vì `guide_assignments` để câu `SELECT` luôn có dòng
 * để khóa ngay cả khi HDV chưa từng được phân công.
 */
@Injectable()
export class GuideAssignmentService {
  private readonly logger = new Logger(GuideAssignmentService.name);

  constructor(
    @InjectRepository(GuideAssignment) private readonly assignmentRepo: Repository<GuideAssignment>,
    @InjectRepository(GuideProfile) private readonly guideRepo: Repository<GuideProfile>,
    @InjectRepository(DepartureSchedule) private readonly scheduleRepo: Repository<DepartureSchedule>,
  ) { }

  // ===== truy vấn =====

  async paginate(query: QueryAssignmentsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.guide', 'guide')
      .leftJoinAndSelect('guide.user', 'guideUser');

    if (query.scheduleId) qb.andWhere('assignment.scheduleId = :scheduleId', { scheduleId: query.scheduleId });
    if (query.guideId) qb.andWhere('assignment.guideId = :guideId', { guideId: query.guideId });
    if (query.status) qb.andWhere('assignment.status = :status', { status: query.status });

    qb.orderBy('assignment.periodStart', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [assignments, total] = await qb.getManyAndCount();
    return { items: assignments.map((a) => this.toView(a)), total, page, limit };
  }

  /** Phân công của một lịch – kèm thông tin HDV. */
  async listBySchedule(scheduleId: string): Promise<GuideAssignmentView[]> {
    const assignments = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.guide', 'guide')
      .leftJoinAndSelect('guide.user', 'guideUser')
      .where('assignment.scheduleId = :scheduleId', { scheduleId })
      .orderBy('assignment.periodStart', 'ASC')
      .getMany();

    return assignments.map((a) => this.toView(a));
  }

  /** Phân công **đang hiệu lực** của HDV – dùng cho màn hình của HDV. */
  async listMine(actor: AuthenticatedUser): Promise<GuideAssignmentView[]> {
    const guide = await this.guideRepo.findOne({ where: { userId: actor.id } });
    if (!guide) throw new NotFoundException('Tài khoản của bạn chưa có hồ sơ hướng dẫn viên');

    const assignments = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.guide', 'guide')
      .leftJoinAndSelect('guide.user', 'guideUser')
      .where('assignment.guideId = :guideId', { guideId: guide.id })
      .andWhere('assignment.status = :status', { status: AssignmentStatus.ACTIVE })
      .orderBy('assignment.periodStart', 'ASC')
      .getMany();

    return assignments.map((a) => this.toView(a));
  }

  // ===== ghi =====

  async create(dto: CreateAssignmentDto, actor: AuthenticatedUser): Promise<GuideAssignmentView> {
    const id = await this.assignmentRepo.manager.transaction(async (manager) => {
      const schedule = await manager.getRepository(DepartureSchedule).findOne({
        where: { id: dto.scheduleId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!schedule) throw new NotFoundException('Không tìm thấy lịch khởi hành');

      const guide = await manager.getRepository(GuideProfile).findOne({
        where: { id: dto.guideId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!guide) throw new NotFoundException('Không tìm thấy hồ sơ hướng dẫn viên');
      if (guide.status !== GuideStatus.ACTIVE) {
        throw new ConflictException('Hướng dẫn viên đang tạm nghỉ – không thể phân công');
      }

      const periodStart = this.normalizeDate(dto.periodStart ?? schedule.startDate);
      const periodEnd = this.normalizeDate(dto.periodEnd ?? schedule.endDate);
      this.assertPeriod(periodStart, periodEnd);

      // Chống trùng lịch: kiểm tra giao khoảng với mọi phân công ACTIVE còn lại.
      const overlapping = await manager
        .getRepository(GuideAssignment)
        .createQueryBuilder('assignment')
        .where('assignment.guideId = :guideId', { guideId: guide.id })
        .andWhere('assignment.status = :status', { status: AssignmentStatus.ACTIVE })
        .andWhere('assignment.periodStart <= :periodEnd', { periodEnd })
        .andWhere('assignment.periodEnd >= :periodStart', { periodStart })
        .getOne();

      if (overlapping) {
        throw new ConflictException(
          `Hướng dẫn viên đã nhận tour trùng lịch (${overlapping.periodStart} → ${overlapping.periodEnd})`,
        );
      }

      const assignment = manager.create(GuideAssignment, {
        scheduleId: schedule.id,
        guideId: guide.id,
        periodStart,
        periodEnd,
        status: AssignmentStatus.ACTIVE,
        assignedBy: actor.id,
        note: dto.note?.trim() || null,
      });

      const saved = await manager.save(GuideAssignment, assignment);
      this.logger.log(`Phân công HDV ${guide.id} cho lịch ${schedule.id} (${periodStart} → ${periodEnd})`);
      return saved.id;
    });

    return this.toView(await this.getOrFail(id));
  }

  /** Hủy phân công (giữ bản ghi để có dấu vết, chỉ đổi `status`). */
  async revoke(id: string, reason: string, actor: AuthenticatedUser): Promise<GuideAssignmentView> {
    const assignment = await this.getOrFail(id);
    if (assignment.status === AssignmentStatus.REVOKED) return this.toView(assignment);

    assignment.status = AssignmentStatus.REVOKED;
    assignment.note = [assignment.note, `Thu hồi bởi ${actor.email}: ${reason.trim()}`].filter(Boolean).join('\n');
    return this.toView(await this.assignmentRepo.save(assignment));
  }

  async getOrFail(id: string): Promise<GuideAssignment> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: { guide: { user: true } },
    });
    if (!assignment) throw new NotFoundException('Không tìm thấy phân công hướng dẫn viên');
    return assignment;
  }

  /** Lấy profile của HDV đang đăng nhập – dùng chung cho attendance. */
  async resolveGuideId(actor: AuthenticatedUser): Promise<string | null> {
    const guide = await this.guideRepo.findOne({ where: { userId: actor.id } });
    return guide?.id ?? null;
  }

  /** Id các lịch mà HDV đang được phân công – để giới hạn phạm vi điểm danh. */
  async scheduleIdsForGuide(guideId: string): Promise<string[]> {
    const rows = await this.assignmentRepo.find({
      where: { guideId, status: AssignmentStatus.ACTIVE },
      select: { scheduleId: true },
    });
    return rows.map((row) => row.scheduleId);
  }

  // ===== nội bộ =====

  private assertPeriod(periodStart: string, periodEnd: string): void {
    if (periodEnd < periodStart) {
      throw new BadRequestException('Ngày kết thúc phân công phải sau ngày bắt đầu');
    }
  }

  private normalizeDate(value: string): string {
    return value.slice(0, 10);
  }

  private toView(assignment: GuideAssignment): GuideAssignmentView {
    const guideUser = assignment.guide?.user as User | undefined;
    return {
      id: assignment.id,
      scheduleId: assignment.scheduleId,
      guideId: assignment.guideId,
      guideName: guideUser?.fullName ?? null,
      guideEmail: guideUser?.email ?? null,
      periodStart: assignment.periodStart,
      periodEnd: assignment.periodEnd,
      status: assignment.status,
      assignedBy: assignment.assignedBy ?? null,
      note: assignment.note ?? null,
      createdAt: assignment.createdAt,
    };
  }
}
