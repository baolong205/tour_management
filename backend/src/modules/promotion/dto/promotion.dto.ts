import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PromotionType } from '../../../common/enums/index.js';

/** Mã khuyến mãi: chữ, số, `_`, `-`; 3–40 ký tự (service tự đưa về IN HOA). */
const PROMOTION_CODE_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;

/**
 * Tạo mã khuyến mãi.
 *
 * Mọi ràng buộc nghiệp vụ (kiểu PERCENT ⇒ `value ≤ 100`, `valid_to > valid_from`,
 * `usage_limit ≥ 1`) được kiểm lại trong `PromotionService` vì `@Column` của entity
 * không sinh được CHECK trên MySQL.
 */
export class CreatePromotionDto {
  @ApiProperty({ example: 'DIHE2026', description: 'Mã giảm giá, không phân biệt hoa/thường' })
  @IsString()
  @Matches(PROMOTION_CODE_PATTERN, { message: 'Mã khuyến mãi chỉ gồm chữ, số, _ và -, dài 3–40 ký tự' })
  code: string;

  @ApiProperty({ enum: PromotionType, example: PromotionType.PERCENT })
  @IsEnum(PromotionType)
  type: PromotionType;

  @ApiProperty({
    example: 10,
    description: 'PERCENT: phần trăm giảm (0–100). FIXED: số tiền giảm (VNĐ)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value: number;

  @ApiPropertyOptional({ example: 500000, description: 'Trần giảm khi type = PERCENT (VNĐ)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number | null;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Giá trị đơn tối thiểu để áp mã (VNĐ)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrder?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Tổng số lượt dùng tối đa. Bỏ trống = không giới hạn',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Số lần tối đa mỗi người được dùng' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perUserLimit?: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  validTo: string;

  @ApiPropertyOptional({ default: true, description: 'Bật/tắt nhanh mà không xóa mã' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}

const _promotionOptionalBase = PartialType(CreatePromotionDto);

/** Cập nhật mã khuyến mãi – mọi trường đều tùy chọn. */
export class UpdatePromotionDto extends _promotionOptionalBase { }

export class QueryPromotionsDto {
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

  @ApiPropertyOptional({ description: 'Tìm theo mã' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái bật/tắt' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ enum: PromotionType })
  @IsOptional()
  @IsEnum(PromotionType)
  type?: PromotionType;

  @ApiPropertyOptional({ description: 'Chỉ lấy mã còn hiệu lực tại thời điểm hiện tại' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  usableOnly?: boolean;
}

/** Áp thử mã trước khi đặt tour. */
export class ValidatePromotionDto {
  @ApiProperty({ example: 'DIHE2026' })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  code: string;

  @ApiProperty({ example: 3500000, description: 'Tạm tính của đơn hàng (VNĐ)' })
  @IsInt()
  @Min(0)
  subtotal: number;
}
