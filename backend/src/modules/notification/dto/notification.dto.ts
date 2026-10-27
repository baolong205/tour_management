import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
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
import { NotificationType } from '../../../common/enums/index.js';

/**
 * Tạo thông báo (dùng nội bộ / admin gửi thủ công).
 *
 * Các module khác (booking, payment, operations) nên gọi thẳng `NotificationService.create`
 * thay vì qua HTTP; endpoint này chủ yếu để ADMIN phát thông báo hệ thống.
 */
export class CreateNotificationDto {
  @ApiProperty({ format: 'uuid', description: 'Người nhận' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.SYSTEM })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: 'Bảo trì hệ thống', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Hệ thống sẽ bảo trì lúc 23:00 hôm nay.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @ApiPropertyOptional({
    description: 'Dữ liệu deep-link, vd `{ bookingId: "..." }`',
    example: { bookingId: '00000000-0000-0000-0000-000000000000' },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class QueryNotificationsDto {
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

  @ApiPropertyOptional({ description: 'Chỉ lấy thông báo chưa đọc' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}