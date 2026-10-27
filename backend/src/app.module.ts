import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard.js';
import { PermissionsGuard } from './common/auth/permissions.guard.js';
import { RolesGuard } from './common/auth/roles.guard.js';
import { ALL_ENTITIES } from './common/entities/entity-list.js';
import databaseConfig from './config/database.config.js';
import jwtConfig from './config/jwt.config.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BookingModule } from './modules/booking/booking.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { OperationsModule } from './modules/operations/operations.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { PromotionModule } from './modules/promotion/promotion.module.js';
import { ReviewModule } from './modules/review/review.module.js';
import { ScheduleModule } from './modules/schedule/schedule.module.js';
import { SupplierModule } from './modules/supplier/supplier.module.js';
import { SystemModule } from './modules/system/system.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [databaseConfig, jwtConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        synchronize: config.get<boolean>('database.synchronize'),
        logging: config.get<boolean>('database.logging'),
        timezone: config.get<string>('database.timezone'),
        charset: config.get<string>('database.charset'),
        // autoLoadEntities vẫn bật cho các feature module dùng forFeature();
        // đồng thời khai báo tường minh để mọi entity được nạp ngay cả khi
        // module của nó chưa được import (tránh lỗi quan hệ "Entity metadata not found").
        autoLoadEntities: true,
        entities: ALL_ENTITIES,
        migrations: ['dist/database/migrations/*.js'],
      }),
    }),
    // Bật scheduler toàn cục cho các @Cron trong MaintenanceService.
    NestScheduleModule.forRoot(),
    /**
     * Bus sự kiện nội bộ cho các tác vụ phụ (audit log, thông báo).
     *
     * `maxListeners` nâng lên vì mỗi sự kiện có thể có nhiều listener độc lập
     * (audit, notification, sau này là email/Socket.IO).
     */
    EventEmitterModule.forRoot({ maxListeners: 20, verboseMemoryLeak: true }),
    /**
     * Rate limit mặc định: 300 request / 60 giây / IP cho toàn API.
     *
     * Mức này đủ rộng cho SPA bình thường nhưng chặn được script quét hàng loạt.
     * Các endpoint nhạy cảm (login, register, quên/đặt lại mật khẩu, refresh,
     * verify email) siết riêng bằng `@Throttle` ở `AuthController`, thay cho
     * việc trước đây **không có bất kỳ giới hạn nào** ⇒ brute-force mật khẩu
     * hoặc spam email đặt lại mật khẩu không bị cản.
     */
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 300 },
    ]),
    UsersModule,
    AuthModule,
    // Catalog → Schedule → Booking: phụ thuộc một chiều, không tạo vòng lặp module.
    CatalogModule,
    ScheduleModule,
    PromotionModule,
    BookingModule,
    // Payment đọc booking (khóa dòng khi ghi nhận tiền), Operations đọc schedule/booking.
    PaymentModule,
    OperationsModule,
    // Đánh giá tour, thông báo, nhà cung cấp, cấu hình & nội dung hệ thống.
    ReviewModule,
    NotificationModule,
    SupplierModule,
    SystemModule,
    // Tải tệp (ảnh tour, ảnh đại diện, biên lai) – độc lập, dùng lại từ mọi module.
    UploadModule,
    // Job định kỳ dọn chỗ giữ / booking / giao dịch quá hạn.
    MaintenanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Rate limit phải chạy TRƯỚC guard xác thực: request bị chặn không tốn CPU
    // cho việc verify JWT/truy vấn DB, và không thể dùng lỗi 401/403 để dò tài khoản.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Thứ tự QUAN TRỌNG: xác thực JWT trước, rồi mới kiểm tra role và quyền.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule { }
