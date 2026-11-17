import { BookingPricingService } from './booking-pricing.service.js';
import { DepartureSchedule } from '../../schedule/entities/departure-schedule.entity.js';
import { PassengerType, ScheduleStatus } from '../../../common/enums/index.js';
import type { ScheduleService } from '../../schedule/schedule.service.js';
import type { PromotionService } from '../../promotion/promotion.service.js';

function fixture(held = 0) {
  const schedules = { sumActiveHeldSeats: vi.fn().mockResolvedValue(held) };
  const promotions = { evaluateForBooking: vi.fn() };
  const pricing = new BookingPricingService(
    schedules as unknown as ScheduleService,
    promotions as unknown as PromotionService,
  );
  const schedule = Object.assign(new DepartureSchedule(), {
    id: 'schedule',
    tourId: 'tour',
    startDate: '2026-12-10',
    maxSeats: 3,
    soldSeats: 0,
    status: ScheduleStatus.OPEN,
    priceAdult: 2_000_000,
    priceChild: 1_000_000,
    priceInfant: 0,
  });
  return { pricing, schedule, promotions, schedules };
}

describe('Booking pricing boundaries', () => {
  it.each([
    ['2024-12-11', PassengerType.INFANT, 0, 0],
    ['2024-12-10', PassengerType.CHILD, 1_000_000, 1],
    ['2014-12-11', PassengerType.CHILD, 1_000_000, 1],
    ['2014-12-10', PassengerType.ADULT, 2_000_000, 1],
  ])(
    'prices DOB %s using age on departure, with the correct seat count',
    (dob, type, subtotal, seats) => {
      const { pricing, schedule } = fixture();
      const priced = pricing.pricePassengers(schedule, [
        { fullName: ' Passenger ', dob },
      ]);
      expect(priced.lines[0]).toMatchObject({
        fullName: 'Passenger',
        type,
        unitPrice: subtotal,
      });
      expect(priced.subtotal).toBe(subtotal);
      expect(pricing.countSeats(priced)).toBe(seats);
    },
  );

  it('groups tickets and applies the server promotion to the complete subtotal', async () => {
    const { pricing, schedule, promotions } = fixture();
    promotions.evaluateForBooking.mockResolvedValue({
      promotion: { code: 'SAVE5' },
      discount: 150_000,
    });
    const quote = await pricing.quote(
      schedule,
      [
        { fullName: 'Adult', dob: '1990-01-01' },
        { fullName: 'Child', dob: '2018-01-01' },
        { fullName: 'Infant', dob: '2025-01-01' },
      ],
      'SAVE5',
      'customer',
    );
    expect(promotions.evaluateForBooking).toHaveBeenCalledWith({
      code: 'SAVE5', subtotal: 3_000_000, scheduleId: 'schedule',
      customerId: 'customer', channel: 'ONLINE',
    });
    expect(quote).toMatchObject({
      subtotal: 3_000_000,
      discount: 150_000,
      total: 2_850_000,
      seatCount: 2,
      canBook: true,
    });
    expect(quote.lines.map((line) => line.type)).toEqual([
      PassengerType.ADULT,
      PassengerType.CHILD,
      PassengerType.INFANT,
    ]);
  });

  it('accounts for other held seats and clamps available seats at zero', async () => {
    const { pricing, schedule } = fixture(5);
    const quote = await pricing.quote(schedule, [
      { fullName: 'Adult', dob: '1990-01-01' },
    ]);
    expect(quote).toMatchObject({ availableSeats: 0, canBook: false });
  });
});
