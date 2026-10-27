/**
 * Kiểu trả về của module booking.
 *
 * Tách khỏi entity để controller không lộ cấu trúc DB và để module khác (payment,
 * review, notification) import được mà không kéo theo service.
 */

export interface PassengerView {
  id: string;
  fullName: string;
  dob: string;
  gender: string | null;
  idNumber: string | null;
  type: string;
  unitPrice: number;
}

export interface CancelRequestView {
  id: string;
  reason: string;
  status: string;
  feePercent: number;
  feeAmount: number;
  refundAmount: number;
  policySnapshot: {
    policyId: string;
    policyName: string;
    rules: { daysBefore: number; feePercent: number }[];
    startDate: string;
  };
  requestedBy: string | null;
  processedBy: string | null;
  processedAt: Date | null;
  rejectReason: string | null;
  createdAt: Date;
}

export interface InvoiceView {
  id: string;
  number: string;
  issuedAt: Date;
  pdfUrl: string | null;
  snapshot: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    tourName: string;
    startDate: string;
    lines: { description: string; quantity: number; unitPrice: number; amount: number }[];
    subtotal: number;
    discount: number;
    total: number;
  };
}

/** Booking dạng danh sách – danh sách không kèm passengers/invoice để nhẹ payload. */
export interface BookingSummaryView {
  id: string;
  code: string;
  status: string;
  channel: string;
  scheduleId: string;
  tourId: string;
  tourName: string;
  startDate: string;
  endDate: string;
  customerId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  seatCount: number;
  passengerCount: number;
  subtotal: number;
  discount: number;
  total: number;
  promotionCode: string | null;
  expiresAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
}

export interface BookingDetailView extends BookingSummaryView {
  note: string | null;
  createdBy: string | null;
  confirmedBy: string | null;
  statusBeforeCancel: string | null;
  passengers: PassengerView[];
  cancelRequests: CancelRequestView[];
  invoice: InvoiceView | null;
  updatedAt: Date;
}

/** Báo giá trước khi đặt – FE hiển thị để khách thấy giá được tính ở server. */
export interface BookingQuoteLine {
  type: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface BookingQuote {
  scheduleId: string;
  tourId: string;
  tourName: string;
  startDate: string;
  lines: BookingQuoteLine[];
  seatCount: number;
  subtotal: number;
  discount: number;
  total: number;
  promotionCode: string | null;
  availableSeats: number;
  canBook: boolean;
}
