import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { BookingService } from './booking.service.js';
import {
  ConfirmBookingDto,
  CreateBookingDto,
  CreateCounterBookingDto,
  ProcessCancelDto,
  QueryBookingsDto,
  QuoteBookingDto,
  RejectBookingDto,
  RequestCancelDto,
} from './dto/booking.dto.js';

/**
 * Đặt tour.
 *
 * - Khách (`booking:create`): xem booking của mình, tự đặt, tự gửi yêu cầu hủy.
 * - Nhân viên (`booking:read` / `booking:confirm` / `booking:cancel`): xem tất cả,
 *   tạo booking tại quầy, xác nhận, từ chối, xử lý yêu cầu hủy.
 *
 * Lưu ý: mọi endpoint đều yêu cầu đăng nhập vì booking luôn gắn `customer_id`.
 */
@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) { }

  // ===== khách =====

  @Get('me')
  @ApiOperation({ summary: 'Booking của chính tôi' })
  listMine(@Query() query: QueryBookingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.listMine(query, user);
  }

  @Post()
  @RequirePermissions('booking:create')
  @ApiOperation({
    summary: 'Đặt tour (tự giữ chỗ + tạo booking trong một transaction)',
    description:
      'Client chỉ gửi họ tên và ngày sinh hành khách; loại vé và giá do server tự suy ra từ lịch khởi hành.',
  })
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.create(dto, user);
  }

  @Post('quote')
  @RequirePermissions('booking:create')
  @ApiOperation({
    summary: 'Báo giá trước khi đặt (cùng thuật toán với lúc tạo booking)',
    description: 'Dùng chung ràng buộc với `POST /bookings`: thiếu/sai `passengers` trả 400 thay vì 500.',
  })
  quote(@Body() dto: QuoteBookingDto) {
    return this.bookingService.quote(dto.scheduleId, dto.passengers, dto.promotionCode);
  }

  // ===== nhân viên =====

  @Get()
  @RequirePermissions('booking:read')
  @ApiOperation({ summary: 'Danh sách booking (nhân viên) có phân trang và lọc' })
  list(@Query() query: QueryBookingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.paginate(query, user);
  }

  @Post('counter')
  @RequirePermissions('booking:create')
  @ApiOperation({ summary: 'Nhân viên tạo booking tại quầy (có thể chỉ định khách hàng)' })
  createAtCounter(@Body() dto: CreateCounterBookingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.createAtCounter(dto, user);
  }

  @Get('code/:code')
  @RequirePermissions('booking:read')
  @ApiOperation({ summary: 'Tra booking theo mã hiển thị (vd BK260001)' })
  getByCode(@Param('code') code: string) {
    return this.bookingService.getByCode(code);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Chi tiết booking',
    description: 'Khách chỉ xem được booking của mình; nhân viên có `booking:read` xem được tất cả.',
  })
  detail(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.getDetail(id, user);
  }

  @Patch(':id/confirm')
  @RequirePermissions('booking:confirm')
  @ApiOperation({
    summary: 'Xác nhận booking',
    description: 'Chuyển sang CONFIRMED, tăng `sold_seats` của lịch và nhả chỗ đang giữ. Idempotent.',
  })
  confirm(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConfirmBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingService.confirm(id, user, dto);
  }

  @Patch(':id/reject')
  @RequirePermissions('booking:confirm')
  @ApiOperation({ summary: 'Từ chối booking và nhả chỗ' })
  reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingService.reject(id, user, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions('booking:cancel')
  @ApiOperation({ summary: 'Nhân viên hủy booking trực tiếp (không qua yêu cầu của khách)' })
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RequestCancelDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingService.cancel(id, user, dto.reason);
  }

  // ===== yêu cầu hủy =====

  @Post(':id/cancel-request')
  @ApiOperation({
    summary: 'Khách gửi yêu cầu hủy',
    description: 'Phí hủy được tính và chụp lại vào `policy_snapshot` ngay tại thời điểm gửi.',
  })
  requestCancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RequestCancelDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingService.requestCancel(id, user, dto);
  }

  @Patch(':id/cancel-request/process')
  @RequirePermissions('booking:cancel')
  @ApiOperation({ summary: 'Duyệt / từ chối yêu cầu hủy (tiền lấy theo snapshot đã chụp)' })
  processCancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ProcessCancelDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingService.processCancel(id, user, dto);
  }

  // ===== hóa đơn =====

  @Post(':id/invoice')
  @RequirePermissions('booking:confirm')
  @ApiOperation({ summary: 'Xuất hóa đơn cho booking đã xác nhận (idempotent)' })
  issueInvoice(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.issueInvoice(id, user);
  }

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Xem hóa đơn của booking' })
  getInvoice(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.getInvoice(id, user);
  }
}
