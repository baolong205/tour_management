import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { ScheduleStatus } from '../../common/enums/index.js';
import { TourService } from '../catalog/services/tour.service.js';
import type {
  CheckpointDto,
  CreateScheduleDto,
  QuerySchedulesDto,
  UpdateScheduleDto,
} from './dto/schedule.dto.js';
import { DepartureSchedule } from './entities/departure-schedule.entity.js';
import { ScheduleCheckpoint } from './entities/schedule-checkpoint.entity.js';
import { SeatHold } from './entities/seat-hold.entity.js';
import type { CheckpointView, HoldView, ScheduleView } from './types/schedule.types.js';

/** TTL giữ chỗ mặc định – khớp `docs/schema.md` §7.1 (15 phút). */
const HOLD_TTL_MINUTES = 15;

/** Trạng thái lịch được coi là "đã chốt", không cho sửa giá/chỗ. */
const LOCKED_STATUSES: ReadonlySet<ScheduleStatus> = new Set([
  ScheduleStatus.ONGOING,
  ScheduleStatus.COMPLETED,
  ScheduleStatus.CANCELLED,
]);

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(DepartureSchedule) private readonly scheduleRepo: Repository<DepartureSchedule>,
    @InjectRepository(SeatHold) private readonly holdRepo: Repository<SeatHold>,
    private readonly tourService: TourService,
  ) { }

  // ===== truy vấn =====

  async paginate(query: QuerySchedulesDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.scheduleRepo
      .createQueryBuilder('schedule')
      .innerJoin('schedule.tour', 'tour')
      .addSelect(['tour.id', 'tour.code', 'tour.name'])
      // `Tour` xóa mềm: loại lịch của tour đã xóa khỏi danh sách quản trị.
      .where('tour.deletedAt IS NULL');

    if (query.tourId) qb.andWhere('schedule.tourId = :tourId', { tourId: query.tourId });
    if (query.status) qb.andWhere('schedule.status = :status', { status: query.status });
    if (query.fromDate) qb.andWhere('schedule.startDate >= :fromDate', { fromDate: query.fromDate });
    if (query.toDate) qb.andWhere('schedule.startDate <= :toDate', { toDate: query.toDate });

    qb.orderBy('schedule.startDate', 'ASC')
      .addOrderBy('schedule.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [schedules, total] = await qb.getManyAndCount();
    const items = await this.toViews(schedules);
    return { items, total, page, limit };
  }

  /** Lịch còn mở bán của một tour – dùng cho trang chi tiết tour (công khai). */
  async listOpenByTour(tourId: string): Promise<ScheduleView[]> {
    const schedules = await this.scheduleRepo
      .createQueryBuilder('schedule')
      .innerJoin('schedule.tour', 'tour')
      .addSelect(['tour.id', 'tour.code', 'tour.name'])
      .where('schedule.tourId = :tourId', { tourId })
      .andWhere('schedule.status = :open', { open: ScheduleStatus.OPEN })
      .andWhere('schedule.startDate >= :today', { today: this.todayInVietnam() })
      .andWhere('tour.deletedAt IS NULL')
      .orderBy('schedule.startDate', 'ASC')
      .getMany();

    return this.toViews(schedules);
  }

  async getOrFail(id: string): Promise<DepartureSchedule> {
    const schedule = await this.scheduleRepo.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch khởi hành');
    return schedule;
  }

  async getDetail(id: string): Promise<ScheduleView> {
    const schedule = await this.scheduleRepo
      .createQueryBuilder('schedule')
      .innerJoin('schedule.tour', 'tour')
      .addSelect(['tour.id', 'tour.code', 'tour.name'])
      .leftJoinAndSelect('schedule.checkpoints', 'checkpoint')
      .where('schedule.id = :id', { id })
      .andWhere('tour.deletedAt IS NULL')
      .getOne();

    if (!schedule) throw new NotFoundException('Không tìm thấy lịch khởi hành');
    const [view] = await this.toViews([schedule]);
    return view;
  }

  // ===== ghi =====

  async create(dto: CreateScheduleDto): Promise<ScheduleView> {
    this.assertDateRange(dto.startDate, dto.endDate);
    // Chỉ tour đã công bố mới được mở lịch khởi hành (ném 409 nếu chưa).
    await this.tourService.getPublishedOrFail(dto.tourId);

    const id = await this.scheduleRepo.manager.transaction(async (manager) => {
      const schedule = manager.create(DepartureSchedule, {
        tourId: dto.tourId,
        startDate: dto.startDate.slice(0, 10),
        endDate: dto.endDate.slice(0, 10),
        priceAdult: dto.priceAdult,
        priceChild: dto.priceChild,
        priceInfant: dto.priceInfant ?? 0,
        maxSeats: dto.maxSeats,
        soldSeats: 0,
        status: dto.status ?? ScheduleStatus.DRAFT,
        meetingPoint: dto.meetingPoint?.trim() || null,
      });

      const saved = await manager.save(schedule);
      if (dto.checkpoints?.length) await this.syncCheckpoints(manager, saved.id, dto.checkpoints);
      return saved.id;
    });

    return this.getDetail(id);
  }

  /**
   * Cập nhật lịch.
   *
   * Chặn sửa giá/chỗ khi lịch đã `ONGOING`/`COMPLETED`/`CANCELLED` hoặc khi đã bán
   * được chỗ: đổi `max_seats` xuống dưới `sold_seats` sẽ làm dữ liệu vô lý.
   */
  async update(id: string, dto: UpdateScheduleDto): Promise<ScheduleView> {
    const schedule = await this.getOrFail(id);

    if (LOCKED_STATUSES.has(schedule.status)) {
      throw new ConflictException(`Lịch đang ở trạng thái ${schedule.status} – không thể sửa`);
    }

    const startDate = dto.startDate?.slice(0, 10) ?? schedule.startDate;
    const endDate = dto.endDate?.slice(0, 10) ?? schedule.endDate;
    this.assertDateRange(startDate, endDate);

    if (dto.maxSeats !== undefined && dto.maxSeats < schedule.soldSeats) {
      throw new ConflictException(
        `Đã bán ${schedule.soldSeats} chỗ – không thể giảm tổng chỗ xuống ${dto.maxSeats}`,
      );
    }

    if (dto.tourId !== undefined && dto.tourId !== schedule.tourId) {
      await this.tourService.getPublishedOrFail(dto.tourId);
      schedule.tourId = dto.tourId;
    }

    await this.scheduleRepo.manager.transaction(async (manager) => {
      if (dto.startDate !== undefined) schedule.startDate = startDate;
      if (dto.endDate !== undefined) schedule.endDate = endDate;
      if (dto.priceAdult !== undefined) schedule.priceAdult = dto.priceAdult;
      if (dto.priceChild !== undefined) schedule.priceChild = dto.priceChild;
      if (dto.priceInfant !== undefined) schedule.priceInfant = dto.priceInfant;
      if (dto.maxSeats !== undefined) schedule.maxSeats = dto.maxSeats;
      if (dto.status !== undefined) schedule.status = dto.status;
      if (dto.meetingPoint !== undefined) schedule.meetingPoint = dto.meetingPoint?.trim() || null;

      await manager.save(schedule);
      if (dto.checkpoints !== undefined) await this.syncCheckpoints(manager, id, dto.checkpoints);
    });

    return this.getDetail(id);
  }

  /**
   * Đổi trạng thái lịch.
   *
   * Quy tắc bổ sung ngoài việc gán giá trị: mở bán (`OPEN`) thì phải còn chỗ, và
   * `sold_seats` phải khớp với `max_seats` để tự bật `FULL`.
   */
  async updateStatus(id: string, status: ScheduleStatus): Promise<ScheduleView> {
    const schedule = await this.getOrFail(id);

    if (status === ScheduleStatus.OPEN) {
      const held = await this.sumActiveHeldSeats(schedule.id);
      if (schedule.availableSeats(held) <= 0) {
        throw new ConflictException('Lịch đã hết chỗ – không thể mở bán');
      }
      if (schedule.startDate < this.todayInVietnam()) {
        throw new ConflictException('Ngày khởi hành đã qua – không thể mở bán');
      }
    }

    schedule.status = status;
    await this.scheduleRepo.save(schedule);
    return this.getDetail(id);
  }

  /**
   * Xóa lịch. Chặn khi đã có chỗ bán hoặc còn chỗ đang giữ, vì `bookings.schedule_id`
   * là FK `RESTRICT` và khách đang chờ thanh toán sẽ bị treo.
   */
  async remove(id: string): Promise<void> {
    const schedule = await this.getOrFail(id);
    if (schedule.soldSeats > 0) {
      throw new ConflictException(
        `Lịch đã bán ${schedule.soldSeats} chỗ – chỉ có thể hủy lịch, không thể xóa`,
      );
    }

    const activeHolds = await this.holdRepo
      .createQueryBuilder('hold')
      .where('hold.scheduleId = :id', { id })
      .andWhere('hold.releasedAt IS NULL')
      .andWhere('hold.expiresAt > :now', { now: new Date() })
      .getCount();

    if (activeHolds > 0) {
      throw new ConflictException(`Còn ${activeHolds} lượt giữ chỗ đang hiệu lực – chờ hết hạn rồi xóa`);
    }

    await this.scheduleRepo.delete({ id });
  }

  // ===== giữ chỗ =====

  /**
   * Giữ chỗ trong một transaction có **khóa bi quan** trên dòng lịch.
   *
   * Vì sao phải khóa: hai khách cùng bấm "Đặt" ở giây cuối sẽ cùng đọc `held = 0`
   * rồi cùng ghi hold → bán vượt chỗ. `pessimistic_write` sinh `SELECT ... FOR UPDATE`,
   * buộc request thứ hai chờ tới khi request đầu commit rồi mới đọc số chỗ mới.
   *
   * Đây là điểm duy nhất trong module này ghi `seat_holds`; logic booking gọi lại
   * qua `holdSeats` bên trong transaction của chính nó (xem `BookingService.create`).
   */
  async holdSeats(
    scheduleId: string,
    userId: string | null,
    seats: number,
    manager?: EntityManager,
  ): Promise<HoldView> {
    if (seats < 1) throw new BadRequestException('Số chỗ phải lớn hơn 0');

    const run = async (em: EntityManager): Promise<HoldView> => {
      const schedule = await em.getRepository(DepartureSchedule).findOne({
        where: { id: scheduleId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!schedule) throw new NotFoundException('Không tìm thấy lịch khởi hành');

      if (schedule.status !== ScheduleStatus.OPEN) {
        throw new ConflictException(`Lịch đang ở trạng thái ${schedule.status} – chưa mở bán`);
      }
      if (schedule.startDate < this.todayInVietnam()) {
        throw new ConflictException('Ngày khởi hành đã qua');
      }

      // Phải đọc bằng `em` (transaction hiện tại) chứ không dùng `this.holdRepo`:
      // dùng repo ngoài transaction sẽ bỏ qua các hold vừa tạo trong cùng transaction
      // và có thể đọc phải snapshot cũ ⇒ bán vượt chỗ khi nhiều request đồng thời.
      const held = await this.sumActiveHeldSeats(scheduleId, em);
      if (!schedule.canBook(seats, held)) {
        throw new ConflictException(`Chỉ còn ${Math.max(schedule.availableSeats(held), 0)} chỗ trống`);
      }

      const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60_000);
      const hold = await em.save(
        em.create(SeatHold, { scheduleId, userId, seats, expiresAt, releasedAt: null }),
      );

      return this.toHoldView(hold);
    };

    // Nếu đã có transaction bên ngoài (BookingService) thì dùng lại manager đó để
    // hold và booking cùng commit/rollback – tránh giữ chỗ "mồ côi".
    if (manager) return run(manager);
    return this.scheduleRepo.manager.transaction(run);
  }

  async getHoldOrFail(holdId: string): Promise<SeatHold> {
    const hold = await this.holdRepo.findOne({ where: { id: holdId } });
    if (!hold) throw new NotFoundException('Không tìm thấy lượt giữ chỗ');
    return hold;
  }

  /** Nhả chỗ thủ công (khách bấm "Hủy" ở bước thanh toán). Idempotent. */
  async releaseHold(holdId: string, userId: string | null): Promise<{ released: true }> {
    const hold = await this.getHoldOrFail(holdId);
    if (userId && hold.userId && hold.userId !== userId) {
      throw new ForbiddenException('Lượt giữ chỗ này không thuộc tài khoản của bạn');
    }
    if (hold.releasedAt) return { released: true };

    hold.releasedAt = new Date();
    await this.holdRepo.save(hold);
    return { released: true };
  }

  /**
   * Nhả mọi hold còn hiệu lực của một booking (gọi khi booking bị hủy/hết hạn).
   * Dùng trong transaction của module booking nên nhận `manager`.
   */
  async releaseHoldsByBooking(bookingId: string, manager?: EntityManager): Promise<number> {
    const repo = manager ? manager.getRepository(SeatHold) : this.holdRepo;
    const result = await repo
      .createQueryBuilder()
      .update(SeatHold)
      .set({ releasedAt: new Date() })
      .where('booking_id = :bookingId', { bookingId })
      .andWhere('released_at IS NULL')
      .execute();
    return result.affected ?? 0;
  }

  /** Dọn hold quá hạn (job `expire-bookings` sẽ gọi). Trả về số dòng đã nhả. */
  async releaseExpiredHolds(): Promise<number> {
    const result = await this.holdRepo
      .createQueryBuilder()
      .update(SeatHold)
      .set({ releasedAt: new Date() })
      .where('released_at IS NULL')
      .andWhere('expires_at <= :now', { now: new Date() })
      .execute();

    const affected = result.affected ?? 0;
    if (affected > 0) this.logger.log(`Đã nhả ${affected} lượt giữ chỗ quá hạn`);
    return affected;
  }

  /**
   * Đồng bộ trạng thái lịch khởi hành theo thời gian thực (job định kỳ gọi).
   *
   * Trước đây `status` chỉ đổi khi có người bấm tay, nên các lịch đã qua ngày
   * vẫn nằm ở `OPEN/FULL` mãi ⇒ booking không bao giờ sang `COMPLETED` ⇒ khách
   * không thể đánh giá tour (Review yêu cầu booking `COMPLETED`).
   *
   * Luồng chuyển trạng thái (chỉ tiến, không lùi):
   * - `OPEN|FULL` + đã tới `start_date`  → `ONGOING` (ghi `startedAt` nếu trống).
   * - `OPEN|FULL|ONGOING` + đã qua `end_date` → `COMPLETED` (ghi `finishedAt`).
   *
   * Dùng `<=` trên chuỗi `YYYY-MM-DD` (cùng múi giờ VN) để so sánh ngày.
   * Trả về số lịch đã cập nhật để cron ghi log.
   */
  async syncScheduleStatuses(): Promise<number> {
    const today = this.todayInVietnam();
    const now = new Date();
    let affected = 0;

    // 1) Đã tới ngày khởi hành nhưng chưa chạy ⇒ ONGOING.
    const started = await this.scheduleRepo
      .createQueryBuilder()
      .update(DepartureSchedule)
      .set({ status: ScheduleStatus.ONGOING, startedAt: () => 'COALESCE(started_at, :now)' })
      .setParameter('now', now)
      .where('status IN (:...statuses)', { statuses: [ScheduleStatus.OPEN, ScheduleStatus.FULL] })
      .andWhere('start_date <= :today', { today })
      .andWhere('end_date >= :today', { today })
      .execute();
    affected += started.affected ?? 0;

    // 2) Đã qua ngày kết thúc ⇒ COMPLETED (gồm cả lịch còn sót ở OPEN/FULL
    //    do không ai mở bán, để không kẹt vĩnh viễn ở trạng thái mở).
    const finished = await this.scheduleRepo
      .createQueryBuilder()
      .update(DepartureSchedule)
      .set({ status: ScheduleStatus.COMPLETED, finishedAt: () => 'COALESCE(finished_at, :now)' })
      .setParameter('now', now)
      .where('status IN (:...statuses)', {
        statuses: [ScheduleStatus.OPEN, ScheduleStatus.FULL, ScheduleStatus.ONGOING],
      })
      .andWhere('end_date < :today', { today })
      .execute();

    const completed = finished.affected ?? 0;
    affected += completed;

    if (affected > 0) {
      this.logger.log(`Đồng bộ trạng thái lịch: ${started.affected ?? 0} → ONGOING, ${completed} → COMPLETED`);
    }
    return affected;
  }

  /** Tổng số chỗ đang giữ còn hiệu lực của một lịch. */
  async sumActiveHeldSeats(scheduleId: string, manager?: EntityManager): Promise<number> {
    const repo = manager ? manager.getRepository(SeatHold) : this.holdRepo;
    const row = await repo
      .createQueryBuilder('hold')
      .select('COALESCE(SUM(hold.seats), 0)', 'held')
      .where('hold.scheduleId = :scheduleId', { scheduleId })
      .andWhere('hold.releasedAt IS NULL')
      .andWhere('hold.expiresAt > :now', { now: new Date() })
      .getRawOne<{ held: string | number }>();

    return Number(row?.held ?? 0);
  }

  // ===== nội bộ =====

  private async toViews(schedules: DepartureSchedule[]): Promise<ScheduleView[]> {
    if (schedules.length === 0) return [];

    // Một truy vấn gom cho cả trang thay vì N lần đếm hold.
    const ids = schedules.map((schedule) => schedule.id);
    const rows = await this.holdRepo
      .createQueryBuilder('hold')
      .select('hold.scheduleId', 'scheduleId')
      .addSelect('COALESCE(SUM(hold.seats), 0)', 'held')
      .where('hold.scheduleId IN (:...ids)', { ids })
      .andWhere('hold.releasedAt IS NULL')
      .andWhere('hold.expiresAt > :now', { now: new Date() })
      .groupBy('hold.scheduleId')
      .getRawMany<{ scheduleId: string; held: string | number }>();

    const heldBySchedule = new Map(rows.map((row) => [row.scheduleId, Number(row.held)]));

    return schedules.map((schedule) => {
      const heldSeats = heldBySchedule.get(schedule.id) ?? 0;
      return {
        id: schedule.id,
        tourId: schedule.tourId,
        tourCode: schedule.tour?.code ?? '',
        tourName: schedule.tour?.name ?? '',
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        priceAdult: schedule.priceAdult,
        priceChild: schedule.priceChild,
        priceInfant: schedule.priceInfant,
        maxSeats: schedule.maxSeats,
        soldSeats: schedule.soldSeats,
        heldSeats,
        availableSeats: Math.max(schedule.availableSeats(heldSeats), 0),
        status: schedule.status,
        meetingPoint: schedule.meetingPoint ?? null,
        startedAt: schedule.startedAt ?? null,
        finishedAt: schedule.finishedAt ?? null,
        checkpoints: (schedule.checkpoints ?? [])
          .map((checkpoint) => this.toCheckpointView(checkpoint))
          .sort((a, b) => a.dayNo - b.dayNo || a.sortOrder - b.sortOrder || a.meetTime.localeCompare(b.meetTime)),
      };
    });
  }

  private toCheckpointView(checkpoint: ScheduleCheckpoint): CheckpointView {
    return {
      id: checkpoint.id,
      name: checkpoint.name,
      meetTime: checkpoint.meetTime,
      dayNo: checkpoint.dayNo,
      sortOrder: checkpoint.sortOrder,
    };
  }

  private toHoldView(hold: SeatHold): HoldView {
    return {
      holdId: hold.id,
      scheduleId: hold.scheduleId,
      seats: hold.seats,
      expiresAt: hold.expiresAt,
      expiresInSeconds: Math.max(Math.floor((hold.expiresAt.getTime() - Date.now()) / 1000), 0),
      bookingId: hold.bookingId ?? null,
    };
  }

  private async syncCheckpoints(
    manager: EntityManager,
    scheduleId: string,
    checkpoints: CheckpointDto[],
  ): Promise<void> {
    await manager.delete(ScheduleCheckpoint, { scheduleId });
    if (checkpoints.length === 0) return;

    // `time` của MySQL nhận `HH:mm` hoặc `HH:mm:ss`; chuẩn hóa để đồng nhất dữ liệu.
    const rows = checkpoints.map((checkpoint, index) =>
      manager.create(ScheduleCheckpoint, {
        scheduleId,
        name: checkpoint.name.trim(),
        meetTime: checkpoint.meetTime.length === 5 ? `${checkpoint.meetTime}:00` : checkpoint.meetTime,
        dayNo: checkpoint.dayNo ?? 1,
        sortOrder: checkpoint.sortOrder ?? index,
      }),
    );
    await manager.save(rows);
  }

  /**
   * `CHECK (end_date >= start_date)` không khai báo được bằng decorator trên MySQL,
   * nên kiểm ở service. So sánh chuỗi `YYYY-MM-DD` là đủ và không lệch múi giờ.
   */
  private assertDateRange(startDate: string, endDate: string): void {
    if (endDate.slice(0, 10) < startDate.slice(0, 10)) {
      throw new BadRequestException('Ngày kết thúc phải sau hoặc bằng ngày khởi hành');
    }
  }

  private todayInVietnam(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
}
