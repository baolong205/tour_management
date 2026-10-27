import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AssignmentStatus, AttendanceStatus } from '../../../common/enums/index.js';

// ===== phân công HDV =====

export class CreateAssignmentDto {
  @ApiProperty({ format: 'uuid', description: 'Lịch khởi hành được phân công' })
  @IsUUID()
  scheduleId: string;

  @ApiProperty({ format: 'uuid', description: '`guide_profiles.id` của HDV' })
  @IsUUID()
  guideId: string;

  @ApiPropertyOptional({ example: '2026-12-20', description: 'Mặc định = `start_date` của lịch' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ example: '2026-12-23', description: 'Mặc định = `end_date` của lịch' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class QueryAssignmentsDto {
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
  guideId?: string;

  @ApiPropertyOptional({ enum: AssignmentStatus })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;
}

export class RevokeAssignmentDto {
  @ApiProperty({ example: 'HDV báo ốm, phân công lại', maxLength: 500 })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

// ===== điểm danh =====

export class AttendanceEntryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  passengerId: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}

/**
 * Điểm danh hàng loạt tại một checkpoint.
 * Mỗi (checkpoint, passenger) chỉ có một bản ghi – gửi lại là **cập nhật**.
 */
export class MarkAttendanceDto {
  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}

// ===== sự cố =====

export class CreateIncidentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  scheduleId: string;

  @ApiProperty({ example: 'Xe hỏng dọc đường, phải thuê xe thay thế', maxLength: 2000 })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ example: 2500000, default: 0, description: 'Chi phí phát sinh (VNĐ)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  extraCost?: number;

  @ApiPropertyOptional({ example: '2026-12-21T08:30:00.000Z', description: 'Mặc định = thời điểm hiện tại' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

export class UpdateIncidentDto {
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  extraCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

export class QueryIncidentsDto {
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
}
