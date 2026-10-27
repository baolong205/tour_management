import type { PaymentMethod, PaymentStatus, RefundReason, RefundStatus } from '../../../common/enums/index.js';

/** Giao dịch thanh toán trả về cho client. */
export interface PaymentView {
  id: string;
  bookingId: string;
  bookingCode: string | null;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  gateway: string | null;
  gatewayTxnRef: string | null;
  gatewayTxnNo: string | null;
  /** URL thanh toán giả lập (chỉ có với cổng online, trước khi thanh toán). */
  paymentUrl: string | null;
  proofUrl: string | null;
  proofNote: string | null;
  refundedAmount: number;
  /** Số tiền còn có thể hoàn. */
  refundableAmount: number;
  reviewedBy: string | null;
  paidAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundView {
  id: string;
  paymentId: string;
  cancelRequestId: string | null;
  amount: number;
  status: RefundStatus;
  reason: RefundReason;
  gatewayRef: string | null;
  isManual: boolean;
  processedBy: string | null;
  refundedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}

/** Kết quả xử lý webhook – đủ thông tin để handler trả đúng mã cho cổng. */
export interface WebhookOutcome {
  result: string;
  message: string;
  paymentId: string | null;
}

/** Payment của một booking, gộp thành cục cho trang chi tiết đơn. */
export interface BookingPaymentsView {
  bookingId: string;
  bookingCode: string;
  bookingStatus: string;
  total: number;
  paidTotal: number;
  refundedTotal: number;
  outstanding: number;
  payments: PaymentView[];
  refunds: RefundView[];
}
