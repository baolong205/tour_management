import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  RefundReason,
  RefundStatus,
  WebhookEventType,
  WebhookResult,
} from '../../common/enums/index.js';
import { BookingService } from '../booking/booking.service.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { CancelRequest } from '../booking/entities/cancel-request.entity.js';
import type {
  CompleteRefundDto,
  CreatePaymentDto,
  CreateRefundDto,
  MockWebhookDto,
  QueryPaymentsDto,
  QueryRefundsDto,
  SubmitProofDto,
} from './dto/payment.dto.js';
import { PaymentEvent } from './entities/payment-event.entity.js';
import { Payment } from './entities/payment.entity.js';
import { Refund } from './entities/refund.entity.js';
import { PAYMENT_GATEWAY } from './services/payment-gateway.interface.js';
import type { PaymentGateway } from './services/payment-gateway.interface.js';
import type {
  BookingPaymentsView,
  PaymentView,
  RefundView,
  WebhookOutcome,
} from './types/payment.types.js';

/** Phương thức thanh toán online – đi qua cổng, có `payment_url`. */
const GATEWAY_METHODS: ReadonlySet<PaymentMethod> = new Set([PaymentMethod.VNPAY, PaymentMethod.MOMO]);

/** Phương thức "thu tại quầy": coi như thu tiền mặt ngay khi xác nhận. */
const OFFICE_METHODS: ReadonlySet<PaymentMethod> = new Set([PaymentMethod.OFFICE]);

/** TTL mặc định của một phiên thanh toán online. */
const PAYMENT_TTL_MINUTES = 15;

