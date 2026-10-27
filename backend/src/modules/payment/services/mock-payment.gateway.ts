import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  GatewayInitResult,
  GatewayVerifyResult,
  GatewayWebhookPayload,
  PaymentGateway,
} from './payment-gateway.interface.js';

// Re-export để code cũ import từ file này vẫn chạy.
export type { GatewayInitResult, GatewayVerifyResult, GatewayWebhookPayload };

/**
 * Cổng thanh toán **giả lập**.
 *
 * Thay cho VNPay/MoMo thật nhưng giữ đúng "hợp đồng" để sau này thay adapter:
 *
 * 1. `initTransaction` – sinh `txn_ref` (`PAY26000001`) + URL thanh toán giả.
 *    URL trỏ về chính backend (`/mock-gateway/pay/:txnRef?...`) để FE bấm vào là
 *    "thanh toán" được ngay trong môi trường dev.
 * 2. `verifySignature` – HMAC-SHA256 trên `txnRef|gatewayTxnNo|amount|success`
 *    với khóa `PAYMENT_MOCK_SECRET` (mặc định `mock-secret`). Đây là phần mô phỏng
 *    `vnp_SecureHash` của VNPay: chữ ký sai ⇒ payment_events.INVALID, không đổi trạng thái.
 * 3. `buildSignature` – helper cho FE/Postman ký khi tự bắn webhook.
 *
 * Đổi sang cổng thật: chỉ cần viết class khác cùng interface, đổi provider trong
 * `PaymentModule` – `PaymentService` không đổi.
 */
@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  private readonly logger = new Logger(MockPaymentGateway.name);
  private readonly secret: string;
  private readonly paymentTtlMinutes: number;

  constructor(private readonly config: ConfigService) {
    this.secret = this.config.get<string>('PAYMENT_MOCK_SECRET') ?? 'mock-secret';
    this.paymentTtlMinutes = Number(this.config.get<string>('PAYMENT_TTL_MINUTES') ?? 15);
  }

  /** Sinh URL thanh toán giả lập – trỏ về endpoint `GET /payments/mock-gateway/pay/:txnRef`. */
  initTransaction(input: {
    gateway: string;
    txnRef: string;
    amount: number;
    returnUrl?: string;
  }): GatewayInitResult {
    const expiresAt = new Date(Date.now() + this.paymentTtlMinutes * 60_000);
    const base = this.config.get<string>('APP_PUBLIC_URL') ?? 'http://localhost:3000';
    const params = new URLSearchParams({
      gateway: input.gateway,
      amount: String(input.amount),
      expires: expiresAt.toISOString(),
    });
    if (input.returnUrl) params.set('returnUrl', input.returnUrl);

    const paymentUrl = `${base.replace(/\/$/, '')}/mock-gateway/pay/${input.txnRef}?${params.toString()}`;
    this.logger.log(`[mock] khởi tạo giao dịch ${input.txnRef} – ${input.amount}đ qua ${input.gateway}`);

    return { gatewayTxnRef: input.txnRef, paymentUrl, expiresAt };
  }

  /** Sinh chữ ký – dùng cho endpoint tiện ích để thử webhook từ Swagger/Postman. */
  buildSignature(payload: {
    txnRef: string;
    gatewayTxnNo: string;
    amount: number;
    success: boolean;
  }): string {
    return createHmac('sha256', this.secret)
      .update(this.signingData(payload.txnRef, payload.gatewayTxnNo, payload.amount, payload.success))
      .digest('hex');
  }

  /** So sánh chữ ký theo kiểu an toàn thời gian (chống timing attack). */
  verifySignature(payload: GatewayWebhookPayload): GatewayVerifyResult {
    if (!payload.signature) return { valid: false };

    const expected = this.buildSignature(payload);
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(payload.signature.trim().toLowerCase(), 'utf8');
    if (a.length !== b.length) return { valid: false };

    return { valid: timingSafeEqual(a, b) };
  }

  private signingData(txnRef: string, gatewayTxnNo: string, amount: number, success: boolean): string {
    return `${txnRef}|${gatewayTxnNo}|${amount}|${success ? '1' : '0'}`;
  }
}
