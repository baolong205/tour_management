import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module.js';
import { User } from '../users/entities/user.entity.js';
import { AuditLogController } from './audit-log.controller.js';
import { AuditLogService } from './audit-log.service.js';
import { BannerController } from './banner.controller.js';
import { BannerService } from './banner.service.js';
import { DomainEventListener } from './domain-event.listener.js';
import { EmailTemplateController } from './email-template.controller.js';
import { EmailTemplateService } from './email-template.service.js';
import { AuditLog } from './entities/audit-log.entity.js';
import { Banner } from './entities/banner.entity.js';
import { EmailTemplate } from './entities/email-template.entity.js';
import { SystemSetting } from './entities/system-setting.entity.js';
import { SystemSettingController } from './system-setting.controller.js';
import { SystemSettingService } from './system-setting.service.js';
import { ReportController } from './report.controller.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { Tour } from '../catalog/entities/tour.entity.js';
import { Payment } from '../payment/entities/payment.entity.js';
import { Refund } from '../payment/entities/refund.entity.js';

/**
 * Cấu hình & nội dung hệ thống: nhật ký thao tác, banner, mẫu email, cấu hình động.
 *
 * Đọc trực tiếp repository `users` (cho tên người thao tác trong nhật ký),
 * không import `UsersModule` để tránh phụ thuộc vòng.
 *
 * Import `NotificationModule` để `DomainEventListener` tạo được thông báo in-app;
 * `NotificationModule` không import ngược lại nên không có phụ thuộc vòng.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, Banner, EmailTemplate, SystemSetting, User, Booking, Tour, Payment, Refund]),
    NotificationModule,
  ],
  controllers: [
    AuditLogController,
    BannerController,
    EmailTemplateController,
    SystemSettingController,
    ReportController,
  ],
  providers: [
    AuditLogService,
    BannerService,
    EmailTemplateService,
    SystemSettingService,
    // Cầu nối sự kiện nghiệp vụ → audit_logs + notifications (xem DomainEventListener).
    DomainEventListener,
  ],
  exports: [AuditLogService, BannerService, EmailTemplateService, SystemSettingService],
})
export class SystemModule { }