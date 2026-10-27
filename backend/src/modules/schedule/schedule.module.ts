import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module.js';
import { DepartureSchedule } from './entities/departure-schedule.entity.js';
import { ScheduleCheckpoint } from './entities/schedule-checkpoint.entity.js';
import { SeatHold } from './entities/seat-hold.entity.js';
import { ScheduleController } from './schedule.controller.js';
import { ScheduleService } from './schedule.service.js';

/**
 * Lịch khởi hành + giữ chỗ.
 *
 * Export `ScheduleService` để `BookingService` dùng lại `holdSeats` (trong transaction
 * của booking) và `sumActiveHeldSeats` khi tính chỗ trống.
 */
@Module({
  imports: [TypeOrmModule.forFeature([DepartureSchedule, SeatHold, ScheduleCheckpoint]), CatalogModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule { }
