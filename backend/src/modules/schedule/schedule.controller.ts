import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { Public } from '../../common/auth/public.decorator.js';
import { HoldSeatsDto } from './dto/schedule.dto.js';
import {
  CreateScheduleDto,
  QuerySchedulesDto,
  UpdateScheduleDto,
  UpdateScheduleStatusDto,
} from './dto/schedule.dto.js';
import { ScheduleService } from './schedule.service.js';

/**
 * Lịch khởi hành.
 *
 * - `GET /schedules/tour/:tourId` : công khai – khách xem lịch còn mở bán.
 * - CRUD : `schedule:read` / `schedule:write`.
 * - Giữ chỗ : khách đã đăng nhập (JWT), không cần quyền đặc biệt ngoài `booking:create`
 *   – quyền này đã được cấp sẵn cho role CUSTOMER.
 */
@ApiTags('schedules')
@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) { }

  @Public()
  @Get('tour/:tourId')
  @ApiOperation({ summary: 'Lịch còn mở bán của một tour (công khai)' })
  listOpenByTour(@Param('tourId', new ParseUUIDPipe()) tourId: string) {
    return this.scheduleService.listOpenByTour(tourId);
  }

  @ApiBearerAuth()
  @Get()
  @RequirePermissions('schedule:read')
  @ApiOperation({ summary: 'Danh sách lịch khởi hành có phân trang và lọc' })
  list(@Query() query: QuerySchedulesDto) {
    return this.scheduleService.paginate(query);
  }

  @ApiBearerAuth()
  @Get(':id')
  @RequirePermissions('schedule:read')
  @ApiOperation({ summary: 'Chi tiết lịch khởi hành kèm checkpoint và chỗ trống thực tế' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.scheduleService.getDetail(id);
  }

  @ApiBearerAuth()
  @Post()
  @RequirePermissions('schedule:write')
  @ApiOperation({ summary: 'Tạo lịch khởi hành (tour phải đã công bố)' })
  create(@Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(dto);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @RequirePermissions('schedule:write')
  @ApiOperation({ summary: 'Cập nhật lịch khởi hành' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateScheduleDto) {
    return this.scheduleService.update(id, dto);
  }

  @ApiBearerAuth()
  @Patch(':id/status')
  @RequirePermissions('schedule:write')
  @ApiOperation({ summary: 'Đổi trạng thái lịch (OPEN/FULL/CLOSED/…)' })
  updateStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateScheduleStatusDto) {
    return this.scheduleService.updateStatus(id, dto.status);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @RequirePermissions('schedule:write')
  @ApiOperation({ summary: 'Xóa lịch (chỉ khi chưa bán chỗ nào và không còn ai giữ chỗ)' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.scheduleService.remove(id);
    return { deleted: true };
  }

  // ===== giữ chỗ =====

  @ApiBearerAuth()
  @Post(':id/holds')
  @RequirePermissions('booking:create')
  @ApiOperation({ summary: 'Giữ chỗ tạm thời (15 phút) trước khi tạo booking' })
  hold(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: HoldSeatsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduleService.holdSeats(id, user.id, dto.seats);
  }

  @ApiBearerAuth()
  @Delete('holds/:holdId')
  @RequirePermissions('booking:create')
  @ApiOperation({ summary: 'Nhả chỗ đã giữ (khách hủy ở bước thanh toán)' })
  release(@Param('holdId', new ParseUUIDPipe()) holdId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.scheduleService.releaseHold(holdId, user.id);
  }
}
