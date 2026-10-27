import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { In } from 'typeorm';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import {
  AuditEvent,
  DomainEvents,
  NotifyEvent,
  type DomainEventPayload,
} from '../../common/events/domain-events.js';
import { BookingChannel, BookingStatus, CancelRequestStatus, PassengerType, ScheduleStatus } from '../../common/enums/index.js';
import { CancelPolicyService } from '../catalog/services/cancel-policy.service.js';
import { TourService } from '../catalog/services/tour.service.js';
import { Promotion } from '../promotion/entities/promotion.entity.js';
import { PromotionService } from '../promotion/promotion.service.js';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { SeatHold } from '../schedule/entities/seat-hold.entity.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import type {
  ConfirmBookingDto,
  CreateBookingDto,
  CreateCounterBookingDto,
  PassengerInputDto,
  ProcessCancelDto,
  QueryBookingsDto,
  RejectBookingDto,
  RequestCancelDto,
} from './dto/booking.dto.js';
import { Booking } from './entities/booking.entity.js';
import { CancelRequest } from './entities/cancel-request.entity.js';
import type { PolicySnapshot } from './entities/cancel-request.entity.js';
import { Invoice } from './entities/invoice.entity.js';
import type { InvoiceLine, InvoiceSnapshot } from './entities/invoice.entity.js';
import { Passenger } from './entities/passenger.entity.js';
import type {
  BookingDetailView,
  BookingQuote,
  BookingSummaryView,
  CancelRequestView,
  InvoiceView,
  PassengerView,
} from './types/booking.types.js';

/** Thời gian giữ chỗ cho booking chờ thanh toán – khớp TTL của `seat_holds`. */
const PAYMENT_TTL_MINUTES = 15;

/** Em bé dưới ngưỡng này không chiếm ghế (ngồi cùng người lớn). */
const INFANT_MAX_AGE = 2;

