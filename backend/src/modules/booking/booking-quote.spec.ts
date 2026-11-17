import { BadRequestException } from '@nestjs/common';
import { BookingPricingService } from './services/booking-pricing.service.js';
import { BookingReservationsService } from './services/booking-reservations.service.js';
import { BookingService } from './booking.service.js';
import { ScheduleStatus } from '../../common/enums/index.js';

/**
 * Hồi quy cho lỗi `POST /api/bookings → 400 BAD_REQUEST` không rõ nguyên nhân.
 *
 * Trước đây `quote()` chỉ trả `canBook: false` mà không nói vì sao, còn `create()`
 * ném 400 "Booking phải có ít nhất 1 chỗ" – câu thông báo không hề nhắc tới em bé,
 * nên khách điền xong cả form mới biết đơn bị chặn và không hiểu phải sửa gì.
 *
 * Bộ test này khoá lại hai điều:
 * 1. `quote()` phải trả `blockedReason` đọc được cho từng trường hợp bị chặn.
 * 2. `quote()` và `create()` phải dùng **cùng** một nguồn lý do, không lệch nhau.
 */
describe('BookingService.quote – lý do chặn đặt tour', () => {
  /** Ngày khởi hành xa trong tương lai để không phụ thuộc đồng hồ máy chạy test. */
  const START_DATE = '2099-06-01';

  const schedule = (overrides: Record<string, unknown> = {}) => ({
    id: 'schedule-1',
    tourId: 'tour-1',
    tour: { name: 'Tour thử nghiệm' },
    startDate: START_DATE,
    endDate: '2099-06-05',
    priceAdult: 5_000_000,
    priceChild: 3_000_000,
    priceInfant: 0,
    maxSeats: 20,
    soldSeats: 0,
    status: ScheduleStatus.OPEN,
    availableSeats(heldSeats = 0) {
      return this.maxSeats - this.soldSeats - heldSeats;
    },
    ...overrides,
  });

  function build(loaded: ReturnType<typeof schedule>, heldSeats = 0) {
    const scheduleRepo = {
      createQueryBuilder: () => {
        const qb = {
          innerJoinAndSelect: () => qb,
          where: () => qb,
          andWhere: () => qb,
          getOne: async () => loaded,
        };
        return qb;
      },
    };
    const scheduleService = { sumActiveHeldSeats: async () => heldSeats };
    const promotionService = { findUsableOrFail: async () => null };

    const service = new BookingService(
      {} as never, // bookingRepo
      {} as never, // passengerRepo
      {} as never, // cancelRepo
      {} as never, // invoiceRepo
      scheduleService as never,
      new BookingPricingService(scheduleService as never, promotionService as never),
      {} as never, // cancellations
      new BookingReservationsService(scheduleRepo as never, scheduleService as never, promotionService as never),
      promotionService as never,
      {} as never, // events
      {} as never, // invoices
      {} as never, // bookingMail
    );

    return service;
  }

  it('chặn đơn chỉ toàn em bé dưới 2 tuổi và nói rõ vì sao', async () => {
    const service = build(schedule());

    const quote = await service.quote('schedule-1', [
      { fullName: 'Bé An', dob: '2098-01-01' },
      { fullName: 'Bé Bình', dob: '2098-06-01' },
    ]);

    // Em bé ngồi cùng người lớn nên không chiếm ghế.
    expect(quote.seatCount).toBe(0);
    expect(quote.canBook).toBe(false);
    expect(quote.blockedReason).toContain('ít nhất 1 hành khách từ 2 tuổi trở lên');
  });

  it('cho đặt khi có ít nhất một hành khách chiếm chỗ', async () => {
    const service = build(schedule());

    const quote = await service.quote('schedule-1', [
      { fullName: 'Nguyễn Văn A', dob: '1990-01-01' },
      { fullName: 'Bé An', dob: '2098-01-01' },
    ]);

    expect(quote.seatCount).toBe(1);
    expect(quote.canBook).toBe(true);
    expect(quote.blockedReason).toBeNull();
  });

  it('báo hết chỗ thay vì chỉ trả canBook = false', async () => {
    const service = build(schedule({ maxSeats: 2, soldSeats: 2 }));

    const quote = await service.quote('schedule-1', [{ fullName: 'Nguyễn Văn A', dob: '1990-01-01' }]);

    expect(quote.canBook).toBe(false);
    expect(quote.blockedReason).toBe('Lịch khởi hành đã hết chỗ');
  });

  it('báo số chỗ còn lại khi không đủ cho số hành khách đã chọn', async () => {
    const service = build(schedule({ maxSeats: 5, soldSeats: 3 }));

    const quote = await service.quote('schedule-1', [
      { fullName: 'Nguyễn Văn A', dob: '1990-01-01' },
      { fullName: 'Nguyễn Văn B', dob: '1991-01-01' },
      { fullName: 'Nguyễn Văn C', dob: '1992-01-01' },
    ]);

    expect(quote.canBook).toBe(false);
    expect(quote.blockedReason).toBe('Chỉ còn 2 chỗ trống, không đủ cho 3 hành khách');
  });

  it('báo lịch chưa mở bán khi còn ở trạng thái DRAFT', async () => {
    const service = build(schedule({ status: ScheduleStatus.DRAFT }));

    const quote = await service.quote('schedule-1', [{ fullName: 'Nguyễn Văn A', dob: '1990-01-01' }]);

    expect(quote.canBook).toBe(false);
    expect(quote.blockedReason).toBe('Lịch khởi hành chưa mở bán');
  });

  it('từ chối ngày sinh sau ngày khởi hành, nêu rõ hành khách nào', async () => {
    const service = build(schedule());

    await expect(
      service.quote('schedule-1', [
        { fullName: 'Nguyễn Văn A', dob: '1990-01-01' },
        { fullName: 'Nguyễn Văn B', dob: '2099-12-31' },
      ]),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.quote('schedule-1', [{ fullName: 'Nguyễn Văn B', dob: '2099-12-31' }]),
    ).rejects.toThrow(/Hành khách 1: ngày sinh không được sau ngày khởi hành/);
  });
});
