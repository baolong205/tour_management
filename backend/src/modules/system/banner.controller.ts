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
import { Public } from '../../common/auth/public.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { BannerService } from './banner.service.js';
import { CreateBannerDto, QueryBannersDto, UpdateBannerDto } from './dto/system.dto.js';

/**
 * Banner trang chủ.
 *
 * - `GET /banners/visible` : công khai, chỉ trả banner đang hiển thị.
 * - CRUD : `system:setting` (ADMIN).
 */
@ApiTags('system-banners')
@ApiBearerAuth()
@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) { }

  @Public()
  @Get('visible')
  @ApiOperation({ summary: 'Banner đang hiển thị (công khai, theo thứ tự)' })
  listVisible() {
    return this.bannerService.listVisible();
  }

  @Get()
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Danh sách banner (phân trang + lọc)' })
  list(@Query() query: QueryBannersDto) {
    return this.bannerService.paginate(query);
  }

  @Get(':id')
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Chi tiết banner' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.bannerService.getById(id);
  }

  @Post()
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Tạo banner' })
  create(@Body() dto: CreateBannerDto) {
    return this.bannerService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Cập nhật banner' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateBannerDto) {
    return this.bannerService.update(id, dto);
  }

  @Patch(':id/active')
  @RequirePermissions('system:setting')
  @ApiOperation({ summary: 'Bật / tắt banner' })
  setActive(@Param('id', new ParseUUIDPipe()) id: string, @Query('active', ParseBoolPipe) active: boolean) {
    return this.bannerService.setActive(id, active);
  }

  @Delete(':id')
  @RequirePermissions('system:setting')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa banner' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.bannerService.remove(id);
  }
}