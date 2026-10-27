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
  CreatePromotionDto,
  QueryPromotionsDto,
  UpdatePromotionDto,
  ValidatePromotionDto,
} from './dto/promotion.dto.js';
import { PromotionService } from './promotion.service.js';

/**
 * Mã khuyến mãi.
 *
 * - `POST /promotions/validate` : mọi người dùng đã đăng nhập (kể cả khách) được áp thử mã.
 * - CRUD : `promotion:manage` (STAFF/ADMIN).
 */
@ApiTags('promotions')
@ApiBearerAuth()
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) { }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Áp thử mã khuyến mãi cho một tạm tính (không trừ lượt)',
    description: 'Trả về số tiền được giảm và tổng phải trả; ném 400 kèm lý do nếu mã không dùng được.',
  })
  validate(@Body() dto: ValidatePromotionDto) {
    return this.promotionService.validate(dto);
  }

  @Get()
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Danh sách mã khuyến mãi (phân trang + lọc)' })
  list(@Query() query: QueryPromotionsDto) {
    return this.promotionService.paginate(query);
  }

  @Get('code/:code')
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Tra mã khuyến mãi theo code' })
  getByCode(@Param('code') code: string) {
    return this.promotionService.getByCode(code);
  }

  @Get(':id')
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Chi tiết mã khuyến mãi' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.promotionService.getById(id);
  }

  @Post()
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Tạo mã khuyến mãi' })
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Cập nhật mã khuyến mãi' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionService.update(id, dto);
  }

  @Patch(':id/active')
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Bật / tắt nhanh mã khuyến mãi' })
  setActive(@Param('id', new ParseUUIDPipe()) id: string, @Query('active', ParseBoolPipe) active: boolean) {
    return this.promotionService.setActive(id, active);
  }

  @Delete(':id')
  @RequirePermissions('promotion:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa mã khuyến mãi (chỉ khi chưa được dùng)' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.promotionService.remove(id);
  }
}
