import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ResourceType, SupplierType } from '../../../common/enums/index.js';

// ===== nhà cung cấp =====

export class CreateSupplierDto {
  @ApiProperty({ enum: SupplierType, example: SupplierType.HOTEL })
  @IsEnum(SupplierType)
  type: SupplierType;

  @ApiProperty({ example: 'Khách sạn Mường Thanh', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactName?: string;

  @ApiPropertyOptional({ example: '0901234567', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@muongthanh.vn', maxLength: 191 })
  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  email?: string;

  @ApiPropertyOptional({ example: 'Số 1 Cửa Nam, Hoàn Kiếm, Hà Nội', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    description: 'Thuộc tính riêng theo loại, vd `{ stars: 4 }` hoặc `{ seatCount: 45 }`',
    example: { stars: 4 },
  })
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) { }

export class QuerySuppliersDto {
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

  @ApiPropertyOptional({ description: 'Tìm theo tên / liên hệ' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: SupplierType })
  @IsOptional()
  @IsEnum(SupplierType)
  type?: SupplierType;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}

// ===== phân bổ nguồn lực =====

export class CreateResourceAssignmentDto {
  @ApiProperty({ format: 'uuid', description: 'Lịch khởi hành được phân bổ' })
  @IsUUID()
  scheduleId: string;

  @ApiProperty({ format: 'uuid', description: 'Nhà cung cấp' })
  @IsUUID()
  supplierId: string;

  @ApiProperty({ enum: ResourceType, example: ResourceType.HOTEL })
  @IsEnum(ResourceType)
  type: ResourceType;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 2500000, description: 'Chi phí (VNĐ)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateResourceAssignmentDto extends PartialType(CreateResourceAssignmentDto) { }

export class QueryResourceAssignmentsDto {
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

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ enum: ResourceType })
  @IsOptional()
  @IsEnum(ResourceType)
  type?: ResourceType;
}