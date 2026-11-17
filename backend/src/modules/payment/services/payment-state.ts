import { NotFoundException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { PaymentStatus } from '../../../common/enums/index.js';
import { Payment } from '../entities/payment.entity.js';
import type { Refund } from '../entities/refund.entity.js';
import type { RefundView } from '../types/payment.types.js';

export async function lockPayment(
  manager: EntityManager,
  id: string,
): Promise<Payment> {
  const payment = await manager.getRepository(Payment).findOne({
    where: { id },
    lock: { mode: 'pessimistic_write' },
  });
  if (!payment)
    throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
  return payment;
}

export function isPaidStatus(status: PaymentStatus): boolean {
  return (
    status === PaymentStatus.SUCCESS ||
    status === PaymentStatus.PARTIALLY_REFUNDED ||
    status === PaymentStatus.REFUNDED
  );
}

export function toRefundView(refund: Refund): RefundView {
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
