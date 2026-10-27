import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import {
  CreateResourceAssignmentDto,
  QueryResourceAssignmentsDto,
  UpdateResourceAssignmentDto,
} from './dto/supplier.dto.js';
import { ResourceAssignmentService } from './resource-assignment.service.js';

/**
 * Phân bổ nguồn lực cho lịch khởi hành.
 *
 * Yêu cầu `supplier:manage` – dữ liệu chi phí nội bộ.
 */
@ApiTags('suppliers-resources')
@ApiBearerAuth()
@Controller('suppliers/resources')
export class ResourceAssignmentController {
  constructor(private readonly resourceAssignmentService: ResourceAssignmentService) { }

  @Get()
  @RequirePermissions('supplier:manage')
  @ApiOperation({ summary: 'Danh sách phân bổ nguồn lực (phân trang + lọc)' })
  list(@Query() query: QueryResourceAssignmentsDto) {
    return this.resourceAssignmentService.paginate(query);
  }

  @Get('schedule/:scheduleId')
  @RequirePermissions('supplier:manage')
  @ApiOperation({ summary: 'Phân bổ nguồn lực của một lịch + tổng chi phí' })
  listBySchedule(@Param('scheduleId', new ParseUUIDPipe()) scheduleId: string) {
    return this.resourceAssignmentService.listBySchedule(scheduleId);
  }

  @Get(':id')
  @RequirePermissions('supplier:manage')
  @ApiOperation({ summary: 'Chi tiết phân bổ nguồn lực' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.resourceAssignmentService.getById(id);
  }

  @Post()
  @RequirePermissions('supplier:manage')
  @ApiOperation({ summary: 'Phân bổ nguồn lực cho lịch' })
  create(@Body() dto: CreateResourceAssignmentDto) {
    return this.resourceAssignmentService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('supplier:manage')
  @ApiOperation({ summary: 'Cập nhật phân bổ nguồn lực' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateResourceAssignmentDto) {
    return this.resourceAssignmentService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('supplier:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa phân bổ nguồn lực' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.resourceAssignmentService.remove(id);
  }
}