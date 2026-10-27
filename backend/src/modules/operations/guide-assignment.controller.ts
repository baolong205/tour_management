import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { CreateAssignmentDto, QueryAssignmentsDto, RevokeAssignmentDto } from './dto/operations.dto.js';
import { GuideAssignmentService } from './guide-assignment.service.js';

/**
 * Phân công hướng dẫn viên.
 *
 * - `GET /operations/assignments/me` : HDV xem tour mình đang nhận (mọi tài khoản đã đăng nhập,
 *   service kiểm tra hồ sơ HDV).
 * - Còn lại : `guide:assign` (điều phối/ADMIN).
 */
@ApiTags('operations-assignments')
@ApiBearerAuth()
@Controller('operations/assignments')
export class GuideAssignmentController {
  constructor(private readonly assignmentService: GuideAssignmentService) { }

  @Get('me')
  @ApiOperation({ summary: 'Phân công đang hiệu lực của tôi (HDV)' })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.assignmentService.listMine(user);
  }

  @Get()
  @RequirePermissions('guide:assign')
  @ApiOperation({ summary: 'Danh sách phân công HDV (phân trang + lọc)' })
  list(@Query() query: QueryAssignmentsDto) {
    return this.assignmentService.paginate(query);
  }

  @Get('schedule/:scheduleId')
  @RequirePermissions('guide:assign')
  @ApiOperation({ summary: 'Toàn bộ phân công của một lịch khởi hành' })
  listBySchedule(@Param('scheduleId', new ParseUUIDPipe()) scheduleId: string) {
    return this.assignmentService.listBySchedule(scheduleId);
  }

  @Post()
  @RequirePermissions('guide:assign')
  @ApiOperation({
    summary: 'Phân công HDV cho lịch (chặn trùng lịch)',
    description:
      'Mặc định phân công theo đúng khoảng ngày của lịch. Nếu HDV đã có phân công ACTIVE giao khoảng thời gian này → 409.',
  })
  create(@Body() dto: CreateAssignmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assignmentService.create(dto, user);
  }

  @Patch(':id/revoke')
  @RequirePermissions('guide:assign')
  @ApiOperation({ summary: 'Thu hồi phân công (giữ bản ghi, đổi status = REVOKED)' })
  revoke(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RevokeAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assignmentService.revoke(id, dto.reason, user);
  }
}
