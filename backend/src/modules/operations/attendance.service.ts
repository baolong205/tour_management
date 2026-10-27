import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { AttendanceStatus, BookingStatus } from '../../common/enums/index.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { Passenger } from '../booking/entities/passenger.entity.js';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { ScheduleCheckpoint } from '../schedule/entities/schedule-checkpoint.entity.js';
import type { MarkAttendanceDto } from './dto/operations.dto.js';
import { Attendance } from './entities/attendance.entity.js';
import { GuideAssignmentService } from './guide-assignment.service.js';
import type { AttendanceView, CheckpointAttendanceBoard } from './types/operations.types.js';

/** Booking được coi là "khách thật sự đi tour" khi đã xác nhận/hoàn thành. */
const VALID_BOOKING_STATUSES: BookingStatus[] = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED];

/**
 * Điểm danh hành khách tại checkpoint.
 *
 * `UQ(checkpoint_id, passenger_id)` là chốt chặn cuối ở DB; service dùng
 * upsert theo khóa đó nên gọi lại nhiều lần chỉ cập nhật trạng thái, không sinh
 * thêm dòng.
 *
 * Quyền: HDV chỉ điểm danh được lịch mà mình đang được phân công; nhân viên có
 * `guide:assign`/`guide:attend` (không giới hạn) thao tác được mọi lịch.
 */