/** Trẻ em dưới ngưỡng này tính giá trẻ em. */
const CHILD_MAX_AGE = 12;

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(CancelRequest) private readonly cancelRepo: Repository<CancelRequest>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Promotion) private readonly promotionRepo: Repository<Promotion>,
    @InjectRepository(DepartureSchedule) private readonly scheduleRepo: Repository<DepartureSchedule>,
    private readonly scheduleService: ScheduleService,
    private readonly tourService: TourService,
    private readonly cancelPolicyService: CancelPolicyService,
    private readonly promotionService: PromotionService,
    private readonly events: EventEmitter2,
  ) { }

  /**
   * Phát sự kiện audit + thông báo cho một thay đổi trạng thái booking.
   *
   * Gọi **sau khi transaction đã commit** (không phải bên trong transaction):
   * nếu phát bên trong, listener có thể đọc phải dữ liệu chưa commit hoặc ghi
   * audit cho một giao dịch về sau bị rollback.
   *
   * `emitAsync` được await để thứ tự log/thông báo ổn định khi test, nhưng
   * listener tự nuốt lỗi nên không thể làm hỏng request.
   */
  private async emitBookingEvent(
    action: string,
    name: (typeof DomainEvents)[keyof typeof DomainEvents],
    booking: Booking,
    actor: AuthenticatedUser,
    options: { title: string; body?: string; notificationType?: string; before?: Record<string, unknown> } = {
      title: '',
    },
  ): Promise<void> {
    const payload: DomainEventPayload = {
      entityType: 'booking',
      entityId: booking.id,
      actorId: actor.id,
      // Khách sở hữu đơn là người cần biết kết quả; nhân viên thao tác thì không.
      notifyUserIds: booking.customerId ? [booking.customerId] : [],
      title: options.title,
      body: options.body ?? null,
      /**
       * Phải là một giá trị **có thật** trong enum `NotificationType`, nếu không
       * bản ghi `notifications.type` sẽ chứa chuỗi lạ và client lọc theo enum
       * sẽ không bao giờ thấy thông báo. Suy ra trực tiếp từ tên sự kiện
       * (`booking.confirmed` → `BOOKING_CONFIRMED`) để không phải khai báo lặp.
       */
      notificationType: options.notificationType ?? this.notificationTypeOf(name),
      before: options.before ?? null,
      after: { status: booking.status, bookingCode: booking.code },
      payload: { bookingId: booking.id, bookingCode: booking.code, status: booking.status },
    };

    await this.events.emitAsync('audit', new AuditEvent(action, payload));
    await this.events.emitAsync('notify', new NotifyEvent(name, payload));
  }

  /** `booking.confirmed` → `BOOKING_CONFIRMED` (khớp enum `NotificationType`). */
  private notificationTypeOf(name: string): string {
    return name.replace('.', '_').toUpperCase();
  }

  // ===== truy vấn =====

  async paginate(query: QueryBookingsDto, actor: AuthenticatedUser) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.schedule', 'schedule')
      .innerJoinAndSelect('schedule.tour', 'tour')
      .leftJoinAndSelect('booking.promotion', 'promotion')
      .where('tour.deletedAt IS NULL');

    // Khách chỉ thấy booking của mình; nhân viên có `booking:read` xem được tất cả
    // (controller đã chặn quyền, ở đây chỉ áp phạm vi dữ liệu).
    if (!this.canReadAll(actor)) qb.andWhere('booking.customerId = :actorId', { actorId: actor.id });
    if (query.customerId) qb.andWhere('booking.customerId = :customerId', { customerId: query.customerId });
    if (query.status) qb.andWhere('booking.status = :status', { status: query.status });
    if (query.scheduleId) qb.andWhere('booking.scheduleId = :scheduleId', { scheduleId: query.scheduleId });
    if (query.fromDate) qb.andWhere('schedule.startDate >= :fromDate', { fromDate: query.fromDate.slice(0, 10) });
    if (query.toDate) qb.andWhere('schedule.startDate <= :toDate', { toDate: query.toDate.slice(0, 10) });

    if (query.search) {
      qb.andWhere(
        '(booking.code LIKE :kw OR booking.contactName LIKE :kw OR booking.contactPhone LIKE :kw OR booking.contactEmail LIKE :kw)',
        { kw: `%${query.search.trim()}%` },
      );
    }

    qb.orderBy('booking.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [bookings, total] = await qb.getManyAndCount();
    const counts = await this.countPassengers(bookings.map((booking) => booking.id));

    const items = bookings.map((booking) => this.toSummary(booking, counts.get(booking.id) ?? 0));
    return { items, total, page, limit };
  }

  /** Booking của chính khách đang đăng nhập – luôn giới hạn theo `customerId`. */
  async listMine(query: QueryBookingsDto, actor: AuthenticatedUser) {
    return this.paginate({ ...query, customerId: undefined }, { ...actor, permissions: [] });
  }

  async getDetail(id: string, actor: AuthenticatedUser): Promise<BookingDetailView> {
    const booking = await this.loadFull(id);
    const canReadAll = this.canReadAll(actor);
    if (!canReadAll && booking.customerId !== actor.id) {
      throw new ForbiddenException('Bạn không có quyền xem booking này');
    }
    return this.toDetail(booking);
  }

  /** Dùng nội bộ cho module payment/review – bỏ qua kiểm quyền. */
  async getOrFail(id: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    return booking;
  }

  async getByCode(code: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { code: code.trim().toUpperCase() } });
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    return booking;
  }

  /** Báo giá trước khi đặt – cho FE thấy đúng số tiền server sẽ thu. */
  async quote(
    scheduleId: string,
    passengers: PassengerInputDto[],
    promotionCode?: string,
  ): Promise<BookingQuote> {
    const schedule = await this.loadScheduleOrFail(scheduleId);
    const priced = this.pricePassengers(schedule, passengers);
    const seatCount = this.countSeats(priced);

    const promotion = promotionCode ? await this.findPromotionOrFail(promotionCode, priced.subtotal) : null;
    const discount = promotion ? promotion.calculateDiscount(priced.subtotal) : 0;

    const held = await this.scheduleService.sumActiveHeldSeats(scheduleId);
    return {
      scheduleId,
      tourId: schedule.tourId,
      tourName: schedule.tour?.name ?? '',
      startDate: schedule.startDate,
      lines: this.groupLines(priced),
      seatCount,
      subtotal: priced.subtotal,
      discount,
      total: priced.subtotal - discount,
      promotionCode: promotion?.code ?? null,
      availableSeats: Math.max(schedule.availableSeats(held), 0),
      canBook: schedule.status === ScheduleStatus.OPEN && schedule.canBook(seatCount, held),
    };
  }

  // ===== tạo booking =====

  /**
   * Đặt tour (kênh online hoặc quầy).
   *
   * Toàn bộ nằm trong **một transaction** theo `docs/schema.md` §7.1:
   * 1. Giữ chỗ (khóa bi quan dòng `departure_schedules`) – qua `ScheduleService`.
   * 2. Tạo `bookings` + `passengers` với giá **tính lại ở server**.
   * 3. Gắn `hold.bookingId` để dọn chỗ khi booking hết hạn/hủy.
   */
  async create(
    dto: CreateBookingDto,
    actor: AuthenticatedUser,
    options: { asCounter?: boolean } = {},
  ): Promise<BookingDetailView> {
    const counter = options.asCounter === true;
    const customerId = await this.resolveCustomerId(dto, actor, counter);
    const schedule = await this.loadScheduleOrFail(dto.scheduleId);

    this.assertBookable(schedule);
    const priced = this.pricePassengers(schedule, dto.passengers);
    const seatCount = this.countSeats(priced);
    if (seatCount < 1) throw new BadRequestException('Booking phải có ít nhất 1 chỗ');

    const promotion = dto.promotionCode
      ? await this.findPromotionOrFail(dto.promotionCode, priced.subtotal)
      : null;

    const id = await this.bookingRepo.manager.transaction(async (manager) => {
      // Bước 1: giữ chỗ. Nếu client đã giữ trước thì dùng lại hold đó, không giữ thêm.
      const hold = dto.holdId
        ? await this.consumeHold(dto.holdId, actor.id, seatCount, manager)
        : await this.scheduleService.holdSeats(schedule.id, actor.id, seatCount, manager);

      // Bước 2: dựng booking. Tiền lấy từ `priced`, không đọc bất kỳ số nào từ client.
      const booking = manager.create(Booking, {
        code: await this.nextBookingCode(manager),
        scheduleId: schedule.id,
        customerId,
        createdBy: counter ? actor.id : null,
        channel: dto.channel ?? (counter ? BookingChannel.COUNTER : BookingChannel.ONLINE),
        contactName: dto.contactName.trim(),
        contactPhone: dto.contactPhone.trim(),
        contactEmail: dto.contactEmail.trim().toLowerCase(),
        subtotal: priced.subtotal,
        discount: 0,
        total: priced.subtotal,
        promotionId: promotion?.id ?? null,
        status: BookingStatus.PENDING_PAYMENT,
        // Khách trả tiền mặt tại quầy: không cần hạn thanh toán.
        expiresAt: counter ? null : new Date(Date.now() + PAYMENT_TTL_MINUTES * 60_000),
        holdId: hold.holdId,
        seatCount,
        note: dto.note?.trim() || null,
      });
      booking.passengers = priced.lines.map((line) =>
        manager.create(Passenger, {
          bookingId: booking.id,
          fullName: line.fullName,
          dob: line.dob,
          gender: line.gender ?? null,
          idNumber: line.idNumber ?? null,
          type: line.type,
          unitPrice: line.unitPrice,
        }),
      );
      // `recalculateTotals` là nguồn sự thật cuối cùng của `subtotal/discount/total`.
      booking.recalculateTotals(promotion ? promotion.calculateDiscount(priced.subtotal) : 0);

      const saved = await manager.save(Booking, booking);

      // Bước 3: nối hold với booking để job dọn chỗ tìm lại được.
      await manager.update(SeatHold, { id: hold.holdId }, { bookingId: saved.id });

      // Tăng `usedCount` qua PromotionService: câu UPDATE có điều kiện
      // `used_count < usage_limit` nên hai request đồng thời không vượt trần.
      if (promotion) {
        await this.promotionService.reserveForBooking(promotion.id, manager);
      }

      this.logger.log(`Tạo booking ${saved.code} (${seatCount} chỗ) cho lịch ${schedule.id}`);
      return saved.id;
    });

    return this.getDetail(id, actor);
  }

  /** Nhân viên tạo booking tại quầy; có thể chỉ định `customerId` khác người tạo. */
  async createAtCounter(dto: CreateCounterBookingDto, actor: AuthenticatedUser): Promise<BookingDetailView> {
    return this.create({ ...dto, channel: dto.channel ?? BookingChannel.COUNTER }, actor, { asCounter: true });
  }

  // ===== xác nhận / từ chối =====

  /**
   * Xác nhận booking: chuyển `PENDING_CONFIRMATION` (đã thanh toán) hoặc
   * `PENDING_PAYMENT` → `CONFIRMED`, tăng `sold_seats` của lịch và nhả hold.
   *
   * `sold_seats` chỉ tăng ở đây (không tăng lúc tạo) để chỗ đang chờ thanh toán
   * không bị tính là đã bán.
   */
  async confirm(id: string, actor: AuthenticatedUser, dto: ConfirmBookingDto): Promise<BookingDetailView> {
    // Trả về `booking` từ transaction thay vì gán qua closure: TypeScript không
    // theo dõi được phép gán trong callback nên sẽ thu hẹp kiểu sai (`never`).
    const changed = await this.bookingRepo.manager.transaction(async (manager) => {
      const booking = await this.lockBooking(manager, id);

      if (booking.status === BookingStatus.CONFIRMED) return null; // idempotent
      booking.transitionTo(BookingStatus.CONFIRMED);
      booking.confirmedBy = actor.id;
      booking.confirmedAt = new Date();
      booking.expiresAt = null;
      if (dto.note !== undefined) booking.note = dto.note?.trim() || null;

      await manager.save(Booking, booking);
      await manager.increment(DepartureSchedule, { id: booking.scheduleId }, 'soldSeats', booking.seatCount);
      await this.scheduleService.releaseHoldsByBooking(booking.id, manager);
      return booking;
    });

    // Chỉ phát sự kiện khi trạng thái thực sự đổi (bỏ qua lần gọi idempotent).
    if (changed) {
      await this.emitBookingEvent(DomainEvents.BOOKING_CONFIRMED, DomainEvents.BOOKING_CONFIRMED, changed, actor, {
        title: `Đơn ${changed.code} đã được xác nhận`,
        body: 'Đơn đặt tour của bạn đã được xác nhận. Vui lòng kiểm tra thông tin trong chi tiết đơn.',
        before: { status: BookingStatus.PENDING_CONFIRMATION },
      });
    }

    return this.getDetail(id, actor);
  }

  /** Từ chối booking (không liên hệ được khách, nghi vấn…) → nhả chỗ. */
  async reject(id: string, actor: AuthenticatedUser, dto: RejectBookingDto): Promise<BookingDetailView> {
    const changed = await this.bookingRepo.manager.transaction(async (manager) => {
      const booking = await this.lockBooking(manager, id);
      booking.transitionTo(BookingStatus.REJECTED);
      booking.note = `${booking.note ? `${booking.note}\n` : ''}Lý do từ chối: ${dto.reason.trim()}`;
      booking.expiresAt = null;
      await manager.save(Booking, booking);
      await this.scheduleService.releaseHoldsByBooking(booking.id, manager);
      await this.releasePromotion(manager, booking);
      return booking;
    });

    await this.emitBookingEvent(DomainEvents.BOOKING_REJECTED, DomainEvents.BOOKING_REJECTED, changed, actor, {
      title: `Đơn ${changed.code} đã bị từ chối`,
      body: `Lý do: ${dto.reason.trim()}. Chỗ đã được mở lại cho khách khác.`,
    });

    return this.getDetail(id, actor);
  }

  /**
   * Hủy trực tiếp (nhân viên hủy hộ, không qua yêu cầu).
   * Vẫn đi qua chính sách hủy để ghi nhận phí/hoàn tiền.
   */
  async cancel(id: string, actor: AuthenticatedUser, reason: string): Promise<BookingDetailView> {
    const changed = await this.bookingRepo.manager.transaction(async (manager) => {
      const booking = await this.lockBooking(manager, id);
      if (booking.status === BookingStatus.CANCELLED) return null;

      this.applyCancellation(booking, reason);
      await manager.save(Booking, booking);
      await this.releaseSeats(manager, booking);
      await this.releasePromotion(manager, booking);
      await this.markPendingCancelRequests(manager, booking.id, CancelRequestStatus.REJECTED, actor.id, reason);
      return booking;
    });

    if (changed) {
      await this.emitBookingEvent(DomainEvents.BOOKING_CANCELLED, DomainEvents.BOOKING_CANCELLED, changed, actor, {
        title: `Đơn ${changed.code} đã bị hủy`,
        body: `Lý do: ${reason.trim()}`,
      });
    }

    return this.getDetail(id, actor);
  }

  // ===== yêu cầu hủy =====

  /**
   * Khách gửi yêu cầu hủy.
   *
   * Phí được tính **ngay lúc gửi** và chụp lại `policy_snapshot` + `feePercent` +
   * `feeAmount` + `refundAmount`. Nhờ vậy admin sửa chính sách sau đó không làm
   * thay đổi số tiền của yêu cầu đã gửi.
   */
  async requestCancel(id: string, actor: AuthenticatedUser, dto: RequestCancelDto): Promise<BookingDetailView> {
    const booking = await this.loadFull(id);
    if (booking.customerId !== actor.id && !this.canReadAll(actor)) {
      throw new ForbiddenException('Bạn không có quyền hủy booking này');
    }
    if (booking.status === BookingStatus.CANCEL_REQUESTED) {
      throw new ConflictException('Booking đã có yêu cầu hủy đang chờ xử lý');
    }

    const openRequest = await this.cancelRepo.findOne({
      where: { bookingId: id, status: CancelRequestStatus.PENDING },
    });
    if (openRequest) throw new ConflictException('Booking đã có yêu cầu hủy đang chờ xử lý');

    const schedule = booking.schedule ?? (await this.loadScheduleOrFail(booking.scheduleId));
    const startDate = schedule.startDate;

    // Không cho hủy sau khi tour đã khởi hành.
    if (startDate < this.todayInVietnam()) {
      throw new ConflictException('Tour đã khởi hành – không thể gửi yêu cầu hủy');
    }

    const quote = await this.cancelPolicyService.quoteFee(
      await this.resolveCancelPolicyId(schedule.tourId),
      booking.total,
      startDate,
    );

    const changed = await this.bookingRepo.manager.transaction(async (manager) => {
      const locked = await this.lockBooking(manager, id);
      locked.requestCancel();

      const snapshot: PolicySnapshot = {
        policyId: quote.policyId,
        policyName: quote.policyName,
        rules: quote.rules.map((rule) => ({ daysBefore: rule.daysBefore, feePercent: rule.feePercent })),
        startDate: quote.startDate,
      };

      const request = manager.create(CancelRequest, {
        bookingId: locked.id,
        requestedBy: actor.id,
        reason: dto.reason.trim(),
        status: CancelRequestStatus.PENDING,
        // `fee_percent` là `tinyint` nên entity `calculateFee` đã trả số nguyên.
        feePercent: quote.feePercent,
        feeAmount: quote.fee,
        refundAmount: quote.refund,
        policySnapshot: snapshot,
      });

      await manager.save(Booking, locked);
      await manager.save(CancelRequest, request);
      return locked;
    });

    await this.emitBookingEvent(
      DomainEvents.BOOKING_CANCELLED,
      DomainEvents.BOOKING_CANCELLED,
      changed,
      actor,
      {
        title: `Đơn ${changed.code}: đã gửi yêu cầu hủy`,
        body: `Lý do: ${dto.reason.trim()}. Bộ phận chăm sóc khách hàng sẽ xử lý trong thời gian sớm nhất.`,
        // Khác với huỷ trực tiếp: đây mới là *yêu cầu*, đơn còn chờ duyệt.
        notificationType: 'CANCEL_REQUESTED',
      },
    );

    return this.getDetail(id, actor);
  }

  /**
   * Nhân viên xử lý yêu cầu hủy.
   *
   * `approve = true` → booking `CANCELLED`, tiền phí/hoàn lấy từ bản ghi
   * `cancel_requests` (không tính lại, tránh lệch với con số đã báo khách).
   * `approve = false` → `rejectCancel()`, booking về trạng thái cũ.
   */
  async processCancel(
    id: string,
    actor: AuthenticatedUser,
    dto: ProcessCancelDto,
  ): Promise<BookingDetailView> {
    if (!dto.approve && !dto.rejectReason?.trim()) {
      throw new BadRequestException('Từ chối yêu cầu hủy phải nêu lý do');
    }

    await this.bookingRepo.manager.transaction(async (manager) => {
      const booking = await this.lockBooking(manager, id);
      const request = await manager.getRepository(CancelRequest).findOne({
        where: { bookingId: id, status: CancelRequestStatus.PENDING },
        order: { createdAt: 'DESC' },
      });
      if (!request) throw new NotFoundException('Không có yêu cầu hủy nào đang chờ xử lý');

      request.processedBy = actor.id;
      request.processedAt = new Date();

      if (dto.approve) {
        request.status = CancelRequestStatus.APPROVED;
        booking.transitionTo(BookingStatus.CANCELLED);
        booking.statusBeforeCancel = null;
        booking.expiresAt = null;
        await this.releaseSeats(manager, booking);
        await this.releasePromotion(manager, booking);
      } else {
        request.status = CancelRequestStatus.REJECTED;
        request.rejectReason = dto.rejectReason!.trim();
        booking.rejectCancel();
      }

      await manager.save(CancelRequest, request);
      await manager.save(Booking, booking);
    });

    return this.getDetail(id, actor);
  }

  // ===== hóa đơn =====

  /**
   * Xuất hóa đơn cho booking đã xác nhận.
   *
   * `number` sinh từ `MAX(number)` (MySQL không có sequence) và được bảo vệ bởi
   * unique index `uq_invoices_number` – nếu hai request đua nhau, request thua sẽ
   * nhận lỗi 1062 và service ném 409 để client thử lại.
   */
  async issueInvoice(id: string, actor: AuthenticatedUser): Promise<InvoiceView> {
    const booking = await this.loadFull(id);
    if (!this.isInvoiceable(booking.status)) {
      throw new ConflictException('Chỉ xuất hóa đơn cho booking đã xác nhận hoặc đã hoàn thành');
    }

    const existing = await this.invoiceRepo.findOne({ where: { bookingId: id } });
    if (existing) return this.toInvoiceView(existing);

    const invoice = await this.invoiceRepo.manager.transaction(async (manager) => {
      const number = await this.nextInvoiceNumber(manager);
      const snapshot = this.buildInvoiceSnapshot(booking);

      return manager.save(
        Invoice,
        manager.create(Invoice, {
          bookingId: booking.id,
          number,
          issuedAt: new Date(),
          pdfUrl: null,
          snapshot,
        }),
      );
    });

    this.logger.log(`Xuất hóa đơn ${invoice.number} cho booking ${booking.code} (bởi ${actor.email})`);
    return this.toInvoiceView(invoice);
  }

  async getInvoice(id: string, actor: AuthenticatedUser): Promise<InvoiceView> {
    const booking = await this.loadFull(id);
    if (!this.canReadAll(actor) && booking.customerId !== actor.id) {
      throw new ForbiddenException('Bạn không có quyền xem hóa đơn này');
    }
    const invoice = await this.invoiceRepo.findOne({ where: { bookingId: id } });
    if (!invoice) throw new NotFoundException('Booking chưa có hóa đơn');
    return this.toInvoiceView(invoice);
  }

  // ===== job nền =====

  /**
   * Hết hạn các booking chờ thanh toán quá `expires_at` → `EXPIRED` + nhả chỗ.
   * Gọi từ job `expire-bookings` (`docs/schema.md` §7.3).
   */
  async expireOverdueBookings(): Promise<number> {
    const overdue = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.status = :status', { status: BookingStatus.PENDING_PAYMENT })
      .andWhere('booking.expiresAt IS NOT NULL')
      .andWhere('booking.expiresAt <= :now', { now: new Date() })
      .select('booking.id', 'id')
      .limit(500)
      .getRawMany<{ id: string }>();

    let expired = 0;
    for (const row of overdue) {
      try {
        await this.bookingRepo.manager.transaction(async (manager) => {
          const booking = await this.lockBooking(manager, row.id);
          if (booking.status !== BookingStatus.PENDING_PAYMENT) return;
          booking.transitionTo(BookingStatus.EXPIRED);
          booking.expiresAt = null;
          await manager.save(Booking, booking);
          await this.scheduleService.releaseHoldsByBooking(booking.id, manager);
          await this.releasePromotion(manager, booking);
          expired += 1;
        });
      } catch (error) {
        // Một booking lỗi không được chặn cả lô.
        this.logger.warn(`Không hết hạn được booking ${row.id}: ${(error as Error).message}`);
      }
    }

    if (expired > 0) this.logger.log(`Đã chuyển ${expired} booking sang EXPIRED`);
    return expired;
  }

  // ===== nội bộ: transaction helpers =====

  /**
   * Đọc booking kèm khóa bi quan để hai thao tác đồng thời (vd thanh toán về cùng
   * lúc nhân viên xác nhận) không ghi đè trạng thái của nhau.
   */
  private async lockBooking(manager: EntityManager, id: string): Promise<Booking> {
    const booking = await manager.getRepository(Booking).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    return booking;
  }

  /**
   * Dùng hold khách đã tạo trước đó.
   *
   * `holdSeats` đã khóa dòng lịch và kiểm tra sức chứa, nhưng ở đây chỉ kiểm lại
   * số chỗ của hold: nếu hold còn hiệu lực thì chỗ đã được trừ trong
   * `availableSeats` nên không cần khóa lại (tránh deadlock).
   */
  private async consumeHold(holdId: string, userId: string, seats: number, manager: EntityManager) {
    const hold = await manager.getRepository(SeatHold).findOne({
      where: { id: holdId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!hold) throw new NotFoundException('Không tìm thấy lượt giữ chỗ');
    if (hold.releasedAt) throw new ConflictException('Lượt giữ chỗ đã bị nhả – hãy giữ chỗ lại');
    if (hold.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException('Lượt giữ chỗ đã hết hạn – hãy giữ chỗ lại');
    }
    if (hold.bookingId) throw new ConflictException('Lượt giữ chỗ này đã được dùng cho booking khác');
    if (hold.userId && hold.userId !== userId) {
      throw new ForbiddenException('Lượt giữ chỗ này không thuộc tài khoản của bạn');
    }
    if (hold.seats !== seats) {
      throw new ConflictException(
        `Lượt giữ chỗ đang giữ ${hold.seats} chỗ nhưng booking có ${seats} chỗ – hãy giữ chỗ lại`,
      );
    }

    return { holdId: hold.id, scheduleId: hold.scheduleId, seats: hold.seats, expiresAt: hold.expiresAt };
  }

  /** Giảm `sold_seats` khi hủy booking đã xác nhận, rồi nhả hold còn lại. */
  private async releaseSeats(manager: EntityManager, booking: Booking): Promise<void> {
    if (booking.confirmedAt) {
      const schedule = await manager.getRepository(DepartureSchedule).findOne({
        where: { id: booking.scheduleId },
        lock: { mode: 'pessimistic_write' },
      });
      if (schedule) {
        schedule.soldSeats = Math.max(schedule.soldSeats - booking.seatCount, 0);
        // Lịch đã FULL mà có chỗ trả lại thì mở bán tiếp.
        if (schedule.status === ScheduleStatus.FULL && schedule.availableSeats() > 0) {
          schedule.status = ScheduleStatus.OPEN;
        }
        await manager.save(DepartureSchedule, schedule);
      }
    }
    await this.scheduleService.releaseHoldsByBooking(booking.id, manager);
  }

  /** Đánh dấu các yêu cầu hủy còn treo khi booking bị hủy trực tiếp. */
  private async markPendingCancelRequests(
    manager: EntityManager,
    bookingId: string,
    status: CancelRequestStatus,
    actorId: string,
    reason: string,
  ): Promise<void> {
    await manager
      .getRepository(CancelRequest)
      .createQueryBuilder()
      .update(CancelRequest)
      .set({
        status,
        processedBy: actorId,
        processedAt: new Date(),
        rejectReason: status === CancelRequestStatus.REJECTED ? `Booking đã được hủy trực tiếp: ${reason}` : null,
      })
      .where('booking_id = :bookingId', { bookingId })
      .andWhere('status = :pending', { pending: CancelRequestStatus.PENDING })
      .execute();
  }

  /**
   * Hủy booking + ghi nhận phí/hoàn tiền vào ghi chú.
   * Dùng chung cho hủy trực tiếp; luồng qua yêu cầu dùng snapshot của `CancelRequest`.
   */
  private applyCancellation(booking: Booking, reason: string): void {
    booking.transitionTo(BookingStatus.CANCELLED);
    booking.statusBeforeCancel = null;
    booking.expiresAt = null;
    booking.note = `${booking.note ? `${booking.note}\n` : ''}Hủy: ${reason.trim()}`;
  }

  // ===== nội bộ: đọc dữ liệu =====

  private async loadScheduleOrFail(scheduleId: string): Promise<DepartureSchedule> {
    const schedule = await this.scheduleRepo
      .createQueryBuilder('schedule')
      .innerJoinAndSelect('schedule.tour', 'tour')
      .where('schedule.id = :scheduleId', { scheduleId })
      .andWhere('tour.deletedAt IS NULL')
      .getOne();
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch khởi hành');
    return schedule;
  }

  private async loadFull(id: string): Promise<Booking> {
    const booking = await this.bookingRepo
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.schedule', 'schedule')
      .innerJoinAndSelect('schedule.tour', 'tour')
      .leftJoinAndSelect('booking.passengers', 'passenger')
      .leftJoinAndSelect('booking.promotion', 'promotion')
      .leftJoinAndSelect('booking.invoice', 'invoice')
      .where('booking.id = :id', { id })
      .andWhere('tour.deletedAt IS NULL')
      .orderBy('passenger.createdAt', 'ASC')
      .getOne();

    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    booking.cancelRequests = await this.cancelRepo.find({
      where: { bookingId: id },
      order: { createdAt: 'DESC' },
    });
    return booking;
  }

  /**
   * Kiểm tra mã khuyến mãi qua `PromotionService` (nguồn sự thật duy nhất của
   * ràng buộc promotion) thay vì đọc thẳng repo, để thông báo lỗi và điều kiện
   * hợp lệ luôn khớp với module promotion.
   */
  private async findPromotionOrFail(code: string, subtotal: number): Promise<Promotion> {
    return this.promotionService.findUsableOrFail(code, subtotal);
  }

  /**
   * Nhả lượt dùng mã khi booking không còn giữ chỗ (hủy / từ chối / hết hạn).
   * Chỉ gọi khi booking thực sự có gắn mã để tránh UPDATE vô ích.
   */
  private async releasePromotion(manager: EntityManager, booking: Booking): Promise<void> {
    if (!booking.promotionId) return;
    await this.promotionService.releaseForBooking(booking.promotionId, manager);
  }

  /** Chính sách hủy gắn với tour của lịch. */
  private async resolveCancelPolicyId(tourId: string): Promise<string> {
    const tour = await this.tourService.getOrFail(tourId);
    return tour.cancelPolicyId;
  }

  /** Khách tại quầy: dùng `customerId` chỉ định, nếu không thì lấy người đang đăng nhập. */
  private async resolveCustomerId(
    dto: CreateBookingDto,
    actor: AuthenticatedUser,
    counter: boolean,
  ): Promise<string> {
    const requested = (dto as CreateCounterBookingDto).customerId;
    if (!requested) return actor.id;
    if (!counter) throw new ForbiddenException('Chỉ nhân viên mới được đặt tour cho khách khác');
    return requested;
  }

  private assertBookable(schedule: DepartureSchedule): void {
    if (schedule.status === ScheduleStatus.DRAFT) {
      throw new ConflictException('Lịch khởi hành chưa mở bán');
    }
    if (schedule.status !== ScheduleStatus.OPEN) {
      throw new ConflictException(`Lịch khởi hành đang ở trạng thái ${schedule.status} – không thể đặt`);
    }
    if (schedule.startDate < this.todayInVietnam()) {
      throw new ConflictException('Ngày khởi hành đã qua');
    }
  }

  // ===== nội bộ: tính giá (server là nguồn sự thật) =====

  /**
   * Suy loại hành khách từ `dob` và lấy giá tương ứng **từ lịch khởi hành**.
   *
   * Client chỉ gửi `fullName` + `dob`, mọi con số tiền đều do server quyết định –
   * đây là chốt chặn gian lận của luồng đặt tour.
   */
  private pricePassengers(schedule: DepartureSchedule, passengers: PassengerInputDto[]) {
    const startDate = schedule.startDate;
    const lines = passengers.map((passenger) => {
      const dob = this.normalizeDate(passenger.dob);
      const age = this.ageAt(dob, startDate);
      const type = this.classify(age);
      const unitPrice = this.priceFor(schedule, type);

      return {
        fullName: passenger.fullName.trim(),
        dob,
        gender: passenger.gender?.trim() || null,
        idNumber: passenger.idNumber?.trim() || null,
        type,
        unitPrice,
        age,
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice, 0);
    return { lines, subtotal };
  }

  private classify(age: number): PassengerType {
    if (age < INFANT_MAX_AGE) return PassengerType.INFANT;
    if (age < CHILD_MAX_AGE) return PassengerType.CHILD;
    return PassengerType.ADULT;
  }

  private priceFor(schedule: DepartureSchedule, type: PassengerType): number {
    switch (type) {
      case PassengerType.INFANT:
        return Number(schedule.priceInfant ?? 0);
      case PassengerType.CHILD:
        return Number(schedule.priceChild ?? 0);
      default:
        return Number(schedule.priceAdult ?? 0);
    }
  }

  /** Em bé không chiếm ghế riêng. */
  private countSeats(priced: { lines: { type: PassengerType }[] }): number {
    return priced.lines.filter((line) => line.type !== PassengerType.INFANT).length;
  }

  private groupLines(priced: { lines: { type: PassengerType; unitPrice: number }[] }) {
    const order: PassengerType[] = [PassengerType.ADULT, PassengerType.CHILD, PassengerType.INFANT];
    const grouped = new Map<PassengerType, { quantity: number; unitPrice: number }>();

    for (const line of priced.lines) {
      const current = grouped.get(line.type);
      if (current) current.quantity += 1;
      else grouped.set(line.type, { quantity: 1, unitPrice: line.unitPrice });
    }

    return order
      .filter((type) => grouped.has(type))
      .map((type) => {
        const item = grouped.get(type)!;
        return {
          type,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
        };
      });
  }

  /** Tuổi tại ngày khởi hành – tính trên chuỗi `YYYY-MM-DD` để không lệch múi giờ. */
  private ageAt(dob: string, atDate: string): number {
    const [dy, dm, dd] = dob.split('-').map(Number);
    const [ay, am, ad] = atDate.slice(0, 10).split('-').map(Number);

    let age = ay - dy;
    if (am < dm || (am === dm && ad < dd)) age -= 1;
    return age;
  }

  private normalizeDate(value: string): string {
    return value.slice(0, 10);
  }

  private todayInVietnam(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  // ===== nội bộ: sinh mã =====

  /**
   * Mã booking `BK{YY}{4 số}`. MySQL không có sequence nên lấy `MAX(code)` của năm
   * hiện tại; `uq_bookings_code` là chốt chặn cuối nếu hai request đua nhau.
   */
  private async nextBookingCode(manager: EntityManager): Promise<string> {
    const year = this.todayInVietnam().slice(2, 4);
    const prefix = `BK${year}`;

    const row = await manager
      .createQueryBuilder(Booking, 'booking')
      .select('MAX(booking.code)', 'maxCode')
      .withDeleted()
      .where('booking.code LIKE :prefix', { prefix: `${prefix}%` })
      .getRawOne<{ maxCode: string | null }>();

    const current = row?.maxCode ? Number(String(row.maxCode).replace(/\D/g, '').slice(-4)) : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  /** Số hóa đơn `INV{YYYY}{5 số}` – tăng dần trong năm. */
  private async nextInvoiceNumber(manager: EntityManager): Promise<string> {
    const year = this.todayInVietnam().slice(0, 4);
    const prefix = `INV${year}`;

    const row = await manager
      .createQueryBuilder(Invoice, 'invoice')
      .select('MAX(invoice.number)', 'maxNumber')
      .where('invoice.number LIKE :prefix', { prefix: `${prefix}%` })
      .getRawOne<{ maxNumber: string | null }>();

    const current = row?.maxNumber ? Number(String(row.maxNumber).replace(/\D/g, '').slice(-5)) : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    return `${prefix}${String(next).padStart(5, '0')}`;
  }

  // ===== nội bộ: dựng view =====

  private async countPassengers(bookingIds: string[]): Promise<Map<string, number>> {
    if (bookingIds.length === 0) return new Map();

    const rows = await this.passengerRepo
      .createQueryBuilder('passenger')
      .select('passenger.bookingId', 'bookingId')
      .addSelect('COUNT(passenger.id)', 'count')
      .where('passenger.bookingId IN (:...bookingIds)', { bookingIds })
      .groupBy('passenger.bookingId')
      .getRawMany<{ bookingId: string; count: string | number }>();

    return new Map(rows.map((row) => [row.bookingId, Number(row.count)]));
  }

  private toSummary(booking: Booking, passengerCount: number): BookingSummaryView {
    return {
      id: booking.id,
      code: booking.code,
      status: booking.status,
      channel: booking.channel,
      scheduleId: booking.scheduleId,
      tourId: booking.schedule?.tourId ?? '',
      tourName: booking.schedule?.tour?.name ?? '',
      startDate: booking.schedule?.startDate ?? '',
      endDate: booking.schedule?.endDate ?? '',
      customerId: booking.customerId,
      contactName: booking.contactName,
      contactPhone: booking.contactPhone,
      contactEmail: booking.contactEmail,
      seatCount: booking.seatCount,
      passengerCount,
      subtotal: booking.subtotal,
      discount: booking.discount,
      total: booking.total,
      promotionCode: booking.promotion?.code ?? null,
      expiresAt: booking.expiresAt ?? null,
      confirmedAt: booking.confirmedAt ?? null,
      createdAt: booking.createdAt,
    };
  }

  private toDetail(booking: Booking): BookingDetailView {
    const passengers = (booking.passengers ?? []).map((passenger) => this.toPassengerView(passenger));
    return {
      ...this.toSummary(booking, passengers.length),
      note: booking.note ?? null,
      createdBy: booking.createdBy ?? null,
      confirmedBy: booking.confirmedBy ?? null,
      statusBeforeCancel: booking.statusBeforeCancel ?? null,
      passengers,
      cancelRequests: (booking.cancelRequests ?? []).map((request) => this.toCancelRequestView(request)),
      invoice: booking.invoice ? this.toInvoiceView(booking.invoice) : null,
      updatedAt: booking.updatedAt,
    };
  }

  private toPassengerView(passenger: Passenger): PassengerView {
    return {
      id: passenger.id,
      fullName: passenger.fullName,
      dob: passenger.dob,
      gender: passenger.gender ?? null,
      idNumber: passenger.idNumber ?? null,
      type: passenger.type,
      unitPrice: passenger.unitPrice,
    };
  }

  private toCancelRequestView(request: CancelRequest): CancelRequestView {
    return {
      id: request.id,
      reason: request.reason,
      status: request.status,
      feePercent: request.feePercent,
      feeAmount: request.feeAmount,
      refundAmount: request.refundAmount,
      policySnapshot: request.policySnapshot,
      requestedBy: request.requestedBy ?? null,
      processedBy: request.processedBy ?? null,
      processedAt: request.processedAt ?? null,
      rejectReason: request.rejectReason ?? null,
      createdAt: request.createdAt,
    };
  }

  private toInvoiceView(invoice: Invoice): InvoiceView {
    return {
      id: invoice.id,
      number: invoice.number,
      issuedAt: invoice.issuedAt,
      pdfUrl: invoice.pdfUrl ?? null,
      snapshot: invoice.snapshot,
    };
  }

  /** Chụp dữ liệu tại thời điểm xuất hóa đơn – không phụ thuộc thay đổi sau này. */
  private buildInvoiceSnapshot(booking: Booking): InvoiceSnapshot {
    const passengers = booking.passengers ?? [];
    const grouped = new Map<string, InvoiceLine>();

    for (const passenger of passengers) {
      const key = `${passenger.type}:${passenger.unitPrice}`;
      const line = grouped.get(key);
      if (line) {
        line.quantity += 1;
        line.amount = line.quantity * line.unitPrice;
      } else {
        grouped.set(key, {
          description: this.passengerLabel(passenger.type),
          quantity: 1,
          unitPrice: passenger.unitPrice,
          amount: passenger.unitPrice,
        });
      }
    }

    const lines = [...grouped.values()];
    if (booking.discount > 0) {
      lines.push({
        description: 'Giảm giá khuyến mãi',
        quantity: 1,
        unitPrice: -booking.discount,
        amount: -booking.discount,
      });
    }

    return {
      customerName: booking.contactName,
      customerEmail: booking.contactEmail,
      customerPhone: booking.contactPhone,
      tourName: booking.schedule?.tour?.name ?? '',
      startDate: booking.schedule?.startDate ?? '',
      lines,
      subtotal: booking.subtotal,
      discount: booking.discount,
      total: booking.total,
    };
  }

  private passengerLabel(type: string): string {
    switch (type) {
      case PassengerType.CHILD:
        return 'Vé trẻ em';
      case PassengerType.INFANT:
        return 'Vé em bé';
      default:
        return 'Vé người lớn';
    }
  }

  // ===== nội bộ: quyền =====

  /** Nhân viên có `booking:read` thì xem được mọi booking, khách chỉ xem của mình. */
  private canReadAll(actor: AuthenticatedUser): boolean {
    return actor.permissions.includes('booking:read');
  }

  private isInvoiceable(status: BookingStatus): boolean {
    return (
      status === BookingStatus.CONFIRMED ||
      status === BookingStatus.COMPLETED ||
      status === BookingStatus.CANCEL_REQUESTED
    );
  }

  /** Đánh dấu booking đã hoàn thành sau khi tour kết thúc (job `schedule-status-sync`). */
  async completeBySchedule(scheduleId: string): Promise<number> {
    const result = await this.bookingRepo
      .createQueryBuilder()
      .update(Booking)
      .set({ status: BookingStatus.COMPLETED })
      .where('schedule_id = :scheduleId', { scheduleId })
      .andWhere('status = :status', { status: BookingStatus.CONFIRMED })
      .execute();
    return result.affected ?? 0;
  }

  /**
   * Hoàn tất **mọi** booking `CONFIRMED` thuộc các lịch đã `COMPLETED`.
   *
   * Job `schedule-status-sync` chạy theo thứ tự:
   * 1. `ScheduleService.syncScheduleStatuses()` chuyển lịch quá `end_date` → `COMPLETED`.
   * 2. Hàm này chuyển booking của các lịch đó → `COMPLETED`.
   *
   * Nhờ vậy `ReviewService` (chỉ cho đánh giá khi booking `COMPLETED`) mới hoạt động
   * mà không cần thao tác tay. Dùng 1 câu UPDATE ... WHERE schedule_id IN (SELECT ...)
   * để tránh N+1 khi có nhiều lịch kết thúc cùng lúc; idempotent nên chạy lại vô hại.
   */
  async completeBookingsOfFinishedSchedules(): Promise<number> {
    const result = await this.bookingRepo
      .createQueryBuilder()
      .update(Booking)
      .set({ status: BookingStatus.COMPLETED })
      .where('status = :bookingStatus', { bookingStatus: BookingStatus.CONFIRMED })
      .andWhere(
        'schedule_id IN (SELECT id FROM departure_schedules WHERE status = :scheduleStatus)',
        { scheduleStatus: ScheduleStatus.COMPLETED },
      )
      .execute();

    const affected = result.affected ?? 0;
    if (affected > 0) this.logger.log(`Đã hoàn tất ${affected} booking của các lịch đã kết thúc`);
    return affected;
  }

  /** Tìm booking theo danh sách id – dùng cho module review kiểm tra quyền viết đánh giá. */
  async findByIds(ids: string[]): Promise<Booking[]> {
    if (ids.length === 0) return [];
    return this.bookingRepo.find({ where: { id: In(ids) } });
  }
}
