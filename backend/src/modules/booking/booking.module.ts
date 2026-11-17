import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module.js';
import { MailModule } from '../mail/mail.module.js';
import { PromotionModule } from '../promotion/promotion.module.js';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { ScheduleModule } from '../schedule/schedule.module.js';
import { SystemModule } from '../system/system.module.js';
import { BookingController } from './booking.controller.js';
import { BookingService } from './booking.service.js';
import { Booking } from './entities/booking.entity.js';
import { CancelRequest } from './entities/cancel-request.entity.js';
import { Invoice } from './entities/invoice.entity.js';
import { Passenger } from './entities/passenger.entity.js';
import { BookingMailService } from './services/booking-mail.service.js';
import { InvoiceService } from './services/invoice.service.js';
import { BookingPricingService } from './services/booking-pricing.service.js';
import { BookingCancellationService } from './services/booking-cancellation.service.js';
import { BookingReservationsService } from './services/booking-reservations.service.js';

/**
 * Đặt tour + hủy + hóa đơn.
 *
 * Phụ thuộc một chiều:
 * - `CatalogModule` → `CancelPolicyService` (tính phí hủy) và `TourService` (lấy chính sách của tour).
 * - `ScheduleModule` → `holdSeats` / `releaseHoldsByBooking` / `sumActiveHeldSeats`.
 * - `PromotionModule` → `PromotionService` (validate / reserve / release lượt dùng mã).
 * - `MailModule` → `MailOutboxService` (xếp email đơn vào outbox trong transaction).
 * - `SystemModule` → `EmailTemplateService` (đọc mẫu `BOOKING_CONFIRMED`).
 *
 * `SystemModule` chỉ đọc entity `Booking` qua `forFeature`, không import
 * `BookingModule`, nên hai chiều không tạo phụ thuộc vòng.
 *
 * Export `BookingService` để module payment / review cập nhật trạng thái booking.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Passenger, CancelRequest, Invoice, DepartureSchedule]),
    CatalogModule,
    ScheduleModule,
    PromotionModule,
    MailModule,
    SystemModule,
  ],
  controllers: [BookingController],
  providers: [BookingService, InvoiceService, BookingMailService, BookingPricingService, BookingCancellationService, BookingReservationsService],
  exports: [BookingService, InvoiceService],
})
export class BookingModule { }
