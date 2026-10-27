import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Public } from '../../common/auth/public.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import {
  CreateCancelPolicyDto,
  UpdateCancelPolicyDto,
} from './dto/cancel-policy.dto.js';
import {
  CreateCategoryDto,
  CreateDestinationDto,
  UpdateCategoryDto,
  UpdateDestinationDto,
} from './dto/category.dto.js';
import { CancelPolicyService } from './services/cancel-policy.service.js';
import { CategoryService } from './services/category.service.js';

/**
 * Dữ liệu nền của catalog: danh mục, điểm đến, chính sách hủy.
 *
 * Đọc (`GET`) mở công khai vì trang chủ cần danh mục/điểm đến để hiển thị bộ lọc.
 * Ghi yêu cầu `category:write` (danh mục, điểm đến) hoặc `tour:write` (chính sách hủy —
 * chính sách chỉ có ý nghĩa khi gắn vào tour).
 */
@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly cancelPolicyService: CancelPolicyService,
  ) { }

  // ===== danh mục =====

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Danh sách danh mục tour' })
  listCategories() {
    return this.categoryService.listCategories();
  }

  @ApiBearerAuth()
  @Post('categories')
  @RequirePermissions('category:write')
  @ApiOperation({ summary: 'Tạo danh mục tour' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.createCategory(dto);
  }

  @ApiBearerAuth()
  @Patch('categories/:id')
  @RequirePermissions('category:write')
  @ApiOperation({ summary: 'Cập nhật danh mục tour' })
  updateCategory(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(id, dto);
  }

  @ApiBearerAuth()
  @Delete('categories/:id')
  @RequirePermissions('category:write')
  @ApiOperation({ summary: 'Xóa danh mục tour (gỡ luôn liên kết với tour)' })
  async removeCategory(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.categoryService.removeCategory(id);
    return { deleted: true };
  }

  // ===== điểm đến =====

  @Public()
  @Get('destinations')
  @ApiOperation({ summary: 'Danh sách điểm đến (có toạ độ để vẽ bản đồ)' })
  listDestinations() {
    return this.categoryService.listDestinations();
  }

  @ApiBearerAuth()
  @Post('destinations')
  @RequirePermissions('category:write')
  @ApiOperation({ summary: 'Tạo điểm đến' })
  createDestination(@Body() dto: CreateDestinationDto) {
    return this.categoryService.createDestination(dto);
  }

  @ApiBearerAuth()
  @Patch('destinations/:id')
  @RequirePermissions('category:write')
  @ApiOperation({ summary: 'Cập nhật điểm đến' })
  updateDestination(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateDestinationDto) {
    return this.categoryService.updateDestination(id, dto);
  }

  @ApiBearerAuth()
  @Delete('destinations/:id')
  @RequirePermissions('category:write')
  @ApiOperation({ summary: 'Xóa điểm đến (chặn khi còn tour sử dụng)' })
  async removeDestination(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.categoryService.removeDestination(id);
    return { deleted: true };
  }

  // ===== chính sách hủy =====

  @Public()
  @Get('cancel-policies')
  @ApiOperation({ summary: 'Danh sách chính sách hủy (kèm các mốc phí)' })
  listCancelPolicies() {
    return this.cancelPolicyService.list();
  }

  @Public()
  @Get('cancel-policies/:id')
  @ApiOperation({ summary: 'Chi tiết chính sách hủy' })
  detailCancelPolicy(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.cancelPolicyService.getOrFail(id);
  }

  @ApiBearerAuth()
  @Post('cancel-policies')
  @RequirePermissions('tour:write')
  @ApiOperation({ summary: 'Tạo chính sách hủy' })
  createCancelPolicy(@Body() dto: CreateCancelPolicyDto) {
    return this.cancelPolicyService.create(dto);
  }

  @ApiBearerAuth()
  @Patch('cancel-policies/:id')
  @RequirePermissions('tour:write')
  @ApiOperation({ summary: 'Cập nhật chính sách hủy (rules gửi lên thay thế toàn bộ)' })
  updateCancelPolicy(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateCancelPolicyDto) {
    return this.cancelPolicyService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete('cancel-policies/:id')
  @RequirePermissions('tour:write')
  @ApiOperation({ summary: 'Xóa chính sách hủy (chặn khi còn tour sử dụng)' })
  async removeCancelPolicy(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.cancelPolicyService.remove(id);
    return { deleted: true };
  }

  /**
   * Mô phỏng phí hủy cho một booking cụ thể.
   *
   * Đây là endpoint *chỉ đọc* để FE hiển thị "hủy bây giờ mất bao nhiêu?" trước khi
   * khách bấm xác nhận. Khi khách thực sự gửi yêu cầu, `BookingService` tính lại và
   * chụp snapshot – không tin số liệu client gửi.
   */
  @Public()
  @Get('cancel-policies/:id/quote')
  @ApiOperation({ summary: 'Ước tính phí hủy theo tổng tiền và ngày khởi hành' })
  quoteFee(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('total') total: string,
    @Query('startDate') startDate: string,
  ) {
    return this.cancelPolicyService.quoteFee(id, Number(total), startDate);
  }
}