@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(Attendance) private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(ScheduleCheckpoint) private readonly checkpointRepo: Repository<ScheduleCheckpoint>,
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(DepartureSchedule) private readonly scheduleRepo: Repository<DepartureSchedule>,
    private readonly guideAssignmentService: GuideAssignmentService,
  ) { }

  /** Bảng điểm danh của checkpoint: danh sách khách đi tour + trạng thái điểm danh. */
  async getBoard(checkpointId: string, actor: AuthenticatedUser): Promise<CheckpointAttendanceBoard> {
    const checkpoint = await this.loadCheckpoint(checkpointId);
    await this.assertCanOperate(checkpoint.scheduleId, actor);

    const passengers = await this.loadTourPassengers(checkpoint.scheduleId);
    const records = await this.attendanceRepo.find({ where: { checkpointId } });
    const byPassenger = new Map(records.map((record) => [record.passengerId, record]));

    const items: AttendanceView[] = passengers.map((passenger) => {
      const record = byPassenger.get(passenger.id);
      return {
        id: record?.id ?? '',
        checkpointId,
        passengerId: passenger.id,
        passengerName: passenger.fullName,
        status: record?.status ?? AttendanceStatus.ABSENT,
        markedBy: record?.markedBy ?? null,
        markedAt: record?.markedAt ?? new Date(0),
      };
    });

    const count = (status: AttendanceStatus) =>
      items.filter((item) => item.id && item.status === status).length;
    const marked = items.filter((item) => item.id).length;

    return {
      checkpointId,
      checkpointName: checkpoint.name,
      dayNo: checkpoint.dayNo,
      meetTime: checkpoint.meetTime,
      total: items.length,
      present: count(AttendanceStatus.PRESENT),
      absent: count(AttendanceStatus.ABSENT),
      late: count(AttendanceStatus.LATE),
      unmarked: items.length - marked,
      items,
    };
  }

  /**
   * Điểm danh hàng loạt (upsert).
   * Chỉ chấp nhận `passengerId` thuộc lịch của checkpoint.
   */
  async mark(checkpointId: string, dto: MarkAttendanceDto, actor: AuthenticatedUser): Promise<CheckpointAttendanceBoard> {
    const checkpoint = await this.loadCheckpoint(checkpointId);
    await this.assertCanOperate(checkpoint.scheduleId, actor);

    const passengers = await this.loadTourPassengers(checkpoint.scheduleId);
    const allowed = new Set(passengers.map((passenger) => passenger.id));

    const invalid = dto.entries.filter((entry) => !allowed.has(entry.passengerId));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Có ${invalid.length} hành khách không thuộc lịch khởi hành này: ${invalid.map((e) => e.passengerId).join(', ')}`,
      );
    }

    const passengerIds = [...new Set(dto.entries.map((entry) => entry.passengerId))];
    const existing = await this.attendanceRepo.find({
      where: { checkpointId, passengerId: In(passengerIds) },
    });
    const byPassenger = new Map(existing.map((record) => [record.passengerId, record]));
    const now = new Date();

    const upserts = dto.entries.map((entry) => {
      const record = byPassenger.get(entry.passengerId) ?? this.attendanceRepo.create({ checkpointId, passengerId: entry.passengerId });
      record.status = entry.status;
      record.markedBy = actor.id;
      record.markedAt = now;
      return record;
    });

    await this.attendanceRepo.save(upserts);
    this.logger.log(`Điểm danh ${upserts.length} hành khách tại checkpoint ${checkpointId} (bởi ${actor.email})`);

    return this.getBoard(checkpointId, actor);
  }

  /** Số hành khách đã có ít nhất một bản ghi điểm danh (bất kể checkpoint/trạng thái). */
  async countMarkedTravellers(scheduleId: string): Promise<number> {
    const row = await this.attendanceRepo
      .createQueryBuilder('a')
      .innerJoin(ScheduleCheckpoint, 'c', 'c.id = a.checkpointId')
      .select('COUNT(DISTINCT a.passenger_id)', 'count')
      .where('c.scheduleId = :scheduleId', { scheduleId })
      .getRawOne<{ count: string }>();

    return Number(row?.count ?? 0);
  }

  /** Tổng hợp điểm danh của cả lịch (gộp mọi checkpoint) – dùng cho báo cáo vận hành. */
  async summarizeSchedule(scheduleId: string) {
    const [total, present, absent, late] = await Promise.all([
      this.attendanceRepo
        .createQueryBuilder('a')
        .innerJoin(ScheduleCheckpoint, 'c', 'c.id = a.checkpointId')
        .where('c.scheduleId = :scheduleId', { scheduleId })
        .getCount(),
      this.countByStatus(scheduleId, AttendanceStatus.PRESENT),
      this.countByStatus(scheduleId, AttendanceStatus.ABSENT),
      this.countByStatus(scheduleId, AttendanceStatus.LATE),
    ]);

    return { total, present, absent, late };
  }

  // ===== nội bộ =====

  private async countByStatus(scheduleId: string, status: AttendanceStatus): Promise<number> {
    return this.attendanceRepo
      .createQueryBuilder('a')
      .innerJoin(ScheduleCheckpoint, 'c', 'c.id = a.checkpointId')
      .where('c.scheduleId = :scheduleId', { scheduleId })
      .andWhere('a.status = :status', { status })
      .getCount();
  }

  private async loadCheckpoint(checkpointId: string): Promise<ScheduleCheckpoint> {
    const checkpoint = await this.checkpointRepo.findOne({ where: { id: checkpointId } });
    if (!checkpoint) throw new NotFoundException('Không tìm thấy checkpoint');
    return checkpoint;
  }

  /**
   * Hành khách thực sự đi tour = passengers của các booking CONFIRMED/COMPLETED
   * thuộc lịch đang xét. Không điểm danh khách của booking đã hủy/hết hạn.
   */
  private async loadTourPassengers(scheduleId: string): Promise<Passenger[]> {
    const bookings = await this.bookingRepo.find({
      where: { scheduleId, status: In(VALID_BOOKING_STATUSES) },
      select: { id: true },
    });
    if (bookings.length === 0) return [];

    return this.passengerRepo.find({
      where: { bookingId: In(bookings.map((booking) => booking.id)) },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * HDV phải đang được phân công cho lịch; nhân viên có `guide:assign` thao tác mọi lịch.
   * (Controller đã chặn quyền `guide:attend`, ở đây chỉ áp phạm vi dữ liệu.)
   */
  private async assertCanOperate(scheduleId: string, actor: AuthenticatedUser): Promise<void> {
    if (actor.permissions.includes('guide:assign')) return;

    const guideId = await this.guideAssignmentService.resolveGuideId(actor);
    if (!guideId) throw new ForbiddenException('Tài khoản của bạn chưa có hồ sơ hướng dẫn viên');

    const scheduleIds = await this.guideAssignmentService.scheduleIdsForGuide(guideId);
    if (!scheduleIds.includes(scheduleId)) {
      throw new ForbiddenException('Bạn không được phân công cho lịch khởi hành này');
    }

    const schedule = await this.scheduleRepo.findOne({ where: { id: scheduleId } });
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch khởi hành');
  }
}
