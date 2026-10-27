import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module.js';
import { PaymentModule } from '../payment/payment.module.js';
import { ScheduleModule } from '../schedule/schedule.module.js';
import { MaintenanceService } from './maintenance.service.js';

/**
 * Job định kỳ dọn dẹp (chỗ giữ / booking / giao dịch quá hạn).
 *
 * Chỉ import các module đã export service cần dùng; không có controller vì
 * đây là tiến trình nền. `ScheduleModule` (của `@nestjs/schedule`) được đăng ký
 * một lần ở `AppModule` để bật scheduler toàn cục.
 */
@Module({
  imports: [ScheduleModule, BookingModule, PaymentModule],
  providers: [MaintenanceService],
})
export class MaintenanceModule { }