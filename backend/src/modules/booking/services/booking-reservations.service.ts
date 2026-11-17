import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { ScheduleStatus } from '../../../common/enums/index.js';
import { PromotionService } from '../../promotion/promotion.service.js';
import { DepartureSchedule } from '../../schedule/entities/departure-schedule.entity.js';
import { ScheduleService } from '../../schedule/schedule.service.js';
import { Booking } from '../entities/booking.entity.js';

/** Reservation changes always use the caller's transaction manager. */
@Injectable()
export class BookingReservationsService {
  constructor(
    @InjectRepository(DepartureSchedule)
    private readonly scheduleRepo: Repository<DepartureSchedule>,
    private readonly scheduleService: ScheduleService,
    private readonly promotionService: PromotionService,
  ) {}
  // ===== nội bộ: transaction helpers =====

  /**
   * Đọc booking kèm khóa bi quan để hai thao tác đồng thời (vd thanh toán về cùng
   * lúc nhân viên xác nhận) không ghi đè trạng thái của nhau.
   */
  async lockBooking(manager: EntityManager, id: string): Promise<Booking> {
    const booking = await manager.getRepository(Booking).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy booking');
    return booking;
  }

  /** Giảm `sold_seats` khi hủy booking đã xác nhận, rồi nhả hold còn lại. */
  async releaseSeats(manager: EntityManager, booking: Booking): Promise<void> {
    if (booking.confirmedAt) {
      const schedule = await manager.getRepository(DepartureSchedule).findOne({
        where: { id: booking.scheduleId },
        lock: { mode: 'pessimistic_write' },
      });
      if (schedule) {
        schedule.soldSeats = Math.max(
          schedule.soldSeats - booking.seatCount,
          0,
        );
        // Lịch đã FULL mà có chỗ trả lại thì mở bán tiếp.
        if (
          schedule.status === ScheduleStatus.FULL &&
          schedule.availableSeats() > 0
        ) {
          schedule.status = ScheduleStatus.OPEN;
        }
        await manager.save(DepartureSchedule, schedule);
      }
    }
    await this.scheduleService.releaseHoldsByBooking(booking.id, manager);
  }

  /**
   * Nhả lượt dùng mã khi booking không còn giữ chỗ (hủy / từ chối / hết hạn).
   * Chỉ gọi khi booking thực sự có gắn mã để tránh UPDATE vô ích.
   */
  async releasePromotion(
    manager: EntityManager,
    booking: Booking,
    reason: string = booking.status,
  ): Promise<void> {
    if (!booking.promotionId) return;
    await this.promotionService.releaseForBooking(booking.promotionId, manager, {
      bookingId: booking.id,
      discountAmount: booking.discount,
      reason,
    });
  }

  // ===== nội bộ: đọc dữ liệu =====

  async loadScheduleOrFail(scheduleId: string): Promise<DepartureSchedule> {
    const schedule = await this.scheduleRepo
      .createQueryBuilder('schedule')
      .innerJoinAndSelect('schedule.tour', 'tour')
      .where('schedule.id = :scheduleId', { scheduleId })
      .andWhere('tour.deletedAt IS NULL')
      .getOne();
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch khởi hành');
    return schedule;
  }
}
