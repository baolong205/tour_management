import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TourStatus } from '../../../common/enums/index.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Một ảnh của tour. `isCover` chỉ nên có một ảnh `true` (xem `TourImage`). */
export class TourImageDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/demo/tour-1.jpg' })
  @IsString()
  @MaxLength(2048)
  url: string;

  @ApiPropertyOptional({ example: 'travel/tour-1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  publicId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCover?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/** Một ngày trong lịch trình. `dayNo` phải duy nhất trong tour (service kiểm tra). */
export class ItineraryDayDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(365)
  dayNo: number;

  @ApiProperty({ example: 'Hà Nội – Đà Nẵng', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Đón khách tại sân bay, nhận phòng khách sạn…' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 'Sáng, Trưa', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  meals?: string;
}

/** Điểm đến trong tour, có thứ tự tham quan. */
export class TourDestinationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  destinationId: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateTourDto {
  @ApiPropertyOptional({
    example: 'TOUR-0001',
    description: 'Bỏ trống để hệ thống tự sinh theo mẫu `TOUR-0001`',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @ApiProperty({ example: 'da-nang-hoi-an-4n3d', maxLength: 220 })
  @IsString()
  @MinLength(3)
  @MaxLength(220)
  @Matches(SLUG_PATTERN, { message: 'slug chỉ gồm chữ thường, số và dấu gạch nối' })
  slug: string;

  @ApiProperty({ example: 'Đà Nẵng – Hội An 4N3Đ', maxLength: 200 })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @ApiProperty({ example: 4, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays: number;

  @ApiPropertyOptional({ example: 3, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  durationNights?: number;

  @ApiPropertyOptional({ example: 'Hà Nội', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  departureCity?: string;

  @ApiPropertyOptional({ enum: TourStatus, default: TourStatus.DRAFT })
  @IsOptional()
  @IsEnum(TourStatus)
  status?: TourStatus;

  @ApiProperty({ format: 'uuid', description: 'Chính sách hủy áp cho tour' })
  @IsUUID()
  cancelPolicyId: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid', description: 'Danh sách id danh mục' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID(undefined, { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [TourDestinationDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TourDestinationDto)
  destinations?: TourDestinationDto[];

  @ApiPropertyOptional({ type: [TourImageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => TourImageDto)
  images?: TourImageDto[];

  @ApiPropertyOptional({ type: [ItineraryDayDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => ItineraryDayDto)
  itinerary?: ItineraryDayDto[];
}

/**
 * Cập nhật tour.
 *
 * `destinations` / `images` / `itinerary` khi được gửi lên sẽ **thay thế toàn bộ**
 * danh sách cũ (xóa rồi tạo lại). Nhờ vậy client chỉ cần gửi trạng thái mong muốn,
 * không phải tự tính diff.
 */
export class UpdateTourDto extends PartialType(CreateTourDto) { }

export class UpdateTourStatusDto {
  @ApiProperty({ enum: TourStatus })
  @IsEnum(TourStatus)
  status: TourStatus;
}

export class QueryToursDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Tìm theo tên, mã tour hoặc mô tả ngắn' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: TourStatus, description: 'Chỉ ADMIN/STAFF nên lọc DRAFT/HIDDEN' })
  @IsOptional()
  @IsEnum(TourStatus)
  status?: TourStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Hà Nội' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  departureCity?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'name', 'avgRating'], default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'name' | 'avgRating';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
