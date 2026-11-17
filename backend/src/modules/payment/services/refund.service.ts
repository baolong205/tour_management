import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../../common/auth/auth.types.js';
import { PaymentStatus, RefundStatus } from '../../../common/enums/index.js';
import { CancelRequest } from '../../booking/entities/cancel-request.entity.js';
import type {
  CompleteRefundDto,
  CreateRefundDto,
  QueryRefundsDto,
} from '../dto/payment.dto.js';
import { Payment } from '../entities/payment.entity.js';
import { Refund } from '../entities/refund.entity.js';
import type { RefundView } from '../types/payment.types.js';
import { isPaidStatus, lockPayment, toRefundView } from './payment-state.js';

/** Refund lifecycle; transaction boundaries and payment row locks are preserved. */
@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Refund) private readonly refundRepo: Repository<Refund>,
  ) {}
  // ===== hoàn tiền =====

  async createRefund(
    dto: CreateRefundDto,
    actor: AuthenticatedUser,
  ): Promise<RefundView> {
    const refund = await this.paymentRepo.manager.transaction(
      async (manager) => {
        const payment = await lockPayment(manager, dto.paymentId);
        if (!isPaidStatus(payment.status)) {
          throw new ConflictException(
            'Chỉ hoàn tiền cho giao dịch đã thanh toán thành công',
          );
        }

        const refundable = payment.refundableAmount();
        if (refundable <= 0)
          throw new ConflictException('Giao dịch này đã được hoàn toàn bộ');

        const amount = dto.amount ?? refundable;
        if (amount > refundable) {
          throw new BadRequestException(
            `Số tiền hoàn (${amount.toLocaleString('vi-VN')}đ) vượt quá số còn lại (${refundable.toLocaleString('vi-VN')}đ)`,
          );
        }

        if (dto.cancelRequestId) {
          const cancelRequest = await manager
            .getRepository(CancelRequest)
            .findOne({
              where: { id: dto.cancelRequestId },
            });
          if (!cancelRequest)
            throw new NotFoundException('Không tìm thấy yêu cầu hủy');
          if (cancelRequest.bookingId !== payment.bookingId) {
            throw new BadRequestException(
              'Yêu cầu hủy không thuộc booking của giao dịch này',
            );
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
      },
    );

    this.logger.log(
      `Tạo yêu cầu hoàn ${refund.amount}đ cho payment ${dto.paymentId} (bởi ${actor.email})`,
    );
    return toRefundView(refund);
  }

  /** Xác nhận đã chuyển tiền hoàn → cộng `refunded_amount`, có thể chuyển payment sang REFUNDED. */
  async completeRefund(
    refundId: string,
    dto: CompleteRefundDto,
    actor: AuthenticatedUser,
  ): Promise<RefundView> {
    const refund = await this.paymentRepo.manager.transaction(
      async (manager) => {
        const locked = await manager.getRepository(Refund).findOne({
          where: { id: refundId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!locked)
          throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền');
        if (locked.status === RefundStatus.REFUNDED) return locked;
        if (locked.status !== RefundStatus.PENDING) {
          throw new ConflictException('Yêu cầu hoàn tiền đã kết thúc');
        }

        const payment = await lockPayment(manager, locked.paymentId);
        const refundedAfter = payment.refundedAmount + locked.amount;
        if (refundedAfter > payment.amount) {
          throw new ConflictException(
            'Tổng tiền hoàn vượt quá số tiền giao dịch',
          );
        }

        payment.refundedAmount = refundedAfter;
        payment.status =
          refundedAfter >= payment.amount
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PARTIALLY_REFUNDED;
        await manager.save(Payment, payment);

        locked.status = RefundStatus.REFUNDED;
        locked.refundedAt = new Date();
        locked.processedBy = actor.id;
        if (dto.gatewayRef) locked.gatewayRef = dto.gatewayRef;
        return manager.save(Refund, locked);
      },
    );

    this.logger.log(
      `Hoàn tất hoàn tiền ${refund.amount}đ (bởi ${actor.email})`,
    );
    return toRefundView(refund);
  }

  async rejectRefund(
    refundId: string,
    errorMessage: string,
    actor: AuthenticatedUser,
  ): Promise<RefundView> {
    const refund = await this.refundRepo.manager.transaction(
      async (manager) => {
        const locked = await manager.getRepository(Refund).findOne({
          where: { id: refundId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!locked)
          throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền');
        if (locked.status !== RefundStatus.PENDING) {
          throw new ConflictException('Yêu cầu hoàn tiền đã kết thúc');
        }

        locked.status = RefundStatus.FAILED;
        locked.errorMessage = errorMessage.trim();
        locked.processedBy = actor.id;
        locked.refundedAt = null;
        return manager.save(Refund, locked);
      },
    );

    return toRefundView(refund);
  }

  async paginateRefunds(query: QueryRefundsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.refundRepo.createQueryBuilder('refund');
    if (query.status)
      qb.andWhere('refund.status = :status', { status: query.status });
    if (query.paymentId)
      qb.andWhere('refund.paymentId = :paymentId', {
        paymentId: query.paymentId,
      });

    qb.orderBy('refund.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [refunds, total] = await qb.getManyAndCount();
    return {
      items: refunds.map((refund) => toRefundView(refund)),
      total,
      page,
      limit,
    };
  }
}