/**
 * Thanh toán + hoàn tiền (cổng giả lập).
 *
 * Nguyên tắc xuyên suốt:
 * - **Số tiền không bao giờ lấy từ client.** `amount` = `booking.total` tại thời điểm
 *   tạo payment, ghi vào DB rồi so khớp với số cổng báo về khi xử lý IPN.
 * - **Một booking chỉ có một payment SUCCESS** – khi ghi nhận thành công, khóa dòng
 *   booking (`pessimistic_write`) và kiểm tra lại để chống race của 2 IPN về cùng lúc
 *   (thay cho partial unique index trên PostgreSQL).
 * - **Webhook idempotent** – lần gọi thứ 2 ghi `payment_events.result = IGNORED`
 *   nhưng vẫn trả "đã xử lý" để cổng không retry vô hạn.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Refund) private readonly refundRepo: Repository<Refund>,
    @InjectRepository(PaymentEvent) private readonly eventRepo: Repository<PaymentEvent>,
    private readonly bookingService: BookingService,
    // Cổng thanh toán lấy qua token: đổi mock → thật chỉ cần sửa provider ở PaymentModule.
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) { }

  // ===== truy vấn =====

  async paginate(query: QueryPaymentsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .innerJoinAndSelect('payment.booking', 'booking');

    if (query.status) qb.andWhere('payment.status = :status', { status: query.status });
    if (query.method) qb.andWhere('payment.method = :method', { method: query.method });
    if (query.bookingId) qb.andWhere('payment.bookingId = :bookingId', { bookingId: query.bookingId });

    if (query.search) {
      const kw = `%${query.search.trim()}%`;
      qb.andWhere(
        '(booking.code LIKE :kw OR payment.gatewayTxnRef LIKE :kw OR payment.gatewayTxnNo LIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [payments, total] = await qb.getManyAndCount();
    return { items: payments.map((payment) => this.toView(payment)), total, page, limit };
  }

  async listMine(query: QueryPaymentsDto, actor: AuthenticatedUser) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .innerJoinAndSelect('payment.booking', 'booking')
      .where('booking.customerId = :customerId', { customerId: actor.id });

    if (query.status) qb.andWhere('payment.status = :status', { status: query.status });
    if (query.bookingId) qb.andWhere('payment.bookingId = :bookingId', { bookingId: query.bookingId });

    qb.orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [payments, total] = await qb.getManyAndCount();
    return { items: payments.map((payment) => this.toView(payment)), total, page, limit };
  }

  async getById(id: string, actor?: AuthenticatedUser): Promise<PaymentView> {
    const payment = await this.getOrFail(id);
    if (actor) {
      const booking = await this.bookingService.getOrFail(payment.bookingId);
      const canReadAll = actor.permissions.includes('payment:read');
      if (!canReadAll && booking.customerId !== actor.id) {
        throw new ForbiddenException('Bạn không có quyền xem giao dịch này');
      }
    }
    return this.toView(payment);
  }

  async getOrFail(id: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { id }, relations: { booking: true } });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
    return payment;
  }

  /** Tổng hợp thanh toán + hoàn tiền của một booking (trang chi tiết đơn). */
  async getByBooking(bookingId: string, actor: AuthenticatedUser): Promise<BookingPaymentsView> {
    const booking = await this.bookingService.getOrFail(bookingId);
    const canReadAll = actor.permissions.includes('payment:read');
    if (!canReadAll && booking.customerId !== actor.id) {
      throw new ForbiddenException('Bạn không có quyền xem thanh toán của booking này');
    }

    const payments = await this.paymentRepo.find({
      where: { bookingId },
      order: { createdAt: 'DESC' },
    });
    const paymentIds = payments.map((p) => p.id);
    const refunds = paymentIds.length
      ? await this.refundRepo
        .createQueryBuilder('refund')
        .where('refund.paymentId IN (:...paymentIds)', { paymentIds })
        .orderBy('refund.createdAt', 'DESC')
        .getMany()
      : [];

    const bookingWithCode = booking as Booking & { code: string };
    const paidTotal = payments
      .filter((p) => this.isPaidStatus(p.status))
      .reduce((sum, p) => sum + (p.amount - p.refundedAmount), 0);
    const refundedTotal = payments.reduce((sum, p) => sum + p.refundedAmount, 0);

    return {
      bookingId,
      bookingCode: bookingWithCode.code,
      bookingStatus: booking.status,
      total: booking.total,
      paidTotal,
      refundedTotal,
      outstanding: Math.max(booking.total - paidTotal, 0),
      payments: payments.map((payment) => this.toView(payment)),
      refunds: refunds.map((refund) => this.toRefundView(refund)),
    };
  }

  // ===== tạo payment =====

  /**
   * Tạo giao dịch cho booking.
   *
   * - `OFFICE`  : thu tiền mặt tại quầy → ghi nhận SUCCESS ngay, booking → CONFIRMED.
   * - `VNPAY/MOMO`: sinh `txn_ref` + URL giả lập, chờ webhook xác nhận.
   * - `BANK_TRANSFER`: chờ khách gửi chứng từ (`submitProof`), nhân viên duyệt tay.
   */
  async create(dto: CreatePaymentDto, actor: AuthenticatedUser): Promise<PaymentView> {
    const booking = await this.bookingService.getOrFail(dto.bookingId);
    const canOperate = actor.permissions.includes('payment:read');
    if (!canOperate && booking.customerId !== actor.id) {
      throw new ForbiddenException('Bạn không có quyền thanh toán cho booking này');
    }
    this.assertBookableForPayment(booking);

    const id = await this.paymentRepo.manager.transaction(async (manager) => {
      const locked = await this.lockBooking(manager, booking.id);
      this.assertBookableForPayment(locked);

      const existingSuccess = await manager.getRepository(Payment).findOne({
        where: {
          bookingId: locked.id,
          status: PaymentStatus.SUCCESS,
        },
      });
      if (existingSuccess) throw new ConflictException('Booking đã được thanh toán');

      // Đang có giao dịch chờ cùng phương thức ⇒ trả lại phiên cũ để khách không tạo trùng.
      const pendingSameMethod = await manager.getRepository(Payment).findOne({
        where: { bookingId: locked.id, method: dto.method, status: PaymentStatus.PENDING },
        order: { createdAt: 'DESC' },
      });
      if (pendingSameMethod) return pendingSameMethod.id;

      const payment = manager.create(Payment, {
        bookingId: locked.id,
        method: dto.method,
        amount: locked.total,
        status: PaymentStatus.PENDING,
        refundedAmount: 0,
      });

      if (GATEWAY_METHODS.has(dto.method)) {
        payment.gateway = dto.method;
        payment.gatewayTxnRef = await this.nextTxnRef(manager);
        const init = this.gateway.initTransaction({
          gateway: dto.method,
          txnRef: payment.gatewayTxnRef,
          amount: locked.total,
        });
        payment.paymentUrl = init.paymentUrl;
        payment.expiresAt = init.expiresAt;
      } else {
        payment.expiresAt = new Date(Date.now() + PAYMENT_TTL_MINUTES * 60_000);
      }

      const saved = await manager.save(Payment, payment);
      this.logger.log(`Tạo payment ${saved.gatewayTxnRef ?? saved.id} (${dto.method}) cho booking ${locked.code}`);
      return saved.id;
    });

    // Thu tiền mặt tại quầy: xác nhận luôn (một transaction riêng để dùng lại logic booking).
    if (OFFICE_METHODS.has(dto.method)) {
      return this.confirmManualPayment(id, actor, 'Thu tiền mặt tại quầy');
    }

    return this.getById(id);
  }

  /** Khách gửi ảnh chụp chuyển khoản – chờ nhân viên duyệt. */
  async submitProof(paymentId: string, dto: SubmitProofDto, actor: AuthenticatedUser): Promise<PaymentView> {
    const payment = await this.getOrFail(paymentId);
    const booking = await this.bookingService.getOrFail(payment.bookingId);
    if (booking.customerId !== actor.id && !actor.permissions.includes('payment:read')) {
      throw new ForbiddenException('Bạn không có quyền gửi chứng từ cho giao dịch này');
    }
    if (payment.method !== PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('Chỉ giao dịch chuyển khoản mới cần gửi chứng từ');
    }
    if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.PROOF_SUBMITTED) {
      throw new ConflictException(`Giao dịch đang ở trạng thái ${payment.status}, không thể gửi chứng từ`);
    }

    payment.proofUrl = dto.proofUrl.trim();
    payment.proofNote = dto.proofNote?.trim() || null;
    payment.status = PaymentStatus.PROOF_SUBMITTED;
    return this.toView(await this.paymentRepo.save(payment));
  }

  /** Nhân viên duyệt chứng từ chuyển khoản → payment SUCCESS + booking CONFIRMED. */
  async approveProof(paymentId: string, actor: AuthenticatedUser): Promise<PaymentView> {
    return this.confirmManualPayment(paymentId, actor, 'Duyệt chứng từ chuyển khoản');
  }

  /** Nhân viên từ chối chứng từ → payment FAILED, khách phải gửi lại. */
  async rejectProof(paymentId: string, reason: string, actor: AuthenticatedUser): Promise<PaymentView> {
    return this.paymentRepo.manager.transaction(async (manager) => {
      const payment = await this.lockPayment(manager, paymentId);
      if (payment.status !== PaymentStatus.PROOF_SUBMITTED) {
        throw new ConflictException('Chỉ từ chối được giao dịch đang chờ duyệt chứng từ');
      }
      payment.status = PaymentStatus.FAILED;
      payment.proofNote = [payment.proofNote, `Từ chối: ${reason.trim()}`].filter(Boolean).join('\n');
      payment.reviewedBy = actor.id;
      await manager.save(Payment, payment);
      return this.toView(payment);
    });
  }

  // ===== giả lập cổng =====

  /**
   * Endpoint "bấm thanh toán" trên trang cổng giả lập: tự sinh chữ ký rồi gọi
   * cùng một luồng xử lý với webhook thật. Nhờ vậy dev test được end-to-end mà
   * không phải tự tay tính HMAC.
   */
  async simulateGatewayPayment(txnRef: string, outcome: 'success' | 'failed' = 'success'): Promise<WebhookOutcome> {
    const payment = await this.paymentRepo.findOne({ where: { gatewayTxnRef: txnRef } });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch trên cổng giả lập');

    const success = outcome === 'success';
    const gatewayTxnNo = `MOCK${Date.now()}`;
    const signature = this.gateway.buildSignature({
      txnRef,
      gatewayTxnNo,
      amount: payment.amount,
      success,
    });

    return this.handleWebhook(
      {
        gateway: payment.gateway ?? payment.method,
        txnRef,
        gatewayTxnNo,
        amount: payment.amount,
        success,
        responseCode: success ? '00' : '99',
        signature,
        eventType: WebhookEventType.RETURN,
      },
      { trusted: true },
    );
  }

  /** Gợi ý chữ ký cho công cụ test (Postman/Swagger) khi muốn tự bắn webhook. */
  buildSignaturePreview(input: { txnRef: string; gatewayTxnNo: string; amount: number; success: boolean }) {
    return {
      signature: this.gateway.buildSignature(input),
      header: 'x-mock-signature',
      signingData: `${input.txnRef}|${input.gatewayTxnNo}|${input.amount}|${input.success ? '1' : '0'}`,
    };
  }

  /**
   * Xử lý webhook/IPN từ cổng.
   *
   * `options.trusted = true` bỏ qua kiểm chữ ký (dùng cho `simulateGatewayPayment`
   * đã tự sinh chữ ký hợp lệ) – nhưng **vẫn** ghi `signatureValid = true`.
   */
  async handleWebhook(
    dto: MockWebhookDto,
    options: { trusted?: boolean; rawPayload?: Record<string, unknown> } = {},
  ): Promise<WebhookOutcome> {
    const eventType = dto.eventType ?? WebhookEventType.IPN;
    // Serialize DTO một lần: `payment_events.raw_payload` phải là bản ghi bất biến,
    // không phụ thuộc prototype của đối tượng DTO.
    const rawPayload = options.rawPayload ?? (JSON.parse(JSON.stringify(dto)) as Record<string, unknown>);
    const verify = options.trusted
      ? { valid: true }
      : this.gateway.verifySignature({
        gateway: dto.gateway,
        txnRef: dto.txnRef,
        gatewayTxnNo: dto.gatewayTxnNo,
        amount: dto.amount,
        success: dto.success,
        responseCode: dto.responseCode ?? '00',
        signature: dto.signature ?? null,
      });

    // Bước 1: ghi nhật ký ngay (append-only) – kể cả khi chữ ký sai.
    const payment = await this.paymentRepo.findOne({ where: { gatewayTxnRef: dto.txnRef } });

    if (!verify.valid) {
      await this.logEvent({
        paymentId: payment?.id ?? null,
        gateway: dto.gateway,
        txnRef: dto.txnRef,
        gatewayTxnNo: dto.gatewayTxnNo,
        eventType,
        signatureValid: false,
        result: WebhookResult.INVALID,
        rawPayload,
      });
      this.logger.warn(`Webhook chữ ký sai cho ${dto.txnRef}`);
      return { result: WebhookResult.INVALID, message: 'Chữ ký không hợp lệ', paymentId: payment?.id ?? null };
    }

    if (!payment) {
      await this.logEvent({
        paymentId: null,
        gateway: dto.gateway,
        txnRef: dto.txnRef,
        gatewayTxnNo: dto.gatewayTxnNo,
        eventType,
        signatureValid: true,
        result: WebhookResult.INVALID,
        rawPayload,
      });
      return { result: WebhookResult.INVALID, message: 'Không tìm thấy giao dịch', paymentId: null };
    }

    // Bước 2: idempotent – event đã xử lý thì bỏ qua nhưng vẫn báo "đã xử lý".
    const duplicated = await this.eventRepo.findOne({
      where: { gateway: dto.gateway, gatewayTxnNo: dto.gatewayTxnNo, eventType },
    });
    if (duplicated) {
      await this.logEvent({
        paymentId: payment.id,
        gateway: dto.gateway,
        txnRef: dto.txnRef,
        gatewayTxnNo: dto.gatewayTxnNo,
        eventType,
        signatureValid: true,
        result: WebhookResult.IGNORED,
        rawPayload,
      });
      return { result: WebhookResult.IGNORED, message: 'Giao dịch đã được xử lý trước đó', paymentId: payment.id };
    }

    // Bước 3: áp kết quả.
    const outcome = await this.paymentRepo.manager.transaction(async (manager) => {
      const locked = await this.lockPayment(manager, payment.id);

      if (locked.amount !== dto.amount) {
        await this.logEvent({
          paymentId: locked.id,
          gateway: dto.gateway,
          txnRef: dto.txnRef,
          gatewayTxnNo: dto.gatewayTxnNo,
          eventType,
          signatureValid: true,
          result: WebhookResult.INVALID,
          rawPayload,
        }, manager);
        return { result: WebhookResult.INVALID, message: 'Số tiền không khớp với giao dịch', paymentId: locked.id };
      }

      if (this.isPaidStatus(locked.status)) {
        await this.logEvent({
          paymentId: locked.id,
          gateway: dto.gateway,
          txnRef: dto.txnRef,
          gatewayTxnNo: dto.gatewayTxnNo,
          eventType,
          signatureValid: true,
          result: WebhookResult.IGNORED,
          rawPayload,
        }, manager);
        return { result: WebhookResult.IGNORED, message: 'Giao dịch đã ở trạng thái thành công', paymentId: locked.id };
      }

      if (!dto.success) {
        locked.status = PaymentStatus.FAILED;
        await manager.save(Payment, locked);
        await this.logEvent({
          paymentId: locked.id,
          gateway: dto.gateway,
          txnRef: dto.txnRef,
          gatewayTxnNo: dto.gatewayTxnNo,
          eventType,
          signatureValid: true,
          result: WebhookResult.PROCESSED,
          rawPayload,
        }, manager);
        return { result: WebhookResult.PROCESSED, message: 'Ghi nhận giao dịch thất bại', paymentId: locked.id };
      }

      // Trả tiền muộn: booking đã hết hạn/hủy/từ chối ⇒ nhận tiền nhưng phải hoàn lại.
      const booking = await this.lockBooking(manager, locked.bookingId);
      if (this.isBookingClosed(booking.status)) {
        locked.status = PaymentStatus.SUCCESS;
        locked.paidAt = new Date();
        locked.gatewayTxnNo = dto.gatewayTxnNo;
        await manager.save(Payment, locked);

        const refund = manager.create(Refund, {
          paymentId: locked.id,
          amount: locked.amount,
          status: RefundStatus.PENDING,
          reason: RefundReason.LATE_PAYMENT,
          isManual: true,
          errorMessage: null,
        });
        await manager.save(Refund, refund);

        await this.logEvent({
          paymentId: locked.id,
          gateway: dto.gateway,
          txnRef: dto.txnRef,
          gatewayTxnNo: dto.gatewayTxnNo,
          eventType,
          signatureValid: true,
          result: WebhookResult.LATE,
          rawPayload,
        }, manager);

        this.logger.warn(`Tiền về muộn cho booking ${booking.code} – đã tạo yêu cầu hoàn tự động`);
        return { result: WebhookResult.LATE, message: 'Booking đã đóng – đã tạo yêu cầu hoàn tiền', paymentId: locked.id };
      }

      // Đường đi bình thường.
      locked.status = PaymentStatus.SUCCESS;
      locked.paidAt = new Date();
      locked.gatewayTxnNo = dto.gatewayTxnNo;
      locked.expiresAt = null;
      await manager.save(Payment, locked);

      await this.logEvent({
        paymentId: locked.id,
        gateway: dto.gateway,
        txnRef: dto.txnRef,
        gatewayTxnNo: dto.gatewayTxnNo,
        eventType,
        signatureValid: true,
        result: WebhookResult.PROCESSED,
        rawPayload,
      }, manager);

      await this.onPaymentSucceeded(manager, booking);
      return { result: WebhookResult.PROCESSED, message: 'Thanh toán thành công', paymentId: locked.id };
    });

    return outcome;
  }

  /** Ghi log webhook không đọc được (payload rác) để đối soát. */
  async logInvalidWebhook(input: {
    gateway: string;
    txnRef: string;
    reason: string;
    rawPayload?: Record<string, unknown>;
  }): Promise<WebhookOutcome> {
    await this.logEvent({
      paymentId: null,
      gateway: input.gateway,
      txnRef: input.txnRef,
      gatewayTxnNo: null,
      eventType: WebhookEventType.IPN,
      signatureValid: false,
      result: WebhookResult.INVALID,
      rawPayload: input.rawPayload ?? { reason: input.reason },
    });
    return { result: WebhookResult.INVALID, message: input.reason, paymentId: null };
  }

  /** Danh sách `payment_events` của một giao dịch (đối soát). */
  async listEvents(paymentId: string) {
    await this.getOrFail(paymentId);
    return this.eventRepo.find({ where: { paymentId }, order: { createdAt: 'DESC' } });
  }

  // ===== hoàn tiền =====

  async createRefund(dto: CreateRefundDto, actor: AuthenticatedUser): Promise<RefundView> {
    const refund = await this.paymentRepo.manager.transaction(async (manager) => {
      const payment = await this.lockPayment(manager, dto.paymentId);
      if (!this.isPaidStatus(payment.status)) {
        throw new ConflictException('Chỉ hoàn tiền cho giao dịch đã thanh toán thành công');
      }

      const refundable = payment.refundableAmount();
      if (refundable <= 0) throw new ConflictException('Giao dịch này đã được hoàn toàn bộ');

      const amount = dto.amount ?? refundable;
      if (amount > refundable) {
        throw new BadRequestException(
          `Số tiền hoàn (${amount.toLocaleString('vi-VN')}đ) vượt quá số còn lại (${refundable.toLocaleString('vi-VN')}đ)`,
        );
      }

      if (dto.cancelRequestId) {
        const cancelRequest = await manager.getRepository(CancelRequest).findOne({
          where: { id: dto.cancelRequestId },
        });
        if (!cancelRequest) throw new NotFoundException('Không tìm thấy yêu cầu hủy');
        if (cancelRequest.bookingId !== payment.bookingId) {
          throw new BadRequestException('Yêu cầu hủy không thuộc booking của giao dịch này');
        }
      }

      return manager.save(
        Refund,
        manager.create(Refund, {
          paymentId: payment.id,
          cancelRequestId: dto.cancelRequestId ?? null,
          amount,
          status: RefundStatus.PENDING,
          reason: dto.reason,
          gatewayRef: dto.gatewayRef ?? null,
          isManual: dto.isManual ?? true,
          errorMessage: dto.note ?? null,
        }),
      );
    });

    this.logger.log(`Tạo yêu cầu hoàn ${refund.amount}đ cho payment ${dto.paymentId} (bởi ${actor.email})`);
    return this.toRefundView(refund);
  }

  /** Xác nhận đã chuyển tiền hoàn → cộng `refunded_amount`, có thể chuyển payment sang REFUNDED. */
  async completeRefund(refundId: string, dto: CompleteRefundDto, actor: AuthenticatedUser): Promise<RefundView> {
    const refund = await this.paymentRepo.manager.transaction(async (manager) => {
      const locked = await manager.getRepository(Refund).findOne({
        where: { id: refundId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền');
      if (locked.status === RefundStatus.REFUNDED) return locked;
      if (locked.status !== RefundStatus.PENDING) {
        throw new ConflictException('Yêu cầu hoàn tiền đã kết thúc');
      }

      const payment = await this.lockPayment(manager, locked.paymentId);
      const refundedAfter = payment.refundedAmount + locked.amount;
      if (refundedAfter > payment.amount) {
        throw new ConflictException('Tổng tiền hoàn vượt quá số tiền giao dịch');
      }

      payment.refundedAmount = refundedAfter;
      payment.status =
        refundedAfter >= payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
      await manager.save(Payment, payment);

      locked.status = RefundStatus.REFUNDED;
      locked.refundedAt = new Date();
      locked.processedBy = actor.id;
      if (dto.gatewayRef) locked.gatewayRef = dto.gatewayRef;
      return manager.save(Refund, locked);
    });

    this.logger.log(`Hoàn tất hoàn tiền ${refund.amount}đ (bởi ${actor.email})`);
    return this.toRefundView(refund);
  }

  async rejectRefund(refundId: string, errorMessage: string, actor: AuthenticatedUser): Promise<RefundView> {
    const refund = await this.refundRepo.manager.transaction(async (manager) => {
      const locked = await manager.getRepository(Refund).findOne({
        where: { id: refundId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền');
      if (locked.status !== RefundStatus.PENDING) {
        throw new ConflictException('Yêu cầu hoàn tiền đã kết thúc');
      }

      locked.status = RefundStatus.FAILED;
      locked.errorMessage = errorMessage.trim();
      locked.processedBy = actor.id;
      locked.refundedAt = null;
      return manager.save(Refund, locked);
    });

    return this.toRefundView(refund);
  }

  async paginateRefunds(query: QueryRefundsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.refundRepo.createQueryBuilder('refund');
    if (query.status) qb.andWhere('refund.status = :status', { status: query.status });
    if (query.paymentId) qb.andWhere('refund.paymentId = :paymentId', { paymentId: query.paymentId });

    qb.orderBy('refund.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [refunds, total] = await qb.getManyAndCount();
    return { items: refunds.map((refund) => this.toRefundView(refund)), total, page, limit };
  }

  // ===== job nền =====

  /** Hết hạn các giao dịch online quá `expires_at` → EXPIRED (cổng cũng không còn nhận). */
  async expireStalePayments(): Promise<number> {
    const result = await this.paymentRepo
      .createQueryBuilder()
      .update(Payment)
      .set({ status: PaymentStatus.EXPIRED })
      .where('status = :pending', { pending: PaymentStatus.PENDING })
      .andWhere('expires_at IS NOT NULL AND expires_at <= :now', { now: new Date() })
      .execute();

    const affected = result.affected ?? 0;
    if (affected > 0) this.logger.log(`Đã đánh dấu ${affected} giao dịch thanh toán hết hạn`);
    return affected;
  }

  // ===== nội bộ =====

  /**
   * Ghi nhận thanh toán thủ công (tiền mặt / duyệt chứng từ) rồi xác nhận booking.
   * Tách khỏi `handleWebhook` vì không có IPN: người thao tác là nhân viên.
   */
  private async confirmManualPayment(paymentId: string, actor: AuthenticatedUser, note: string): Promise<PaymentView> {
    const bookingId = await this.paymentRepo.manager.transaction(async (manager) => {
      const payment = await this.lockPayment(manager, paymentId);
      if (this.isPaidStatus(payment.status)) return payment.bookingId;

      const booking = await this.lockBooking(manager, payment.bookingId);
      if (this.isBookingClosed(booking.status)) {
        throw new ConflictException(`Booking đang ở trạng thái ${booking.status} – không thể ghi nhận thanh toán`);
      }

      payment.status = PaymentStatus.SUCCESS;
      payment.paidAt = new Date();
      payment.reviewedBy = actor.id;
      payment.expiresAt = null;
      payment.proofNote = [payment.proofNote, note].filter(Boolean).join('\n');
      await manager.save(Payment, payment);

      await this.onPaymentSucceeded(manager, booking);
      return payment.bookingId;
    });

    const payment = await this.getOrFail(paymentId);
    this.logger.log(`Ghi nhận thanh toán ${payment.amount}đ cho booking ${bookingId} (bởi ${actor.email})`);
    return this.toView(payment);
  }

  /**
   * Side-effect khi payment SUCCESS: booking chờ thanh toán → chờ xác nhận.
   *
   * Cố ý **không** gọi thẳng `BookingService.confirm` (mở transaction riêng, đã bị
   * khóa bởi transaction này). Việc chuyển CONFIRMED vẫn do nhân viên thực hiện ở
   * `PATCH /bookings/:id/confirm` với `booking:confirm` – giữ đúng mô hình:
   * tiền về ⇒ chờ duyệt ⇒ xác nhận ⇒ tăng `sold_seats`.
   */
  private async onPaymentSucceeded(manager: EntityManager, booking: Booking): Promise<void> {
    if (booking.status === BookingStatus.PENDING_PAYMENT) {
      const closed = await manager.getRepository(Booking).findOne({
        where: { id: booking.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (closed && closed.status === BookingStatus.PENDING_PAYMENT) {
        closed.transitionTo(BookingStatus.PENDING_CONFIRMATION);
        closed.expiresAt = null;
        await manager.save(Booking, closed);
      }
    }
  }

  private async lockBooking(manager: EntityManager, id: string): Promise<Booking> {
    const booking = await manager.getRepository(Booking).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    return booking;
  }

  private async lockPayment(manager: EntityManager, id: string): Promise<Payment> {
    const payment = await manager.getRepository(Payment).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
    return payment;
  }

  private async logEvent(
    input: {
      paymentId: string | null;
      gateway: string;
      txnRef: string;
      gatewayTxnNo: string | null;
      eventType: WebhookEventType;
      signatureValid: boolean;
      result: WebhookResult;
      rawPayload: Record<string, unknown>;
    },
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(PaymentEvent) : this.eventRepo;
    await repo.save(
      repo.create({
        paymentId: input.paymentId,
        gateway: input.gateway,
        txnRef: input.txnRef,
        gatewayTxnNo: input.gatewayTxnNo,
        eventType: input.eventType,
        signatureValid: input.signatureValid,
        result: input.result,
        rawPayload: input.rawPayload,
        createdAt: new Date(),
      }),
    );
  }

  /** Không tạo giao dịch mới cho booking đã đóng / đã thanh toán. */
  private assertBookableForPayment(booking: Booking): void {
    if (this.isBookingClosed(booking.status)) {
      throw new ConflictException(`Booking đang ở trạng thái ${booking.status} – không thể thanh toán`);
    }
  }

  private isBookingClosed(status: BookingStatus): boolean {
    return (
      status === BookingStatus.CANCELLED ||
      status === BookingStatus.REJECTED ||
      status === BookingStatus.EXPIRED
    );
  }

  private isPaidStatus(status: PaymentStatus): boolean {
    return (
      status === PaymentStatus.SUCCESS ||
      status === PaymentStatus.PARTIALLY_REFUNDED ||
      status === PaymentStatus.REFUNDED
    );
  }

  /** Mã tham chiếu `PAY{YY}{6 số}` – MySQL không có sequence nên lấy MAX trong năm. */
  private async nextTxnRef(manager: EntityManager): Promise<string> {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const prefix = `PAY${today.slice(2, 4)}`;

    const row = await manager
      .createQueryBuilder(Payment, 'payment')
      .select('MAX(payment.gatewayTxnRef)', 'maxRef')
      .where('payment.gatewayTxnRef LIKE :prefix', { prefix: `${prefix}%` })
      .getRawOne<{ maxRef: string | null }>();

    const current = row?.maxRef ? Number(String(row.maxRef).replace(/\D/g, '').slice(-6)) : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    return `${prefix}${String(next).padStart(6, '0')}`;
  }

  private toView(payment: Payment): PaymentView {
    return {
      id: payment.id,
      bookingId: payment.bookingId,
      bookingCode: (payment.booking as Booking | undefined)?.code ?? null,
      method: payment.method,
      amount: payment.amount,
      status: payment.status,
      gateway: payment.gateway ?? null,
      gatewayTxnRef: payment.gatewayTxnRef ?? null,
      gatewayTxnNo: payment.gatewayTxnNo ?? null,
      paymentUrl: payment.paymentUrl ?? null,
      proofUrl: payment.proofUrl ?? null,
      proofNote: payment.proofNote ?? null,
      refundedAmount: payment.refundedAmount,
      refundableAmount: payment.refundableAmount(),
      reviewedBy: payment.reviewedBy ?? null,
      paidAt: payment.paidAt ?? null,
      expiresAt: payment.expiresAt ?? null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private toRefundView(refund: Refund): RefundView {
    return {
      id: refund.id,
      paymentId: refund.paymentId,
      cancelRequestId: refund.cancelRequestId ?? null,
      amount: refund.amount,
      status: refund.status,
      reason: refund.reason,
      gatewayRef: refund.gatewayRef ?? null,
      isManual: refund.isManual,
      processedBy: refund.processedBy ?? null,
      refundedAt: refund.refundedAt ?? null,
      errorMessage: refund.errorMessage ?? null,
      createdAt: refund.createdAt,
    };
  }
}
