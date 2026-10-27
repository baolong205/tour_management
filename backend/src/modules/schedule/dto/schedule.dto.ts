import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
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
import { ScheduleStatus } from '../../../common/enums/index.js';

/** `HH:mm` hoặc `HH:mm:ss` – cột `time` của MySQL. */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * Điểm hẹn / điểm danh trong chuyến. Gửi lên sẽ thay thế toàn bộ danh sách cũ.
 *
 * Khai báo **trước** `CreateScheduleDto` vì `@Type(() => CheckpointDto)` được thi
 * hành ngay khi decorator của `CreateScheduleDto` chạy – class declaration không
 * được hoisted, tham chiếu tới class khai báo sau sẽ ném lỗi lúc runtime.
 */
export class CheckpointDto {
  @ApiProperty({ example: 'Đón khách tại sân bay', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '05:30', description: '`HH:mm`' })
  @IsString()
  @Matches(TIME_PATTERN, { message: 'meetTime phải có dạng HH:mm' })
  meetTime: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  dayNo?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateScheduleDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tourId: string;

  @ApiProperty({ example: '2026-12-20', description: 'Ngày khởi hành (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-12-23', description: 'Ngày kết thúc (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 3500000, minimum: 0, description: 'Giá người lớn (VNĐ)' })
  @IsInt()
  @Min(0)
  priceAdult: number;

  @ApiProperty({ example: 2800000, minimum: 0, description: 'Giá trẻ em (VNĐ)' })
  @IsInt()
  @Min(0)
  priceChild: number;

  @ApiPropertyOptional({ example: 500000, minimum: 0, default: 0, description: 'Giá em bé (VNĐ)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceInfant?: number;

  @ApiProperty({ example: 30, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(1000)
  maxSeats: number;

  @ApiPropertyOptional({ enum: ScheduleStatus, default: ScheduleStatus.DRAFT })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @ApiPropertyOptional({ example: 'Sân bay Nội Bài – Cột 12', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  meetingPoint?: string;

  @ApiPropertyOptional({ type: () => [CheckpointDto], description: 'Không gửi để giữ nguyên checkpoint hiện có' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CheckpointDto)
  checkpoints?: CheckpointDto[];
}

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) { }

export class UpdateScheduleStatusDto {
  @ApiProperty({ enum: ScheduleStatus })
  @IsEnum(ScheduleStatus)
  status: ScheduleStatus;
}

export class QuerySchedulesDto {
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

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tourId?: string;

  @ApiPropertyOptional({ enum: ScheduleStatus })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @ApiPropertyOptional({ example: '2026-12-01', description: 'Lọc lịch khởi hành từ ngày này' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2027-01-31', description: 'Lọc lịch khởi hành đến ngày này' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

/** Yêu cầu giữ chỗ trước khi thanh toán. */
export class HoldSeatsDto {
  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(20)
  seats: number;
}

export class ReleaseHoldDto {
  @ApiPropertyOptional({ maxLength: 255, description: 'Lý do nhả chỗ (chỉ để ghi log)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
