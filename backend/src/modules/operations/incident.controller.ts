import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { CreateIncidentDto, QueryIncidentsDto, UpdateIncidentDto } from './dto/operations.dto.js';
import { IncidentService } from './incident.service.js';

/**
 * Sự cố trong chuyến + chi phí phát sinh.
 *
 * Không có endpoint xóa: sự cố là chứng từ đối soát chi phí tour, chỉ được sửa.
 */
@ApiTags('operations-incidents')
@ApiBearerAuth()
@Controller('operations/incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) { }

  @Get()
  @RequirePermissions('incident:manage')
  @ApiOperation({ summary: 'Danh sách sự cố (phân trang, lọc theo lịch)' })
  list(@Query() query: QueryIncidentsDto) {
    return this.incidentService.paginate(query);
  }

  @Get('schedule/:scheduleId')
  @RequirePermissions('incident:manage')
  @ApiOperation({ summary: 'Sự cố của một lịch + tổng chi phí phát sinh' })
  listBySchedule(@Param('scheduleId', new ParseUUIDPipe()) scheduleId: string) {
    return this.incidentService.listBySchedule(scheduleId);
  }

  @Get(':id')
  @RequirePermissions('incident:manage')
  @ApiOperation({ summary: 'Chi tiết sự cố' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.incidentService.getById(id);
  }

  @Post()
  @RequirePermissions('incident:manage')
  @ApiOperation({
    summary: 'Ghi nhận sự cố',
    description: 'Chỉ HDV được phân công cho lịch (hoặc nhân viên có `guide:assign`) mới ghi được.',
  })
  create(@Body() dto: CreateIncidentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.incidentService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('incident:manage')
  @ApiOperation({ summary: 'Cập nhật nội dung / chi phí phát sinh của sự cố' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidentService.update(id, dto, user);
  }
}
