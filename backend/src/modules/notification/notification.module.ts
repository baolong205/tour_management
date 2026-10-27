import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity.js';
import { NotificationController } from './notification.controller.js';
import { NotificationService } from './notification.service.js';

/**
 * Thông báo in-app.
 *
 * Export `NotificationService` để các module khác (booking, payment, operations)
 * phát thông báo cho người dùng mà không cần HTTP.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule { }