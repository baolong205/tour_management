import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { AttendanceService } from './attendance.service.js';
import { MarkAttendanceDto } from './dto/operations.dto.js';

/**
 * Điểm danh hành khách tại checkpoint.
 *
 * Quyền `guide:attend` chỉ mở cửa endpoint; phạm vi dữ liệu do service giới hạn:
 * HDV chỉ thao tác trên lịch mình đang được phân công, nhân viên có `guide:assign`
 * thao tác mọi lịch.
 */
@ApiTags('operations-attendance')
@ApiBearerAuth()
@Controller('operations/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) { }

  @Get('checkpoints/:checkpointId')
  @RequirePermissions('guide:attend')
  @ApiOperation({
    summary: 'Bảng điểm danh của checkpoint (kèm thống kê có mặt/vắng/muộn/chưa điểm danh)',
  })
  board(
    @Param('checkpointId', new ParseUUIDPipe()) checkpointId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.getBoard(checkpointId, user);
  }

  @Put('checkpoints/:checkpointId')
  @RequirePermissions('guide:attend')
  @ApiOperation({
    summary: 'Điểm danh hàng loạt (upsert theo cặp checkpoint + hành khách)',
    description: 'Gửi lại cùng hành khách sẽ cập nhật trạng thái, không sinh bản ghi trùng.',
  })
  mark(
    @Param('checkpointId', new ParseUUIDPipe()) checkpointId: string,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.mark(checkpointId, dto, user);
  }

  @Patch('checkpoints/:checkpointId')
  @RequirePermissions('guide:attend')
  @ApiOperation({ summary: 'Alias của PUT – dùng khi client chỉ hỗ trợ PATCH' })
  patch(
    @Param('checkpointId', new ParseUUIDPipe()) checkpointId: string,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.mark(checkpointId, dto, user);
  }

  @Get('schedules/:scheduleId/summary')
  @RequirePermissions('guide:attend')
  @ApiOperation({ summary: 'Tổng hợp điểm danh của cả lịch (gộp mọi checkpoint)' })
  summary(@Param('scheduleId', new ParseUUIDPipe()) scheduleId: string) {
    return this.attendanceService.summarizeSchedule(scheduleId);
  }
}
