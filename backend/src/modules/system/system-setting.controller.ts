import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { UpsertSystemSettingDto } from './dto/system.dto.js';
import { SystemSettingService } from './system-setting.service.js';

/**
 * Cấu hình động của hệ thống (key/value JSON).
 *
 * Toàn bộ endpoint yêu cầu `system:setting` (ADMIN).
 */
@ApiTags('system-settings')
@ApiBearerAuth()
@Controller('system/settings')
export class SystemSettingController {
  constructor(private readonly systemSettingService: SystemSettingService) { }

  @Get()
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Danh sách cấu hình hệ thống' })
  list() {
    return this.systemSettingService.list();
  }

  @Get(':key')
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Chi tiết một cấu hình theo key' })
  detail(@Param('key') key: string) {
    return this.systemSettingService.get(key);
  }

  @Put()
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Tạo mới hoặc cập nhật cấu hình theo key' })
  upsert(@Body() dto: UpsertSystemSettingDto) {
    return this.systemSettingService.upsert(dto);
  }

  @Delete(':key')
  @RequirePermissions('system:setting')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa cấu hình theo key' })
  async remove(@Param('key') key: string) {
    await this.systemSettingService.remove(key);
  }
}