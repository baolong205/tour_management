import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ReviewStatus } from '../../../common/enums/index.js';

/**
 * Tạo đánh giá cho một booking đã hoàn thành.
 *
 * `tourId` **không** nhận từ client – service suy ra từ booking để tránh giả mạo.
 * Ràng buộc "booking phải COMPLETED" và "mỗi booking chỉ một đánh giá" kiểm ở service.
 */
export class CreateReviewDto {
  @ApiProperty({ format: 'uuid', description: 'Booking đã hoàn thành cần đánh giá' })
  @IsUUID()
  bookingId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Số sao 1–5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Tour rất đáng tiền, HDV nhiệt tình!', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

/** Cập nhật đánh giá của chính mình – chỉ cho sửa khi còn PENDING. */
export class UpdateReviewDto extends PartialType(CreateReviewDto) { }

/** Kiểm duyệt đánh giá: PENDING → VISIBLE / HIDDEN. */
export class ModerateReviewDto {
  @ApiProperty({ enum: ReviewStatus, example: ReviewStatus.VISIBLE })
  @IsEnum(ReviewStatus)
  status: ReviewStatus;
}

export class QueryReviewsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ format: 'uuid', description: 'Lọc theo tour' })
  @IsOptional()
  @IsUUID()
  tourId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Lọc theo người viết' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: ReviewStatus, description: 'Lọc theo trạng thái kiểm duyệt' })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, description: 'Lọc theo số sao' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}