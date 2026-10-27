import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingService } from '../booking/booking.service.js';
import { PaymentService } from '../payment/payment.service.js';
import { ScheduleService } from '../schedule/schedule.service.js';

/**
 * Các job định kỳ dọn dẹp dữ liệu tạm.
 *
 * Trước đây các hàm `expireStalePayments` / `expireOverdueBookings` /
 * `releaseExpiredHolds` chỉ được gọi thủ công. Service này gom chúng vào cron
 * để hệ thống tự nhất quán mà không cần ai bấm nút.
 *
 * Thứ tự chạy trong mỗi tick là quan trọng:
 * 1. `releaseExpiredHolds` – nhả chỗ giữ quá hạn (chỗ chưa gắn booking).
 * 2. `expireOverdueBookings` – booking chờ thanh toán quá hạn → EXPIRED (nhả chỗ + mã).
 * 3. `expireStalePayments` – giao dịch PENDING quá hạn → EXPIRED.
 *
 * Mọi lỗi được nuốt và ghi log: một job hỏng không được làm sập tiến trình.
 */
@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly bookingService: BookingService,
    private readonly scheduleService: ScheduleService,
  ) { }

  /** Mỗi 5 phút: dọn chỗ giữ, booking và giao dịch quá hạn. */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'expire-stale-records' })
  async expireStaleRecords(): Promise<void> {
    await this.runSafely('releaseExpiredHolds', () => this.scheduleService.releaseExpiredHolds());
    await this.runSafely('expireOverdueBookings', () => this.bookingService.expireOverdueBookings());
    await this.runSafely('expireStalePayments', () => this.paymentService.expireStalePayments());
  }

  /**
   * Mỗi giờ: đồng bộ trạng thái lịch khởi hành theo thời gian rồi hoàn tất booking.
   *
   * Đây là mảnh ghép còn thiếu của luồng Review: trước đó không có ai chuyển
   * `departure_schedules` sang `ONGOING`/`COMPLETED` và cũng không có ai gọi
   * `BookingService.completeBySchedule`, nên booking vĩnh viễn ở `CONFIRMED`
   * ⇒ `ReviewService` (yêu cầu `COMPLETED`) từ chối mọi đánh giá.
   *
   * Thứ tự bắt buộc: đổi trạng thái lịch trước, hoàn tất booking sau.
   * Cả hai bước đều idempotent nên chạy lặp lại không gây sai lệch.
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'schedule-status-sync' })
  async syncScheduleStatuses(): Promise<void> {
    await this.runSafely('syncScheduleStatuses', () => this.scheduleService.syncScheduleStatuses());
    await this.runSafely('completeBookingsOfFinishedSchedules', () =>
      this.bookingService.completeBookingsOfFinishedSchedules(),
    );
  }

  private async runSafely(label: string, job: () => Promise<number>): Promise<void> {
    try {
      const affected = await job();
      if (affected > 0) this.logger.log(`[cron] ${label}: xử lý ${affected} bản ghi`);
    } catch (error) {
      this.logger.error(`[cron] ${label} thất bại: ${(error as Error).message}`, (error as Error).stack);
    }
  }
}