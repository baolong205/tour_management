import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
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
import {
  PaymentMethod,
  PaymentStatus,
  RefundReason,
  WebhookEventType,
  WebhookResult,
} from '../../../common/enums/index.js';

/**
 * Tạo giao dịch thanh toán cho một booking.
 *
 * **Không** nhận `amount` từ client – số tiền luôn lấy từ `bookings.total`
 * ở server. Đây là điểm chống gian lận của luồng thanh toán.
 */
export class CreatePaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  bookingId: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.VNPAY })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}

/** Khách gửi ảnh chụp chuyển khoản để nhân viên đối chiếu. */
export class SubmitProofDto {
  @ApiProperty({ example: 'https://cdn.example.com/proof/bk260001.jpg', maxLength: 2048 })
  @IsString()
  @MinLength(5)
  @MaxLength(2048)
  proofUrl: string;

  @ApiPropertyOptional({ example: 'Chuyển khoản lúc 20:15, nội dung BK260001', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  proofNote?: string;
}

/**
 * Giả lập cổng thanh toán gọi IPN.
 *
 * Với cổng thật, body là form của VNPay/MoMo và có `signature`. Ở đây dùng
 * header `x-mock-signature` (xem `MockPaymentGateway`) – mục đích là **tập luyện
 * đúng luồng**: xác thực chữ ký → tìm payment → idempotent → cập nhật.
 */
export class MockWebhookDto {
  @ApiProperty({ example: 'VNPAY' })
  @IsString()
  @MaxLength(20)
  gateway: string;

  @ApiProperty({ example: 'PAY26000001', description: 'Mã tham chiếu mình sinh ra khi tạo payment' })
  @IsString()
  @MaxLength(64)
  txnRef: string;

  @ApiProperty({ example: '14001234', description: 'Mã giao dịch phía cổng' })
  @IsString()
  @MaxLength(64)
  gatewayTxnNo: string;

  @ApiProperty({ example: 3500000, description: 'Số tiền cổng báo đã thu (VNĐ)' })
  @IsInt()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ enum: WebhookEventType, default: WebhookEventType.IPN })
  @IsOptional()
  @IsEnum(WebhookEventType)
  eventType?: WebhookEventType;

  @ApiProperty({ example: true, description: 'Cổng báo giao dịch thành công hay thất bại' })
  @Type(() => Boolean)
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional({ example: '00', description: 'Mã lỗi phía cổng (00 = thành công)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  responseCode?: string;

  @ApiPropertyOptional({
    example: 'signed-by-gateway',
    description: 'Cổng thật đặt chữ ký trong payload; mock nhận qua header `x-mock-signature`.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  signature?: string;
}

/** Ghi log chữ ký sai / payload không đọc được (không tìm thấy payment). */
export class RawWebhookLogDto {
  @ApiProperty({ example: 'VNPAY' })
  @IsString()
  @MaxLength(20)
  gateway: string;

  @ApiProperty({ example: 'PAY26009999' })
  @IsString()
  @MaxLength(64)
  txnRef: string;

  @ApiProperty({ enum: WebhookResult, example: WebhookResult.INVALID })
  @IsEnum(WebhookResult)
  result: WebhookResult;

  @ApiPropertyOptional({ example: 'Chữ ký không hợp lệ' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ type: Object, description: 'Payload gốc để đối soát sau' })
  @IsOptional()
  rawPayload?: Record<string, unknown>;
}

/** Tạo hoàn tiền thủ công (nhân viên thao tác sau khi đối chiếu). */
export class CreateRefundDto {
  @ApiProperty({ format: 'uuid', description: 'ID của payment gốc' })
  @IsUUID()
  paymentId: string;

  @ApiPropertyOptional({
    example: 1000000,
    description: 'Số tiền hoàn. Bỏ trống = hoàn toàn bộ số còn lại của payment',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @ApiProperty({ enum: RefundReason, example: RefundReason.CANCEL })
  @IsEnum(RefundReason)
  reason: RefundReason;

  @ApiPropertyOptional({ format: 'uuid', description: 'Gắn với yêu cầu hủy nào (nếu có)' })
  @IsOptional()
  @IsUUID()
  cancelRequestId?: string;

  @ApiPropertyOptional({ default: true, description: 'true = hoàn tay bằng chuyển khoản (không qua cổng)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isManual?: boolean;

  @ApiPropertyOptional({ example: 'FT2600123', description: 'Mã giao dịch hoàn phía cổng/ngân hàng' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  gatewayRef?: string;

  @ApiPropertyOptional({ example: 'Đã chuyển khoản cho khách ngày 12/12', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Nhân viên xác nhận đã chuyển tiền hoàn cho khách. */
export class CompleteRefundDto {
  @ApiPropertyOptional({ example: 'FT2600123', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  gatewayRef?: string;
}

export class RejectRefundDto {
  @ApiProperty({ example: 'Sai số tài khoản, khách đã nhận lại tiền mặt', maxLength: 500 })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  errorMessage: string;
}

export class QueryPaymentsDto {
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

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã booking hoặc mã tham chiếu gateway' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;
}

export class QueryRefundsDto {
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

  @ApiPropertyOptional({ enum: ['PENDING', 'REFUNDED', 'FAILED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  paymentId?: string;
}

/**
 * Input của `POST /payments/mock-gateway/signature`.
 *
 * Trước đây controller khai báo `body` inline nên `ValidationPipe` bỏ qua:
 * gửi thiếu `amount`/`success` sẽ tạo chữ ký rác thay vì trả 400, khiến người
 * test tưởng lỗi nằm ở phía cổng thanh toán.
 */
export class PreviewSignatureDto {
  @ApiProperty({ example: 'PAY26000001', maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  txnRef: string;

  @ApiProperty({ example: 'GW99887766', maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  gatewayTxnNo: string;

  @ApiProperty({ example: 2500000, description: 'Số tiền (VND), số nguyên dương' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ example: true })
  @Type(() => Boolean)
  @IsBoolean()
  success: boolean;
}

/** Payload nội bộ dùng khi ghi `payment_events` (không lộ ra controller). */
export class LogWebhookDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => RawWebhookLogDto)
  body?: RawWebhookLogDto;
}
