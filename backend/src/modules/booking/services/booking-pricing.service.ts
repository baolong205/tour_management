import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingChannel, PassengerType, ScheduleStatus } from '../../../common/enums/index.js';
import { PromotionService } from '../../promotion/promotion.service.js';
import { ScheduleService } from '../../schedule/schedule.service.js';
import type { DepartureSchedule } from '../../schedule/entities/departure-schedule.entity.js';
import type { PassengerInputDto } from '../dto/booking.dto.js';
import type { BookingQuote } from '../types/booking.types.js';

import { todayInVietnam } from '../../../common/time/vietnam-date.js';

const INFANT_MAX_AGE = 2;
const CHILD_MAX_AGE = 12;

/** Shared by preview and creation: age classification, ticket totals and promotion quotes. */
@Injectable()
export class BookingPricingService {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly promotionService: PromotionService,
  ) {}
  /** Báo giá trước khi đặt – cho FE thấy đúng số tiền server sẽ thu. */
  async quote(
    schedule: DepartureSchedule,
    passengers: PassengerInputDto[],
    promotionCode?: string,
    customerId?: string,
    channel: BookingChannel = BookingChannel.ONLINE,
  ): Promise<BookingQuote> {
    const scheduleId = schedule.id;
    const priced = this.pricePassengers(schedule, passengers);
    const seatCount = this.countSeats(priced);

    /**
     * Báo giá dùng **cùng engine** với lúc tạo đơn: nhờ vậy con số khách thấy ở
     * bước xem trước bằng đúng con số server ghi vào `bookings.discount`, kể cả
     * khi mã bị giới hạn theo tour/danh mục/điểm đến/kênh bán/ngân sách.
     */
    const evaluated = promotionCode && customerId
      ? await this.promotionService.evaluateForBooking({
        code: promotionCode,
        subtotal: priced.subtotal,
        scheduleId: schedule.id,
        customerId,
        channel,
      })
      : null;
    const promotion = evaluated?.promotion ?? null;
    const discount = evaluated?.discount ?? 0;

    const held = await this.scheduleService.sumActiveHeldSeats(scheduleId);
    const blockedReason = this.blockedReasonFor(schedule, seatCount, held);
    return {
      scheduleId,
      tourId: schedule.tourId,
      tourName: schedule.tour?.name ?? '',
      startDate: schedule.startDate,
      lines: this.groupLines(priced),
      seatCount,
      subtotal: priced.subtotal,
      discount,
      total: priced.subtotal - discount,
      promotionCode: promotion?.code ?? null,
      availableSeats: Math.max(schedule.availableSeats(held), 0),
      canBook: blockedReason === null,
      blockedReason,
    };
  }
  blockedReasonFor(
    schedule: DepartureSchedule,
    seatCount: number,
    heldSeats: number,
    options: { skipCapacity?: boolean } = {},
  ): string | null {
    if (schedule.status === ScheduleStatus.DRAFT) return 'Lịch khởi hành chưa mở bán';
    if (schedule.status !== ScheduleStatus.OPEN) {
      return `Lịch khởi hành đang ở trạng thái ${schedule.status} – không thể đặt`;
    }
    if (schedule.startDate < todayInVietnam()) return 'Ngày khởi hành đã qua';
    /**
     * Em bé dưới 2 tuổi ngồi cùng người lớn nên không chiếm ghế. Đơn chỉ toàn em bé
     * sẽ có `seatCount = 0` và bị chặn ở đây – trước đây lỗi này chỉ lộ ra ở
     * `create()` dưới dạng 400 "Booking phải có ít nhất 1 chỗ", sau khi khách đã
     * điền xong toàn bộ form.
     */
    if (seatCount < 1) {
      return 'Đơn cần ít nhất 1 hành khách từ 2 tuổi trở lên (em bé dưới 2 tuổi không chiếm chỗ)';
    }
    // Client đã giữ chỗ: chỗ của hold đã bị trừ khỏi `availableSeats` nên bỏ qua bước này.
    if (options.skipCapacity) return null;

    const available = Math.max(schedule.availableSeats(heldSeats), 0);
    if (available < seatCount) {
      return available === 0
        ? 'Lịch khởi hành đã hết chỗ'
        : `Chỉ còn ${available} chỗ trống, không đủ cho ${seatCount} hành khách`;
    }
    return null;
  }

  // ===== nội bộ: tính giá (server là nguồn sự thật) =====

  /**
   * Suy loại hành khách từ `dob` và lấy giá tương ứng **từ lịch khởi hành**.
   *
   * Client chỉ gửi `fullName` + `dob`, mọi con số tiền đều do server quyết định –
   * đây là chốt chặn gian lận của luồng đặt tour.
   */
  pricePassengers(schedule: DepartureSchedule, passengers: PassengerInputDto[]) {
    const startDate = schedule.startDate;
    const lines = passengers.map((passenger, index) => {
      const dob = this.normalizeDate(passenger.dob);
      /**
       * Ngày sinh phải có thật và không được sau ngày khởi hành.
       *
       * `@IsDateString()` chỉ kiểm định dạng, nên `2030-01-01` vẫn lọt qua và
       * `ageAt()` cho ra tuổi âm ⇒ hành khách bị xếp nhầm thành em bé, đơn có
       * `seatCount = 0` và bị chặn bằng một thông báo chẳng liên quan gì tới
       * ngày sinh khách vừa nhập.
       */
      if (Number.isNaN(Date.parse(dob))) {
        throw new BadRequestException(`Hành khách ${index + 1}: ngày sinh không hợp lệ`);
      }
      if (dob > startDate.slice(0, 10)) {
        throw new BadRequestException(
          `Hành khách ${index + 1}: ngày sinh không được sau ngày khởi hành (${startDate.slice(0, 10)})`,
        );
      }
      const age = this.ageAt(dob, startDate);
      const type = this.classify(age);
      const unitPrice = this.priceFor(schedule, type);

      return {
        fullName: passenger.fullName.trim(),
        dob,
        gender: passenger.gender?.trim() || null,
        idNumber: passenger.idNumber?.trim() || null,
        type,
        unitPrice,
        age,
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice, 0);
    return { lines, subtotal };
  }

  private classify(age: number): PassengerType {
    if (age < INFANT_MAX_AGE) return PassengerType.INFANT;
    if (age < CHILD_MAX_AGE) return PassengerType.CHILD;
    return PassengerType.ADULT;
  }

  private priceFor(schedule: DepartureSchedule, type: PassengerType): number {
    switch (type) {
      case PassengerType.INFANT:
        return Number(schedule.priceInfant ?? 0);
      case PassengerType.CHILD:
        return Number(schedule.priceChild ?? 0);
      default:
        return Number(schedule.priceAdult ?? 0);
    }
  }

  /** Em bé không chiếm ghế riêng. */
  countSeats(priced: { lines: { type: PassengerType }[] }): number {
    return priced.lines.filter((line) => line.type !== PassengerType.INFANT)
      .length;
  }

  private groupLines(priced: {
    lines: { type: PassengerType; unitPrice: number }[];
  }) {
    const order: PassengerType[] = [
      PassengerType.ADULT,
      PassengerType.CHILD,
      PassengerType.INFANT,
    ];
    const grouped = new Map<
      PassengerType,
      { quantity: number; unitPrice: number }
    >();

    for (const line of priced.lines) {
      const current = grouped.get(line.type);
      if (current) current.quantity += 1;
      else grouped.set(line.type, { quantity: 1, unitPrice: line.unitPrice });
    }

    return order
      .filter((type) => grouped.has(type))
      .map((type) => {
        const item = grouped.get(type)!;
        return {
          type,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
        };
      });
  }

  /** Tuổi tại ngày khởi hành – tính trên chuỗi `YYYY-MM-DD` để không lệch múi giờ. */
  private ageAt(dob: string, atDate: string): number {
    const [dy, dm, dd] = dob.split('-').map(Number);
    const [ay, am, ad] = atDate.slice(0, 10).split('-').map(Number);

    let age = ay - dy;
    if (am < dm || (am === dm && ad < dd)) age -= 1;
    return age;
  }

  private normalizeDate(value: string): string {
    return value.slice(0, 10);
  }
}
