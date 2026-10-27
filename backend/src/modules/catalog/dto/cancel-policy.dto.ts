import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Một mốc phí hủy.
 *
 * `days_before` + `fee_percent` tạo thành khóa duy nhất trong một chính sách
 * (`uq_cancel_policy_rules_policy_days`). Service phải kiểm tra trùng trước khi ghi
 * vì MySQL báo lỗi 1062 khó đọc với người dùng cuối.
 */
export class CancelPolicyRuleDto {
  @ApiProperty({ example: 15, minimum: 0, description: 'Hủy trước ít nhất bao nhiêu ngày' })
  @IsInt()
  @Min(0)
  @Max(365)
  daysBefore: number;

  @ApiProperty({ example: 30, minimum: 0, maximum: 100, description: 'Phần trăm phí hủy' })
  @IsInt()
  @Min(0)
  @Max(100)
  feePercent: number;
}

export class CreateCancelPolicyDto {
  @ApiProperty({ example: 'Chính sách tiêu chuẩn', maxLength: 150 })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'Áp dụng cho tour nội địa' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ default: false, description: 'Chính sách mặc định cho tour mới' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ type: [CancelPolicyRuleDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CancelPolicyRuleDto)
  rules: CancelPolicyRuleDto[];
}

/**
 * Cập nhật chính sách hủy.
 *
 * `rules` gửi lên sẽ **thay thế toàn bộ** danh sách cũ (đơn giản và tránh mồ côi rule).
 * Yêu cầu hủy đã gửi trước đó không bị ảnh hưởng vì chúng đã chụp `policy_snapshot`.
 */
export class UpdateCancelPolicyDto extends PartialType(CreateCancelPolicyDto) { }
