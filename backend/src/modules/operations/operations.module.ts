import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity.js';
import { Passenger } from '../booking/entities/passenger.entity.js';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { ScheduleCheckpoint } from '../schedule/entities/schedule-checkpoint.entity.js';
import { GuideProfile } from '../users/entities/guide-profile.entity.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';
import { Attendance } from './entities/attendance.entity.js';
import { GuideAssignment } from './entities/guide-assignment.entity.js';
import { Incident } from './entities/incident.entity.js';
import { GuideAssignmentController } from './guide-assignment.controller.js';
import { GuideAssignmentService } from './guide-assignment.service.js';
import { IncidentController } from './incident.controller.js';
import { IncidentService } from './incident.service.js';
import { OperationsController } from './operations.controller.js';
import { OperationsService } from './operations.service.js';

/**
 * Vận hành tour: phân công HDV → điểm danh → sự cố/chi phí phát sinh.
 *
 * Chỉ đọc dữ liệu của module khác (schedule, booking, users) qua repository,
 * không import module của chúng để tránh phụ thuộc vòng.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      GuideAssignment,
      Attendance,
      Incident,
      DepartureSchedule,
      ScheduleCheckpoint,
      Booking,
      Passenger,
      GuideProfile,
    ]),
  ],
  controllers: [
    GuideAssignmentController,
    AttendanceController,
    IncidentController,
    OperationsController,
  ],
  providers: [GuideAssignmentService, AttendanceService, IncidentService, OperationsService],
  exports: [GuideAssignmentService, AttendanceService, IncidentService, OperationsService],
})
export class OperationsModule { }
