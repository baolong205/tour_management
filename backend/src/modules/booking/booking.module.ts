import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module.js';
import { Promotion } from '../promotion/entities/promotion.entity.js';
import { PromotionModule } from '../promotion/promotion.module.js';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { ScheduleModule } from '../schedule/schedule.module.js';
import { BookingController } from './booking.controller.js';
import { BookingService } from './booking.service.js';
import { Booking } from './entities/booking.entity.js';
import { CancelRequest } from './entities/cancel-request.entity.js';
import { Invoice } from './entities/invoice.entity.js';
import { Passenger } from './entities/passenger.entity.js';

/**
 * Đặt tour + hủy + hóa đơn.
 *
 * Phụ thuộc một chiều:
 * - `CatalogModule` → `CancelPolicyService` (tính phí hủy) và `TourService` (lấy chính sách của tour).
 * - `ScheduleModule` → `holdSeats` / `releaseHoldsByBooking` / `sumActiveHeldSeats`.
 * - `PromotionModule` → `PromotionService` (validate / reserve / release lượt dùng mã).
 *
 * Export `BookingService` để module payment / review cập nhật trạng thái booking.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Passenger, CancelRequest, Invoice, Promotion, DepartureSchedule]),
    CatalogModule,
    ScheduleModule,
    PromotionModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule { }
