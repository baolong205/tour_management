import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { Tour } from '../catalog/entities/tour.entity.js';
import { Payment } from '../payment/entities/payment.entity.js';
import { Refund } from '../payment/entities/refund.entity.js';

export class ReportQueryDto {
  @IsOptional() @IsDateString() fromDate?: string;
  @IsOptional() @IsDateString() toDate?: string;
  @IsOptional() @IsIn(['day', 'month', 'year']) groupBy?: 'day' | 'month' | 'year';
}

@Controller('reports')
@RequirePermissions('report:read')
export class ReportController {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(Tour) private readonly tours: Repository<Tour>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
  ) {}

  @Get('overview')
  async overview(@Query() query: ReportQueryDto) {
    const format = { day: '%Y-%m-%d', month: '%Y-%m', year: '%Y' }[query.groupBy ?? 'month'];
    const paid = this.payments.createQueryBuilder('payment')
      .select(`DATE_FORMAT(payment.paidAt, '${format}')`, 'period')
      .addSelect('SUM(payment.amount)', 'received')
      .addSelect('COUNT(*)', 'transactions')
      .where('payment.paidAt IS NOT NULL');
    const refunded = this.refunds.createQueryBuilder('refund')
      .select(`DATE_FORMAT(refund.refundedAt, '${format}')`, 'period')
      .addSelect('SUM(refund.amount)', 'refunded')
      .where('refund.status = :status', { status: 'REFUNDED' });
    if (query.fromDate) {
      paid.andWhere('DATE(payment.paidAt) >= :from', { from: query.fromDate.slice(0, 10) });
      refunded.andWhere('DATE(refund.refundedAt) >= :from', { from: query.fromDate.slice(0, 10) });
    }
    if (query.toDate) {
      paid.andWhere('DATE(payment.paidAt) <= :to', { to: query.toDate.slice(0, 10) });
      refunded.andWhere('DATE(refund.refundedAt) <= :to', { to: query.toDate.slice(0, 10) });
    }
    const [tourCount, bookingCount, pendingBookings, receipts, returns] = await Promise.all([
      this.tours.count(), this.bookings.count(), this.bookings.count({ where: { status: 'PENDING_CONFIRMATION' as Booking['status'] } }),
      paid.groupBy('period').orderBy('period', 'ASC').getRawMany(),
      refunded.groupBy('period').orderBy('period', 'ASC').getRawMany(),
    ]);
    const periods = new Map<string, { period: string; received: number; refunded: number; net: number; transactions: number }>();
    for (const row of receipts) periods.set(row.period, { period: row.period, received: Number(row.received), refunded: 0, net: Number(row.received), transactions: Number(row.transactions) });
    for (const row of returns) {
      const value = periods.get(row.period) ?? { period: row.period, received: 0, refunded: 0, net: 0, transactions: 0 };
      value.refunded = Number(row.refunded);
      value.net = value.received - value.refunded;
      periods.set(row.period, value);
    }
    const items = [...periods.values()].sort((a, b) => a.period.localeCompare(b.period));
    return { tourCount, bookingCount, pendingBookings, received: items.reduce((sum, row) => sum + row.received, 0), refunded: items.reduce((sum, row) => sum + row.refunded, 0), net: items.reduce((sum, row) => sum + row.net, 0), items };
  }
}