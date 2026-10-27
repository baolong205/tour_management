import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import {
  CreateEmailTemplateDto,
  QueryEmailTemplatesDto,
  UpdateEmailTemplateDto,
} from './dto/system.dto.js';
import { EmailTemplateService } from './email-template.service.js';

/**
 * Mẫu email (Handlebars).
 *
 * Toàn bộ endpoint yêu cầu `system:setting` (ADMIN).
 */
@ApiTags('system-email-templates')
@ApiBearerAuth()
@Controller('system/email-templates')
export class EmailTemplateController {
  constructor(private readonly emailTemplateService: EmailTemplateService) { }

  @Get()
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Danh sách mẫu email (phân trang + lọc)' })
  list(@Query() query: QueryEmailTemplatesDto) {
    return this.emailTemplateService.paginate(query);
  }

  @Get(':id')
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Chi tiết mẫu email' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.emailTemplateService.getById(id);
  }

  @Post()
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Tạo mẫu email' })
  create(@Body() dto: CreateEmailTemplateDto) {
    return this.emailTemplateService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Cập nhật mẫu email' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.emailTemplateService.update(id, dto);
  }

  @Patch(':id/active')
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Bật / tắt mẫu email' })
  setActive(@Param('id', new ParseUUIDPipe()) id: string, @Query('active', ParseBoolPipe) active: boolean) {
    return this.emailTemplateService.setActive(id, active);
  }

  @Delete(':id')
  @RequirePermissions('system:setting')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa mẫu email' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.emailTemplateService.remove(id);
  }
}