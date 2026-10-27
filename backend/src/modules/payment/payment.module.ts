import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingModule } from '../booking/booking.module.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { CancelRequest } from '../booking/entities/cancel-request.entity.js';
import { PaymentEvent } from './entities/payment-event.entity.js';
import { Payment } from './entities/payment.entity.js';
import { Refund } from './entities/refund.entity.js';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { MockPaymentGateway } from './services/mock-payment.gateway.js';
import { PAYMENT_GATEWAY } from './services/payment-gateway.interface.js';

/**
 * Thanh toán + hoàn tiền (cổng giả lập).
 *
 * Phụ thuộc một chiều `BookingModule` (đọc booking, khóa dòng khi ghi nhận tiền).
 *
 * Cổng thanh toán được cấp qua token `PAYMENT_GATEWAY`. Muốn dùng cổng thật
 * (VNPay/MoMo): viết class `implements PaymentGateway` rồi đổi `useClass` bên
 * dưới – `PaymentService` không phải sửa gì.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentEvent, Refund, Booking, CancelRequest]),
    BookingModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    MockPaymentGateway,
    { provide: PAYMENT_GATEWAY, useExisting: MockPaymentGateway },
  ],
  exports: [PaymentService],
})
export class PaymentModule { }
