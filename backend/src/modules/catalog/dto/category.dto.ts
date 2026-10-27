import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Slug dùng cho URL công khai (`/tours/bien-da-nang`).
 * Chỉ cho chữ thường, số và dấu gạch nối để khỏi phải chuẩn hóa lại ở tầng khác.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCategoryDto {
  @ApiProperty({ example: 'Tour biển', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'tour-bien', maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(SLUG_PATTERN, { message: 'slug chỉ gồm chữ thường, số và dấu gạch nối' })
  slug: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) { }

export class CreateDestinationDto {
  @ApiProperty({ example: 'Đà Nẵng', maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: 'da-nang', maxLength: 170 })
  @IsString()
  @MinLength(2)
  @MaxLength(170)
  @Matches(SLUG_PATTERN, { message: 'slug chỉ gồm chữ thường, số và dấu gạch nối' })
  slug: string;

  @ApiPropertyOptional({ example: 16.0544 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 108.2022 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateDestinationDto extends PartialType(CreateDestinationDto) { }
