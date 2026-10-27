import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { Public } from '../../common/auth/public.decorator.js';
import {
  CompleteRefundDto,
  CreatePaymentDto,
  CreateRefundDto,
  MockWebhookDto,
  PreviewSignatureDto,
  QueryPaymentsDto,
  QueryRefundsDto,
  RawWebhookLogDto,
  RejectRefundDto,
  SubmitProofDto,
} from './dto/payment.dto.js';
import { PaymentService } from './payment.service.js';

/**
 * Thanh toán (cổng giả lập) + hoàn tiền.
 *
 * Phân quyền:
 * - Khách: tạo phiên thanh toán cho booking của mình, gửi chứng từ chuyển khoản,
 *   xem giao dịch của mình (`GET /payments/me`, `GET /payments/booking/:id`).
 * - Nhân viên (`payment:read`): xem tất cả, duyệt/từ chối chứng từ, đối soát webhook.
 * - Nhân viên (`payment:refund`): tạo và xác nhận hoàn tiền.
 * - Cổng: `POST /payments/webhook` công khai nhưng **bắt buộc chữ ký HMAC**.
 */
@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  // ===== giả lập cổng =====

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'x-mock-signature',
    required: false,
    description: 'HMAC-SHA256(txnRef|gatewayTxnNo|amount|1|0) với PAYMENT_MOCK_SECRET. Hoặc gửi trong body.',
  })
  @ApiOperation({
    summary: 'IPN/return từ cổng thanh toán (giả lập)',
    description:
      'Idempotent theo (gateway, gatewayTxnNo, eventType). Tiền về muộn cho booking đã đóng → tự tạo yêu cầu hoàn.',
  })
  webhook(@Body() dto: MockWebhookDto, @Headers('x-mock-signature') signature?: string) {
    // Chữ ký có thể nằm ở header hoặc body – body được ưu tiên để tiện test bằng curl.
    const payload: MockWebhookDto = {
      gateway: dto.gateway,
      txnRef: dto.txnRef,
      gatewayTxnNo: dto.gatewayTxnNo,
      amount: dto.amount,
      eventType: dto.eventType,
      success: dto.success,
      responseCode: dto.responseCode,
      signature: dto.signature ?? signature,
    };
    return this.paymentService.handleWebhook(payload);
  }

  @Public()
  @Post('webhook/raw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ghi log một webhook không đọc được (payload rác / sai định dạng)',
    description: 'Chỉ để đối soát, không thay đổi bất kỳ giao dịch nào.',
  })
  rawWebhook(@Body() dto: RawWebhookLogDto) {
    return this.paymentService.logInvalidWebhook({
      gateway: dto.gateway,
      txnRef: dto.txnRef,
      reason: dto.reason ?? 'Payload không hợp lệ',
      rawPayload: dto.rawPayload,
    });
  }

  @Public()
  @Get('mock-gateway/pay/:txnRef')
  @ApiOperation({
    summary: 'Trang thanh toán giả lập – bấm vào là cổng "thu tiền" và gọi lại IPN',
    description: '`?outcome=success|failed` để giả lập thành công/thất bại. Trả về kết quả xử lý webhook.',
  })
  simulatePay(@Param('txnRef') txnRef: string, @Query('outcome') outcome?: string) {
    return this.paymentService.simulateGatewayPayment(txnRef, outcome === 'failed' ? 'failed' : 'success');
  }

  @Public()
  @Post('mock-gateway/signature')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sinh chữ ký mẫu để tự bắn webhook bằng Postman/Swagger',
    description: 'Body được validate bằng `PreviewSignatureDto`: thiếu `amount`/`success` trả 400.',
  })
  previewSignature(@Body() dto: PreviewSignatureDto) {
    return this.paymentService.buildSignaturePreview(dto);
  }

  // ===== khách =====

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Giao dịch của chính tôi' })
  listMine(@Query() query: QueryPaymentsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentService.listMine(query, user);
  }

  @ApiBearerAuth()
  @Get('booking/:bookingId')
  @ApiOperation({
    summary: 'Tổng hợp thanh toán + hoàn tiền của một booking',
    description: 'Khách chỉ xem được booking của mình; nhân viên có `payment:read` xem được tất cả.',
  })
  byBooking(@Param('bookingId', new ParseUUIDPipe()) bookingId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentService.getByBooking(bookingId, user);
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Tạo phiên thanh toán cho booking',
    description:
      'Số tiền luôn lấy từ `booking.total` ở server. OFFICE = thu ngay và chuyển booking sang chờ xác nhận.',
  })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentService.create(dto, user);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết giao dịch' })
  detail(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentService.getById(id, user);
  }

  @ApiBearerAuth()
  @Post(':id/proof')
  @ApiOperation({ summary: 'Khách gửi chứng từ chuyển khoản (PROOF_SUBMITTED)' })
  submitProof(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitProofDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentService.submitProof(id, dto, user);
  }

  // ===== nhân viên =====

  @ApiBearerAuth()
  @Get()
  @RequirePermissions('payment:read')
  @ApiOperation({ summary: 'Danh sách giao dịch (phân trang, lọc theo trạng thái/phương thức)' })
  list(@Query() query: QueryPaymentsDto) {
    return this.paymentService.paginate(query);
  }

  @ApiBearerAuth()
  @Get(':id/events')
  @RequirePermissions('payment:read')
  @ApiOperation({ summary: 'Nhật ký webhook của giao dịch (đối soát)' })
  events(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.paymentService.listEvents(id);
  }

  @ApiBearerAuth()
  @Patch(':id/proof/approve')
  @RequirePermissions('payment:read')
  @ApiOperation({ summary: 'Duyệt chứng từ chuyển khoản → ghi nhận thanh toán' })
  approveProof(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentService.approveProof(id, user);
  }

  @ApiBearerAuth()
  @Patch(':id/proof/reject')
  @RequirePermissions('payment:read')
  @ApiOperation({ summary: 'Từ chối chứng từ chuyển khoản' })
  rejectProof(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectRefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentService.rejectProof(id, dto.errorMessage, user);
  }

  // ===== hoàn tiền =====

  @ApiBearerAuth()
  @Get('refunds/list')
  @RequirePermissions('payment:read')
  @ApiOperation({ summary: 'Danh sách yêu cầu hoàn tiền' })
  listRefunds(@Query() query: QueryRefundsDto) {
    return this.paymentService.paginateRefunds(query);
  }

  @ApiBearerAuth()
  @Post('refunds')
  @RequirePermissions('payment:refund')
  @ApiOperation({
    summary: 'Tạo yêu cầu hoàn tiền',
    description: 'Bỏ trống `amount` = hoàn toàn bộ số còn lại của giao dịch. Không vượt quá `refundableAmount`.',
  })
  createRefund(@Body() dto: CreateRefundDto, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentService.createRefund(dto, user);
  }

  @ApiBearerAuth()
  @Patch('refunds/:refundId/complete')
  @RequirePermissions('payment:refund')
  @ApiOperation({ summary: 'Xác nhận đã chuyển tiền hoàn cho khách' })
  completeRefund(
    @Param('refundId', new ParseUUIDPipe()) refundId: string,
    @Body() dto: CompleteRefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentService.completeRefund(refundId, dto, user);
  }

  @ApiBearerAuth()
  @Patch('refunds/:refundId/reject')
  @RequirePermissions('payment:refund')
  @ApiOperation({ summary: 'Đánh dấu hoàn tiền thất bại (sai số tài khoản…)' })
  rejectRefund(
    @Param('refundId', new ParseUUIDPipe()) refundId: string,
    @Body() dto: RejectRefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentService.rejectRefund(refundId, dto.errorMessage, user);
  }
}
