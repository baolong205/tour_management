import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity.js';
import { Tour } from '../catalog/entities/tour.entity.js';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { ReviewController } from './review.controller.js';
import { ReviewService } from './review.service.js';
import { Review } from './entities/review.entity.js';

/**
 * Đánh giá tour.
 *
 * Đọc trực tiếp repository của `booking` / `schedule` / `tour` (không import module
 * của chúng) để tránh phụ thuộc vòng; chỉ cần `forFeature` các entity liên quan.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Review, Booking, Tour, DepartureSchedule])],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule { }