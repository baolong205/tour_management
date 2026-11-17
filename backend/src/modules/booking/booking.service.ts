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
import {
  BookingChannel,
  BookingStatus,
  CancelRequestStatus,
  ScheduleStatus,
} from '../../common/enums/index.js';
import { BookingPricingService } from './services/booking-pricing.service.js';
import { BookingCancellationService } from './services/booking-cancellation.service.js';
import { BookingReservationsService } from './services/booking-reservations.service.js';
import { todayInVietnam } from '../../common/time/vietnam-date.js';
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
import { Invoice } from './entities/invoice.entity.js';
import { BookingMailService } from './services/booking-mail.service.js';
import { InvoiceService } from './services/invoice.service.js';
import { renderInvoice } from './templates/invoice.template.js';
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

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Passenger)
    private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(CancelRequest)
    private readonly cancelRepo: Repository<CancelRequest>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly scheduleService: ScheduleService,
    private readonly pricing: BookingPricingService,
    private readonly cancellations: BookingCancellationService,
    private readonly reservations: BookingReservationsService,
    private readonly promotionService: PromotionService,
    private readonly events: EventEmitter2,
    private readonly invoices: InvoiceService,
    private readonly bookingMail: BookingMailService,
  ) {}

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
    options: {
      title: string;
      body?: string;
      notificationType?: string;
      before?: Record<string, unknown>;
    } = {
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
      notificationType:
        options.notificationType ?? this.notificationTypeOf(name),
      before: options.before ?? null,
      after: { status: booking.status, bookingCode: booking.code },
      payload: {
        bookingId: booking.id,
        bookingCode: booking.code,
        status: booking.status,
      },
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
    if (!this.canReadAll(actor))
      qb.andWhere('booking.customerId = :actorId', { actorId: actor.id });
    if (query.customerId)
      qb.andWhere('booking.customerId = :customerId', {
        customerId: query.customerId,
      });
    if (query.status)
      qb.andWhere('booking.status = :status', { status: query.status });
    if (query.scheduleId)
      qb.andWhere('booking.scheduleId = :scheduleId', {
        scheduleId: query.scheduleId,
      });
    if (query.fromDate)
      qb.andWhere('schedule.startDate >= :fromDate', {
        fromDate: query.fromDate.slice(0, 10),
      });
    if (query.toDate)
      qb.andWhere('schedule.startDate <= :toDate', {
        toDate: query.toDate.slice(0, 10),
      });

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
    const counts = await this.countPassengers(
      bookings.map((booking) => booking.id),
    );

    const items = bookings.map((booking) =>
      this.toSummary(booking, counts.get(booking.id) ?? 0),
    );
    return { items, total, page, limit };
  }

  /** Booking của chính khách đang đăng nhập – luôn giới hạn theo `customerId`. */
  async listMine(query: QueryBookingsDto, actor: AuthenticatedUser) {
    return this.paginate(
      { ...query, customerId: undefined },
      { ...actor, permissions: [] },
    );
  }

  async getDetail(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<BookingDetailView> {
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
    const booking = await this.bookingRepo.findOne({
      where: { code: code.trim().toUpperCase() },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    return booking;
  }

  async quote(
    scheduleId: string,
    passengers: PassengerInputDto[],
    promotionCode?: string,
    customerId?: string,
    channel: BookingChannel = BookingChannel.ONLINE,
  ): Promise<BookingQuote> {
    return this.pricing.quote(
      await this.reservations.loadScheduleOrFail(scheduleId),
      passengers,
      promotionCode,
      customerId,
      channel,
    );
  }

  async processCancel(
    id: string,
    actor: AuthenticatedUser,
    dto: ProcessCancelDto,
  ): Promise<BookingDetailView> {
    await this.cancellations.processCancel(id, actor, dto);
    return this.getDetail(id, actor);
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
    if (counter && !actor.permissions.includes('booking:read')) {
      throw new ForbiddenException('Chỉ nhân viên được tạo đơn tại quầy cho khách hàng');
    }
    const customerId = await this.resolveCustomerId(dto, actor, counter);
    const schedule = await this.reservations.loadScheduleOrFail(dto.scheduleId);

    this.assertBookable(schedule);
    const priced = this.pricing.pricePassengers(schedule, dto.passengers);
    const seatCount = this.pricing.countSeats(priced);
    /**
     * Chặn sớm bằng đúng câu chữ mà `POST /bookings/quote` đã trả về.
     *
     * Trước đây nhánh này chỉ kiểm `seatCount < 1` rồi để `holdSeats` ném 409 khi
     * hết chỗ. Khách nhận hai thông báo khác nhau cho cùng một tình huống tuỳ vào
     * việc họ bấm "Xem báo giá" hay "Xác nhận đặt tour".
     *
     * Khi client đã giữ chỗ trước (`holdId`), số chỗ của chính hold đó **đã bị trừ**
     * khỏi `availableSeats`, nên kiểm sức chứa ở đây sẽ báo sai "không đủ chỗ".
     * `consumeHold` bên trong transaction mới là nơi kiểm đúng.
     */
    const blockedReason = this.pricing.blockedReasonFor(
      schedule,
      seatCount,
      dto.holdId ? 0 : await this.scheduleService.sumActiveHeldSeats(schedule.id),
      { skipCapacity: Boolean(dto.holdId) },
    );
    if (blockedReason) throw new BadRequestException(blockedReason);

    const id = await this.bookingRepo.manager.transaction('READ COMMITTED', async (manager) => {
      // Bước 1: giữ chỗ. Nếu client đã giữ trước thì dùng lại hold đó, không giữ thêm.
      const hold = dto.holdId
        ? await this.consumeHold(dto.holdId, actor.id, seatCount, manager)
        : await this.scheduleService.holdSeats(schedule.id, actor.id, seatCount, manager);

      // Bước 2: dựng booking. Tiền lấy từ `priced`, không đọc bất kỳ số nào từ client.
      const channel = dto.channel ?? (counter ? BookingChannel.COUNTER : BookingChannel.ONLINE);
      /**
       * Kiểm tra mã bằng engine **trong** transaction: khóa dòng mã (pessimistic_write)
       * rồi mới xét phạm vi/kênh/ngân sách/hạn mức ngày. Nhờ vậy hai request đồng
       * thời không thể cùng vượt trần, và mã giới hạn theo tour không áp nhầm tour khác.
       */
      const evaluated = dto.promotionCode
        ? await this.promotionService.evaluateForBooking({
          code: dto.promotionCode,
          subtotal: priced.subtotal,
          scheduleId: schedule.id,
          customerId,
          channel,
          manager,
        })
        : null;
      const promotion = evaluated?.promotion ?? null;
      const booking = manager.create(Booking, {
        code: await this.nextBookingCode(manager),
        scheduleId: schedule.id,
        customerId,
        createdBy: counter ? actor.id : null,
        channel,
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
      // Dùng `evaluated.discount` (engine) chứ không tính lại: engine đã áp trần
      // ngân sách và trần tổng giảm, tính lại sẽ lệch.
      booking.recalculateTotals(evaluated?.discount ?? 0);

      const saved = await manager.save(Booking, booking);

      // Bước 3: nối hold với booking để job dọn chỗ tìm lại được.
      await manager.update(SeatHold, { id: hold.holdId }, { bookingId: saved.id });

      /**
       * Giữ lượt + ghi sổ cái trong cùng transaction:
       * - `reserveForBooking` tăng `used_count`/`budget_used`/`daily_used` bằng câu
       *   UPDATE có điều kiện, nên hai request đồng thời không vượt trần.
       * - Dòng `promotion_redemptions` (RESERVED) là nguồn sự thật để đếm hạn mức
       *   mỗi khách và để đối chiếu về sau; `PaymentService` sẽ chốt thành CONFIRMED.
       * - `booking_discounts` lưu chi tiết từng mã + số tiền, phục vụ báo cáo.
       */
      if (promotion && evaluated) {
        await this.promotionService.reserveForBooking(promotion.id, manager, {
          bookingId: saved.id,
          customerId,
          discountAmount: evaluated.discount,
          subtotalAtUse: priced.subtotal,
        });
        await this.promotionService.recordBookingDiscounts(manager, saved.id, [
          { promotion, discount: evaluated.discount },
        ]);
      }

      // Email "đã ghi nhận đơn" nằm trong cùng transaction: rollback thì không có
      // thư rác, commit thì worker gửi nền (xem BookingMailService).
      await this.enqueueBookingMail(manager, saved, 'created', {
        schedule,
        passengers: saved.passengers ?? [],
      });

      this.logger.log(`Tạo booking ${saved.code} (${seatCount} chỗ) cho lịch ${schedule.id}`);
      return saved.id;
    });

    return this.getDetail(id, actor);
  }

  /** Nhân viên tạo booking tại quầy; có thể chỉ định `customerId` khác người tạo. */
  async createAtCounter(
    dto: CreateCounterBookingDto,
    actor: AuthenticatedUser,
  ): Promise<BookingDetailView> {
    return this.create(
      { ...dto, channel: dto.channel ?? BookingChannel.COUNTER },
      actor,
      { asCounter: true },
    );
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
      const booking = await this.reservations.lockBooking(manager, id);

      if (booking.status === BookingStatus.CONFIRMED) return null; // idempotent
      booking.transitionTo(BookingStatus.CONFIRMED);
      booking.confirmedBy = actor.id;
      booking.confirmedAt = new Date();
      booking.expiresAt = null;
      if (dto.note !== undefined) booking.note = dto.note?.trim() || null;

      await manager.save(Booking, booking);
      await manager.increment(DepartureSchedule, { id: booking.scheduleId }, 'soldSeats', booking.seatCount);
      await this.scheduleService.releaseHoldsByBooking(booking.id, manager);

      // Chỉ xếp thư khi trạng thái thực sự đổi; nhánh idempotent đã return sớm.
      await this.enqueueBookingMail(manager, booking, 'confirmed');

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
  async reject(
    id: string,
    actor: AuthenticatedUser,
    dto: RejectBookingDto,
  ): Promise<BookingDetailView> {
    const changed = await this.bookingRepo.manager.transaction(
      async (manager) => {
        const booking = await this.reservations.lockBooking(manager, id);
        booking.transitionTo(BookingStatus.REJECTED);
        booking.note = `${booking.note ? `${booking.note}\n` : ''}Lý do từ chối: ${dto.reason.trim()}`;
        booking.expiresAt = null;
        await manager.save(Booking, booking);
        await this.scheduleService.releaseHoldsByBooking(booking.id, manager);
        await this.reservations.releasePromotion(manager, booking);
        return booking;
      },
    );

    await this.emitBookingEvent(
      DomainEvents.BOOKING_REJECTED,
      DomainEvents.BOOKING_REJECTED,
      changed,
      actor,
      {
        title: `Đơn ${changed.code} đã bị từ chối`,
        body: `Lý do: ${dto.reason.trim()}. Chỗ đã được mở lại cho khách khác.`,
      },
    );

    return this.getDetail(id, actor);
  }

  /**
   * Hủy trực tiếp (nhân viên hủy hộ, không qua yêu cầu).
   * Vẫn đi qua chính sách hủy để ghi nhận phí/hoàn tiền.
   */
  async cancel(
    id: string,
    actor: AuthenticatedUser,
    reason: string,
  ): Promise<BookingDetailView> {
    const changed = await this.bookingRepo.manager.transaction(
      async (manager) => {
        const booking = await this.reservations.lockBooking(manager, id);
        if (booking.status === BookingStatus.CANCELLED) return null;

        this.applyCancellation(booking, reason);
        await manager.save(Booking, booking);
        await this.reservations.releaseSeats(manager, booking);
        await this.reservations.releasePromotion(manager, booking);
        await this.markPendingCancelRequests(
          manager,
          booking.id,
          CancelRequestStatus.REJECTED,
          actor.id,
          reason,
        );
        return booking;
      },
    );

    if (changed) {
      await this.emitBookingEvent(
        DomainEvents.BOOKING_CANCELLED,
        DomainEvents.BOOKING_CANCELLED,
        changed,
        actor,
        {
          title: `Đơn ${changed.code} đã bị hủy`,
          body: `Lý do: ${reason.trim()}`,
        },
      );
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
  async requestCancel(
    id: string,
    actor: AuthenticatedUser,
    dto: RequestCancelDto,
  ): Promise<BookingDetailView> {
    const booking = await this.loadFull(id);
    if (booking.customerId !== actor.id && !this.canReadAll(actor)) {
      throw new ForbiddenException('Bạn không có quyền hủy booking này');
    }
    const changed = await this.cancellations.request(booking, actor, dto);

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

  // ===== hóa đơn =====

  /** Idempotent; actual payment is checked by InvoiceService. */
  async issueInvoice(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<InvoiceView> {
    await this.getDetail(id, actor);
    const invoice = await this.invoiceRepo.manager.transaction((manager) =>
      this.invoices.issue(id, manager),
    );
    return this.toInvoiceView(invoice);
  }

  async getInvoice(id: string, actor: AuthenticatedUser): Promise<InvoiceView> {
    // Historical invoices remain readable even if their tour is later hidden/deleted.
    const booking = await this.getOrFail(id);
    if (!this.canReadAll(actor) && booking.customerId !== actor.id) {
      throw new ForbiddenException('Bạn không có quyền xem hóa đơn này');
    }
    const invoice = await this.invoiceRepo.findOne({
      where: { bookingId: id },
    });
    if (!invoice) throw new NotFoundException('Booking chưa có hóa đơn');
    return this.toInvoiceView(invoice);
  }

  async getInvoiceDocument(id: string, actor: AuthenticatedUser) {
    const invoice = await this.getInvoice(id, actor);
    return { number: invoice.number, html: renderInvoice(invoice) };
  }

  // ===== job nền =====

  /**
   * Hết hạn các booking chờ thanh toán quá `expires_at` → `EXPIRED` + nhả chỗ.
   * Gọi từ job `expire-bookings` (`docs/schema.md` §7.3).
   */
  async expireOverdueBookings(): Promise<number> {
    const overdue = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.status = :status', {
        status: BookingStatus.PENDING_PAYMENT,
      })
      .andWhere('booking.expiresAt IS NOT NULL')
      .andWhere('booking.expiresAt <= :now', { now: new Date() })
      .select('booking.id', 'id')
      .limit(500)
      .getRawMany<{ id: string }>();

    let expired = 0;
    for (const row of overdue) {
      try {
        await this.bookingRepo.manager.transaction(async (manager) => {
          const booking = await this.reservations.lockBooking(manager, row.id);
          if (booking.status !== BookingStatus.PENDING_PAYMENT) return;
          booking.transitionTo(BookingStatus.EXPIRED);
          booking.expiresAt = null;
          await manager.save(Booking, booking);
          await this.scheduleService.releaseHoldsByBooking(booking.id, manager);
          await this.reservations.releasePromotion(manager, booking);
          expired += 1;
        });
      } catch (error) {
        // Một booking lỗi không được chặn cả lô.
        this.logger.warn(
          `Không hết hạn được booking ${row.id}: ${(error as Error).message}`,
        );
      }
    }

    if (expired > 0)
      this.logger.log(`Đã chuyển ${expired} booking sang EXPIRED`);
    return expired;
  }

  /**
   * Dùng hold khách đã tạo trước đó.
   *
   * `holdSeats` đã khóa dòng lịch và kiểm tra sức chứa, nhưng ở đây chỉ kiểm lại
   * số chỗ của hold: nếu hold còn hiệu lực thì chỗ đã được trừ trong
   * `availableSeats` nên không cần khóa lại (tránh deadlock).
   */
  private async consumeHold(
    holdId: string,
    userId: string,
    seats: number,
    manager: EntityManager,
  ) {
    const hold = await manager.getRepository(SeatHold).findOne({
      where: { id: holdId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!hold) throw new NotFoundException('Không tìm thấy lượt giữ chỗ');
    if (hold.releasedAt)
      throw new ConflictException('Lượt giữ chỗ đã bị nhả – hãy giữ chỗ lại');
    if (hold.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException('Lượt giữ chỗ đã hết hạn – hãy giữ chỗ lại');
    }
    if (hold.bookingId)
      throw new ConflictException(
        'Lượt giữ chỗ này đã được dùng cho booking khác',
      );
    if (hold.userId && hold.userId !== userId) {
      throw new ForbiddenException(
        'Lượt giữ chỗ này không thuộc tài khoản của bạn',
      );
    }
    if (hold.seats !== seats) {
      throw new ConflictException(
        `Lượt giữ chỗ đang giữ ${hold.seats} chỗ nhưng booking có ${seats} chỗ – hãy giữ chỗ lại`,
      );
    }

    return {
      holdId: hold.id,
      scheduleId: hold.scheduleId,
      seats: hold.seats,
      expiresAt: hold.expiresAt,
    };
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
        rejectReason:
          status === CancelRequestStatus.REJECTED
            ? `Booking đã được hủy trực tiếp: ${reason}`
            : null,
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

  private async enqueueBookingMail(
    manager: EntityManager,
    booking: Booking,
    event: 'created' | 'confirmed',
    preloaded: { schedule?: DepartureSchedule; passengers?: Passenger[] } = {},
  ): Promise<void> {
    try {
      await this.bookingMail.enqueue(manager, booking, event, preloaded);
    } catch (error) {
      this.logger.warn(
        `Không xếp được email "${event}" cho đơn ${booking.code}: ${(error as Error).message}`,
      );
    }
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

  /** Khách tại quầy: dùng `customerId` chỉ định, nếu không thì lấy người đang đăng nhập. */
  private async resolveCustomerId(
    dto: CreateBookingDto,
    actor: AuthenticatedUser,
    counter: boolean,
  ): Promise<string> {
    const requested = (dto as CreateCounterBookingDto).customerId;
    if (!requested) return actor.id;
    if (!counter)
      throw new ForbiddenException(
        'Chỉ nhân viên mới được đặt tour cho khách khác',
      );
    return requested;
  }

  private assertBookable(schedule: DepartureSchedule): void {
    if (schedule.status === ScheduleStatus.DRAFT) {
      throw new ConflictException('Lịch khởi hành chưa mở bán');
    }
    if (schedule.status !== ScheduleStatus.OPEN) {
      throw new ConflictException(
        `Lịch khởi hành đang ở trạng thái ${schedule.status} – không thể đặt`,
      );
    }
    if (schedule.startDate < todayInVietnam()) {
      throw new ConflictException('Ngày khởi hành đã qua');
    }
  }

  // ===== nội bộ: sinh mã =====

  /**
   * Mã booking `BK{YY}{4 số}`. MySQL không có sequence nên lấy `MAX(code)` của năm
   * hiện tại; `uq_bookings_code` là chốt chặn cuối nếu hai request đua nhau.
   */
  private async nextBookingCode(manager: EntityManager): Promise<string> {
    const year = todayInVietnam().slice(2, 4);
    const prefix = `BK${year}`;

    const row = await manager
      .createQueryBuilder(Booking, 'booking')
      .select('MAX(booking.code)', 'maxCode')
      .withDeleted()
      .where('booking.code LIKE :prefix', { prefix: `${prefix}%` })
      .getRawOne<{ maxCode: string | null }>();

    const current = row?.maxCode
      ? Number(String(row.maxCode).replace(/\D/g, '').slice(-4))
      : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  // ===== nội bộ: dựng view =====

  private async countPassengers(
    bookingIds: string[],
  ): Promise<Map<string, number>> {
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

  private toSummary(
    booking: Booking,
    passengerCount: number,
  ): BookingSummaryView {
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
    const passengers = (booking.passengers ?? []).map((passenger) =>
      this.toPassengerView(passenger),
    );
    return {
      ...this.toSummary(booking, passengers.length),
      note: booking.note ?? null,
      createdBy: booking.createdBy ?? null,
      confirmedBy: booking.confirmedBy ?? null,
      statusBeforeCancel: booking.statusBeforeCancel ?? null,
      passengers,
      cancelRequests: (booking.cancelRequests ?? []).map((request) =>
        this.toCancelRequestView(request),
      ),
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

  // ===== nội bộ: quyền =====

  /** Nhân viên có `booking:read` thì xem được mọi booking, khách chỉ xem của mình. */
  private canReadAll(actor: AuthenticatedUser): boolean {
    return actor.permissions.includes('booking:read');
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
      .where('status = :bookingStatus', {
        bookingStatus: BookingStatus.CONFIRMED,
      })
      .andWhere(
        'schedule_id IN (SELECT id FROM departure_schedules WHERE status = :scheduleStatus)',
        { scheduleStatus: ScheduleStatus.COMPLETED },
      )
      .execute();

    const affected = result.affected ?? 0;
    if (affected > 0)
      this.logger.log(
        `Đã hoàn tất ${affected} booking của các lịch đã kết thúc`,
      );
    return affected;
  }

  /** Tìm booking theo danh sách id – dùng cho module review kiểm tra quyền viết đánh giá. */
  async findByIds(ids: string[]): Promise<Booking[]> {
    if (ids.length === 0) return [];
    return this.bookingRepo.find({ where: { id: In(ids) } });
  }
}
