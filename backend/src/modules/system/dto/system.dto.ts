import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// ===== nhật ký thao tác =====

export class QueryAuditLogsDto {
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

  @ApiPropertyOptional({ format: 'uuid', description: 'Lọc theo người thao tác' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo hành động, vd `booking.confirm`' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  @ApiPropertyOptional({ description: 'Lọc theo loại đối tượng, vd `booking`' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityType?: string;

  @ApiPropertyOptional({ description: 'Lọc theo id đối tượng' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityId?: string;
}

// ===== banner =====

export class CreateBannerDto {
  @ApiProperty({ example: 'Ưu đãi hè 2026', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'https://cdn.example.com/banner.jpg' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ example: 'https://example.com/tour/uu-dai-he' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Thứ tự hiển thị (nhỏ trước)' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endAt?: string;
}

export class UpdateBannerDto extends PartialType(CreateBannerDto) { }

export class QueryBannersDto {
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

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái bật/tắt' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}

// ===== mẫu email =====

export class CreateEmailTemplateDto {
  @ApiProperty({ example: 'BOOKING_CONFIRMED', description: 'Mã mẫu, không phân biệt hoa/thường' })
  @IsString()
  @Matches(/^[A-Za-z0-9_]{3,60}$/, { message: 'Mã mẫu chỉ gồm chữ, số, _ và dài 3–60 ký tự' })
  code: string;

  @ApiProperty({ example: 'Xác nhận đơn đặt tour {{bookingCode}}', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  subject: string;

  @ApiProperty({ example: '<h1>Xin chào {{customerName}}</h1>', description: 'Nội dung HTML (Handlebars)' })
  @IsString()
  @MinLength(1)
  bodyHtml: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}

export class UpdateEmailTemplateDto extends PartialType(CreateEmailTemplateDto) { }

export class QueryEmailTemplatesDto {
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

  @ApiPropertyOptional({ description: 'Tìm theo mã mẫu' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái bật/tắt' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}

// ===== cấu hình hệ thống =====

export class UpsertSystemSettingDto {
  @ApiProperty({ example: 'booking.hold_minutes', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: 15, description: 'Giá trị JSON (number/boolean/object/string)' })
  value: unknown;

  @ApiPropertyOptional({ example: 'Số phút giữ chỗ trước khi hết hạn', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}