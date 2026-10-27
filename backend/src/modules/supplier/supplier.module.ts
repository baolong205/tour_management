import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { ResourceAssignmentController } from './resource-assignment.controller.js';
import { ResourceAssignmentService } from './resource-assignment.service.js';
import { ResourceAssignment } from './entities/resource-assignment.entity.js';
import { Supplier } from './entities/supplier.entity.js';
import { SupplierController } from './supplier.controller.js';
import { SupplierService } from './supplier.service.js';

/**
 * Nhà cung cấp + phân bổ nguồn lực cho lịch khởi hành.
 *
 * Đọc trực tiếp repository `departure_schedules` để kiểm tra lịch tồn tại
 * (không import `ScheduleModule` để tránh phụ thuộc vòng).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Supplier, ResourceAssignment, DepartureSchedule])],
  controllers: [SupplierController, ResourceAssignmentController],
  providers: [SupplierService, ResourceAssignmentService],
  exports: [SupplierService, ResourceAssignmentService],
})
export class SupplierModule { }