import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
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
import { BookingChannel, BookingStatus } from '../../../common/enums/index.js';

/** Số điện thoại VN: 10 số bắt đầu bằng 0, hoặc +84… */
const PHONE_PATTERN = /^(?:0\d{9}|\+84\d{9})$/;

/**
 * Hành khách.
 *
 * **Không** nhận `type` hay `unitPrice` từ client: service tự suy `type` từ `dob` so
 * với ngày khởi hành và tự tra giá từ lịch. Đây là điểm chống gian lận quan trọng
 * nhất của luồng đặt tour.
 */
export class PassengerInputDto {
  @ApiProperty({ example: 'Nguyễn Văn A', maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: '1990-05-20', description: 'YYYY-MM-DD – dùng để suy loại hành khách' })
  @IsDateString()
  dob: string;

  @ApiPropertyOptional({ example: 'Nam', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  gender?: string;

  @ApiPropertyOptional({ example: '001090012345', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  idNumber?: string;
}

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  scheduleId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Hold id trả về từ `POST /schedules/:id/holds`. Nếu bỏ trống, service tự giữ chỗ trong transaction.',
  })
  @IsOptional()
  @IsUUID()
  holdId?: string;

  @ApiProperty({ example: 'Nguyễn Văn A', maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  contactName: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'Số điện thoại không hợp lệ' })
  contactPhone: string;

  @ApiProperty({ example: 'nguyenvana@example.com' })
  @IsEmail()
  @MaxLength(191)
  contactEmail: string;

  @ApiProperty({ type: [PassengerInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => PassengerInputDto)
  passengers: PassengerInputDto[];

  @ApiPropertyOptional({ example: 'DIHE2026', maxLength: 40, description: 'Mã khuyến mãi' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  promotionCode?: string;

  @ApiPropertyOptional({ enum: BookingChannel, default: BookingChannel.ONLINE })
  @IsOptional()
  @IsEnum(BookingChannel)
  channel?: BookingChannel;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

/**
 * Tạo booking tại quầy (nhân viên).
 *
 * Khác `CreateBookingDto`: có `customerId` (khách đã có tài khoản) hoặc thông tin
 * liên hệ để nhân viên tạo hộ; trạng thái có thể nhảy thẳng `CONFIRMED`
 * (khách trả tiền mặt ở quầy).
 */
export class CreateCounterBookingDto extends CreateBookingDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Bỏ trống để dùng tài khoản của người đang đăng nhập' })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class QueryBookingsDto {
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

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã booking, tên hoặc SĐT liên hệ' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

/** Khách tự gửi yêu cầu hủy. */
export class RequestCancelDto {
  @ApiProperty({ example: 'Gia đình có việc gấp', maxLength: 1000 })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason: string;
}

/**
 * Nhân viên xử lý yêu cầu hủy.
 *
 * `approve = true` → booking `CANCELLED`, phí/hoàn tiền lấy theo `policy_snapshot` đã chụp.
 * `approve = false` → booking quay về trạng thái trước khi khách gửi yêu cầu.
 */
export class ProcessCancelDto {
  @ApiProperty({ example: true })
  @Type(() => Boolean)
  @IsBoolean()
  approve: boolean;

  @ApiPropertyOptional({ maxLength: 500, description: 'Bắt buộc khi từ chối' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectReason?: string;
}

export class ConfirmBookingDto {
  @ApiPropertyOptional({ maxLength: 1000, description: 'Ghi chú nội bộ khi xác nhận' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class RejectBookingDto {
  @ApiProperty({ example: 'Không liên hệ được khách', maxLength: 500 })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

/**
 * Báo giá trước khi đặt.
 *
 * Trước đây endpoint `POST /bookings/quote` nhận `body` khai báo inline trong
 * controller nên `ValidationPipe` bỏ qua hoàn toàn: gửi thiếu `passengers` sẽ
 * khiến service duyệt `undefined` và trả 500 thay vì 400. DTO này khớp đúng
 * ràng buộc của `CreateBookingDto` để "báo giá" và "đặt thật" luôn cùng một
 * tập input hợp lệ.
 */
export class QuoteBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  scheduleId: string;

  @ApiProperty({ type: [PassengerInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => PassengerInputDto)
  passengers: PassengerInputDto[];

  @ApiPropertyOptional({ example: 'DIHE2026', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  promotionCode?: string;
}
