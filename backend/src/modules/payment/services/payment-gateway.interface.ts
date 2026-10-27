/**
 * Hợp đồng chung cho mọi cổng thanh toán (giả lập hoặc thật).
 *
 * `PaymentService` chỉ phụ thuộc interface này (qua token `PAYMENT_GATEWAY`),
 * không biết cụ thể là VNPay / MoMo / mock. Nhờ vậy đổi cổng thật chỉ cần:
 *
 * 1. Viết class mới `implements PaymentGateway`.
 * 2. Đổi `useClass` của provider `PAYMENT_GATEWAY` trong `PaymentModule`.
 *
 * Không đụng tới `PaymentService`.
 */

/** Kết quả "khởi tạo giao dịch" phía cổng. */
export interface GatewayInitResult {
  gatewayTxnRef: string;
  paymentUrl: string;
  expiresAt: Date;
}

/** Dữ liệu cổng gửi về (đã bóc từ header/body). */
export interface GatewayWebhookPayload {
  gateway: string;
  txnRef: string;
  gatewayTxnNo: string;
  amount: number;
  success: boolean;
  responseCode: string;
  signature: string | null;
}

export interface GatewayVerifyResult {
  valid: boolean;
}

export interface PaymentGateway {
  /** Sinh URL thanh toán để chuyển khách sang cổng. */
  initTransaction(input: {
    gateway: string;
    txnRef: string;
    amount: number;
    returnUrl?: string;
  }): GatewayInitResult;

  /** Ký dữ liệu webhook – dùng cho endpoint tiện ích khi thử nghiệm. */
  buildSignature(payload: {
    txnRef: string;
    gatewayTxnNo: string;
    amount: number;
    success: boolean;
  }): string;

  /** Xác thực chữ ký cổng gửi về. */
  verifySignature(payload: GatewayWebhookPayload): GatewayVerifyResult;
}

/** Token DI cho cổng thanh toán – dùng ở `PaymentService` và `PaymentModule`. */
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');