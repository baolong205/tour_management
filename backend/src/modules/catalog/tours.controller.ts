import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { Public } from '../../common/auth/public.decorator.js';
import { CreateTourDto, QueryToursDto, UpdateTourDto, UpdateTourStatusDto } from './dto/tour.dto.js';
import { FavoriteService } from './services/favorite.service.js';
import { TourService } from './services/tour.service.js';

/**
 * Tour – hai nhóm route:
 * - `GET /tours`, `GET /tours/slug/:slug` … : công khai (`@Public()`), chỉ trả tour PUBLISHED.
 * - `POST/PATCH/DELETE` : yêu cầu `tour:write` / `tour:delete`.
 *
 * Route công khai được khai báo **trước** route có tham số `:id` để `slug` không bị
 * `ParseUUIDPipe` chặn.
 */
@ApiTags('tours')
@Controller('tours')
export class ToursController {
  constructor(
    private readonly tourService: TourService,
    private readonly favoriteService: FavoriteService,
  ) { }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách tour đang mở bán (công khai, có phân trang)' })
  listPublished(@Query() query: QueryToursDto) {
    return this.tourService.paginate(query, true);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Chi tiết tour theo slug (công khai)' })
  detailBySlug(@Param('slug') slug: string) {
    // Tra id từ slug rồi dùng chung luồng `getDetail` – tránh nhân đôi truy vấn nạp quan hệ.
    return this.tourService.getDetailBySlug(slug, true);
  }

  @ApiBearerAuth()
  @Get('admin')
  @RequirePermissions('tour:read')
  @ApiOperation({ summary: 'Danh sách tour cho quản trị (gồm cả DRAFT/HIDDEN)' })
  listForAdmin(@Query() query: QueryToursDto) {
    return this.tourService.paginate(query, false);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết tour theo id (công khai, chỉ tour đã công bố)' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tourService.getDetail(id, true);
  }

  @ApiBearerAuth()
  @Get(':id/admin')
  @RequirePermissions('tour:read')
  @ApiOperation({ summary: 'Chi tiết tour cho quản trị (gồm cả bản nháp)' })
  detailForAdmin(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tourService.getDetail(id, false);
  }

  @ApiBearerAuth()
  @Post()
  @RequirePermissions('tour:write')
  @ApiOperation({ summary: 'Tạo tour mới' })
  create(@Body() dto: CreateTourDto) {
    return this.tourService.create(dto);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @RequirePermissions('tour:write')
  @ApiOperation({ summary: 'Cập nhật tour (mảng con gửi lên sẽ thay thế toàn bộ)' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTourDto) {
    return this.tourService.update(id, dto);
  }

  @ApiBearerAuth()
  @Patch(':id/status')
  @RequirePermissions('tour:write')
  @ApiOperation({ summary: 'Đổi trạng thái công bố của tour' })
  updateStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTourStatusDto) {
    return this.tourService.updateStatus(id, dto.status);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @RequirePermissions('tour:delete')
  @ApiOperation({ summary: 'Xóa mềm tour (chặn khi còn lịch khởi hành chưa kết thúc)' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.tourService.remove(id);
    return { deleted: true };
  }

  // ===== yêu thích (dành cho khách đã đăng nhập) =====

  @ApiBearerAuth()
  @Get('me/favorites')
  @ApiOperation({ summary: 'Danh sách tour yêu thích của tôi' })
  myFavorites(@CurrentUser() user: AuthenticatedUser) {
    return this.favoriteService.list(user.id, true);
  }

  @ApiBearerAuth()
  @Get(':id/favorite')
  @ApiOperation({ summary: 'Kiểm tra tour có trong danh sách yêu thích của tôi không' })
  isFavorited(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.favoriteService.isFavorited(user.id, id);
  }

  @ApiBearerAuth()
  @Post(':id/favorite')
  @ApiOperation({ summary: 'Thêm tour vào yêu thích' })
  addFavorite(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.favoriteService.add(user.id, id);
  }

  @ApiBearerAuth()
  @Delete(':id/favorite')
  @ApiOperation({ summary: 'Bỏ tour khỏi yêu thích' })
  removeFavorite(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.favoriteService.remove(user.id, id);
  }
}
