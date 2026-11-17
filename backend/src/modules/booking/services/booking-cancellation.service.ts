import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../../common/auth/auth.types.js';
import {
  BookingStatus,
  CancelRequestStatus,
} from '../../../common/enums/index.js';
import { todayInVietnam } from '../../../common/time/vietnam-date.js';
import { CancelPolicyService } from '../../catalog/services/cancel-policy.service.js';
import { TourService } from '../../catalog/services/tour.service.js';
import type { ProcessCancelDto, RequestCancelDto } from '../dto/booking.dto.js';
import { Booking } from '../entities/booking.entity.js';
import {
  CancelRequest,
  type PolicySnapshot,
} from '../entities/cancel-request.entity.js';
import { BookingReservationsService } from './booking-reservations.service.js';

/** Policy snapshots and cancellation state changes; authorization/events remain in the facade. */
@Injectable()
export class BookingCancellationService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(CancelRequest)
    private readonly cancelRepo: Repository<CancelRequest>,
    private readonly cancelPolicyService: CancelPolicyService,
    private readonly tourService: TourService,
    private readonly reservations: BookingReservationsService,
  ) {}
  async request(
    booking: Booking,
    actor: AuthenticatedUser,
    dto: RequestCancelDto,
  ): Promise<Booking> {
    const id = booking.id;
    if (booking.status === BookingStatus.CANCEL_REQUESTED) {
      throw new ConflictException('Booking đã có yêu cầu hủy đang chờ xử lý');
    }

    const openRequest = await this.cancelRepo.findOne({
      where: { bookingId: id, status: CancelRequestStatus.PENDING },
    });
    if (openRequest)
      throw new ConflictException('Booking đã có yêu cầu hủy đang chờ xử lý');

    const schedule =
      booking.schedule ??
      (await this.reservations.loadScheduleOrFail(booking.scheduleId));
    const startDate = schedule.startDate;

    // Không cho hủy sau khi tour đã khởi hành.
    if (startDate < todayInVietnam()) {
      throw new ConflictException(
        'Tour đã khởi hành – không thể gửi yêu cầu hủy',
      );
    }

    const quote = await this.cancelPolicyService.quoteFee(
      await this.resolveCancelPolicyId(schedule.tourId),
      booking.total,
      startDate,
    );

    const changed = await this.bookingRepo.manager.transaction(
      async (manager) => {
        const locked = await this.reservations.lockBooking(manager, id);
        locked.requestCancel();

        const snapshot: PolicySnapshot = {
          policyId: quote.policyId,
          policyName: quote.policyName,
          rules: quote.rules.map((rule) => ({
            daysBefore: rule.daysBefore,
            feePercent: rule.feePercent,
          })),
          startDate: quote.startDate,
        };

        const request = manager.create(CancelRequest, {
          bookingId: locked.id,
          requestedBy: actor.id,
          reason: dto.reason.trim(),
          status: CancelRequestStatus.PENDING,
          // `fee_percent` là `tinyint` nên entity `calculateFee` đã trả số nguyên.
          feePercent: quote.feePercent,
          feeAmount: quote.fee,
          refundAmount: quote.refund,
          policySnapshot: snapshot,
        });

        await manager.save(Booking, locked);
        await manager.save(CancelRequest, request);
        return locked;
      },
    );

    return changed;
  }
  /**
   * Nhân viên xử lý yêu cầu hủy.
   *
   * `approve = true` → booking `CANCELLED`, tiền phí/hoàn lấy từ bản ghi
   * `cancel_requests` (không tính lại, tránh lệch với con số đã báo khách).
   * `approve = false` → `rejectCancel()`, booking về trạng thái cũ.
   */
  async processCancel(
    id: string,
    actor: AuthenticatedUser,
    dto: ProcessCancelDto,
  ): Promise<void> {
    if (!dto.approve && !dto.rejectReason?.trim()) {
      throw new BadRequestException('Từ chối yêu cầu hủy phải nêu lý do');
    }

    await this.bookingRepo.manager.transaction(async (manager) => {
      const booking = await this.reservations.lockBooking(manager, id);
      const request = await manager.getRepository(CancelRequest).findOne({
        where: { bookingId: id, status: CancelRequestStatus.PENDING },
        order: { createdAt: 'DESC' },
      });
      if (!request)
        throw new NotFoundException('Không có yêu cầu hủy nào đang chờ xử lý');

      request.processedBy = actor.id;
      request.processedAt = new Date();

      if (dto.approve) {
        request.status = CancelRequestStatus.APPROVED;
        booking.transitionTo(BookingStatus.CANCELLED);
        booking.statusBeforeCancel = null;
        booking.expiresAt = null;
        await this.reservations.releaseSeats(manager, booking);
        await this.reservations.releasePromotion(manager, booking);
      } else {
        request.status = CancelRequestStatus.REJECTED;
        request.rejectReason = dto.rejectReason!.trim();
        booking.rejectCancel();
      }

      await manager.save(CancelRequest, request);
      await manager.save(Booking, booking);
    });
  }
  /** Chính sách hủy gắn với tour của lịch. */
  private async resolveCancelPolicyId(tourId: string): Promise<string> {
    const tour = await this.tourService.getOrFail(tourId);
    return tour.cancelPolicyId;
  }
}
