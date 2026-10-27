import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { OperationsService } from './operations.service.js';

/** Bảng điều khiển vận hành theo lịch khởi hành (gộp phân công + điểm danh + sự cố). */
@ApiTags('operations')
@ApiBearerAuth()
@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) { }

  @Get('schedules/:scheduleId/overview')
  @RequirePermissions('guide:assign')
  @ApiOperation({
    summary: 'Tổng hợp vận hành của một lịch khởi hành',
    description: 'HDV được phân công, checkpoint, thống kê điểm danh, danh sách sự cố và tổng chi phí phát sinh.',
  })
  overview(
    @Param('scheduleId', new ParseUUIDPipe()) scheduleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operationsService.scheduleOverview(scheduleId, user);
  }
}
