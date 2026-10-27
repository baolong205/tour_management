import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { BookingStatus } from '../../common/enums/index.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { Passenger } from '../booking/entities/passenger.entity.js';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { ScheduleCheckpoint } from '../schedule/entities/schedule-checkpoint.entity.js';
import { AttendanceService } from './attendance.service.js';
import { GuideAssignmentService } from './guide-assignment.service.js';
import { IncidentService } from './incident.service.js';
import type { ScheduleOpsOverview } from './types/operations.types.js';

/** Booking được tính là khách thật sự đi tour (khớp `AttendanceService`). */
const TRAVELLING_STATUSES: BookingStatus[] = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED];

/**
 * Bảng điều khiển vận hành theo lịch khởi hành.
 *
 * Không tự truy vấn điểm danh/sự cố mà gọi lại các service chuyên trách để giữ
 * đúng một nguồn logic nghiệp vụ.
 */
@Injectable()
export class OperationsService {
  constructor(
    @InjectRepository(DepartureSchedule) private readonly scheduleRepo: Repository<DepartureSchedule>,
    @InjectRepository(ScheduleCheckpoint) private readonly checkpointRepo: Repository<ScheduleCheckpoint>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    private readonly guideAssignmentService: GuideAssignmentService,
    private readonly attendanceService: AttendanceService,
    private readonly incidentService: IncidentService,
  ) { }

  async scheduleOverview(scheduleId: string, actor: AuthenticatedUser): Promise<ScheduleOpsOverview> {
    const schedule = await this.scheduleRepo.findOne({
      where: { id: scheduleId },
      relations: { tour: true },
    });
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch khởi hành');

    await this.assertInScope(scheduleId, actor);

    const [guides, checkpoints, attendanceSummary, incidents, travellerCount] = await Promise.all([
      this.guideAssignmentService.listBySchedule(scheduleId),
      this.checkpointRepo.find({ where: { scheduleId }, order: { dayNo: 'ASC', sortOrder: 'ASC' } }),
      this.attendanceService.summarizeSchedule(scheduleId),
      this.incidentService.listBySchedule(scheduleId),
      this.countTravellers(scheduleId),
    ]);

    // "chưa điểm danh" = số khách đi tour − số khách đã có ít nhất một bản ghi điểm danh.
    const marked = await this.attendanceService.countMarkedTravellers(scheduleId);
    const unmarked = Math.max(travellerCount - marked, 0);

    return {
      scheduleId,
      tourName: schedule.tour?.name ?? '',
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      status: schedule.status,
      guides,
      checkpoints: checkpoints.map((checkpoint) => ({
        id: checkpoint.id,
        name: checkpoint.name,
        dayNo: checkpoint.dayNo,
        meetTime: checkpoint.meetTime,
      })),
      attendanceSummary: { ...attendanceSummary, unmarked, travellers: travellerCount },
      incidents: incidents.items,
      totalExtraCost: incidents.totalExtraCost,
    };
  }

  // ===== nội bộ =====

  /**
   * HDV chỉ xem được lịch mình đang được phân công; nhân viên có `guide:assign` xem mọi lịch.
   */
  private async assertInScope(scheduleId: string, actor: AuthenticatedUser): Promise<void> {
    if (actor.permissions.includes('guide:assign')) return;

    const guideId = await this.guideAssignmentService.resolveGuideId(actor);
    if (!guideId) throw new ForbiddenException('Tài khoản của bạn chưa có hồ sơ hướng dẫn viên');

    const ids = await this.guideAssignmentService.scheduleIdsForGuide(guideId);
    if (!ids.includes(scheduleId)) {
      throw new ForbiddenException('Bạn không được phân công cho lịch khởi hành này');
    }
  }

  private async countTravellers(scheduleId: string): Promise<number> {
    const bookings = await this.bookingRepo.find({
      where: { scheduleId },
      select: { id: true, status: true },
    });
    const ids = bookings
      .filter((booking) => TRAVELLING_STATUSES.includes(booking.status))
      .map((booking) => booking.id);
    if (ids.length === 0) return 0;

    return this.passengerRepo
      .createQueryBuilder('p')
      .where('p.bookingId IN (:...ids)', { ids })
      .getCount();
  }
}
