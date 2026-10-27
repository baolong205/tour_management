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
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { Public } from '../../common/auth/public.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { CreateReviewDto, ModerateReviewDto, QueryReviewsDto, UpdateReviewDto } from './dto/review.dto.js';
import { ReviewService } from './review.service.js';

/**
 * Đánh giá tour.
 *
 * - `GET /reviews/tour/:tourId` : công khai – chỉ trả review đang `VISIBLE`.
 * - `GET /reviews/me` + `POST` / `PATCH` : khách tự quản lý đánh giá của mình.
 * - Kiểm duyệt / xóa : `review:moderate` (STAFF/ADMIN).
 */
@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) { }

  @Public()
  @Get('tour/:tourId')
  @ApiOperation({ summary: 'Đánh giá công khai của một tour (chỉ review VISIBLE)' })
  listByTour(@Param('tourId', new ParseUUIDPipe()) tourId: string, @Query() query: QueryReviewsDto) {
    return this.reviewService.listByTour(tourId, query);
  }

  @Public()
  @Get('tour/:tourId/summary')
  @ApiOperation({ summary: 'Điểm đánh giá tổng hợp của tour (trung bình + phân bố sao)' })
  tourSummary(@Param('tourId', new ParseUUIDPipe()) tourId: string) {
    return this.reviewService.getTourSummary(tourId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Đánh giá của tôi' })
  listMine(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryReviewsDto) {
    return this.reviewService.listMine(user, query);
  }

  @Get()
  @RequirePermissions('review:moderate')
  @ApiOperation({ summary: 'Danh sách đánh giá (phân trang + lọc) – màn kiểm duyệt' })
  list(@Query() query: QueryReviewsDto) {
    return this.reviewService.paginate(query);
  }

  @Get(':id')
  @RequirePermissions('review:moderate')
  @ApiOperation({ summary: 'Chi tiết đánh giá' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reviewService.getById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Viết đánh giá cho booking đã hoàn thành',
    description: 'Chỉ chủ booking ở trạng thái COMPLETED mới đánh giá được; mỗi booking một đánh giá.',
  })
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reviewService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa đánh giá của tôi (chỉ khi còn PENDING)' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewService.update(id, dto, user);
  }

  @Patch(':id/moderate')
  @RequirePermissions('review:moderate')
  @ApiOperation({ summary: 'Kiểm duyệt đánh giá (VISIBLE / HIDDEN)' })
  moderate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ModerateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewService.moderate(id, dto.status, user);
  }

  @Delete(':id')
  @RequirePermissions('review:moderate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa đánh giá' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.reviewService.remove(id);
  }
}