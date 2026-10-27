import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { AuditLogService } from './audit-log.service.js';
import { QueryAuditLogsDto } from './dto/system.dto.js';

/**
 * Nhật ký thao tác quản trị (chỉ đọc).
 *
 * Yêu cầu `system:setting` (ADMIN) – dữ liệu kiểm toán nhạy cảm.
 */
@ApiTags('system-audit-logs')
@ApiBearerAuth()
@Controller('system/audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) { }

  @Get()
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Danh sách nhật ký thao tác (phân trang + lọc)' })
  list(@Query() query: QueryAuditLogsDto) {
    return this.auditLogService.paginate(query);
  }
}