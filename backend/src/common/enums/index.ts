/**
 * Giá trị enum lưu trong DB (dạng varchar) cho toàn bộ hệ thống.
 * Cột DB vẫn là `varchar` (xem các entity) nên thêm/đổi giá trị chỉ cần deploy code,
 * không phải ALTER TABLE như enum native của MySQL.
 *
 * Quy ước đặt tên: tên enum theo **thực thể** (`BookingStatus`), giá trị dùng
 * SCREAMING_SNAKE_CASE trùng với chuỗi lưu trong DB.
 */

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  PENDING_VERIFY = 'PENDING_VERIFY',
}

/** Vai trò mặc định của hệ thống (tên lưu trong bảng `roles.name`). */
export enum RoleName {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  GUIDE = 'GUIDE',
  ADMIN = 'ADMIN',
}

export enum TokenType {
  REFRESH = 'REFRESH',
  RESET_PASSWORD = 'RESET_PASSWORD',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
}

export enum GuideStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum TourStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  HIDDEN = 'HIDDEN',
}

export enum ScheduleStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  FULL = 'FULL',
  CLOSED = 'CLOSED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum BookingChannel {
  ONLINE = 'ONLINE',
  COUNTER = 'COUNTER',
}

export enum BookingStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  CANCEL_REQUESTED = 'CANCEL_REQUESTED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  COMPLETED = 'COMPLETED',
}

export enum PassengerType {
  ADULT = 'ADULT',
  CHILD = 'CHILD',
  INFANT = 'INFANT',
}

export enum PaymentMethod {
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OFFICE = 'OFFICE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROOF_SUBMITTED = 'PROOF_SUBMITTED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REFUNDED = 'REFUNDED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

/** Lý do tạo yêu cầu hoàn tiền. */
export enum RefundReason {
  CANCEL = 'CANCEL',
  REJECTED = 'REJECTED',
  SCHEDULE_CANCELLED = 'SCHEDULE_CANCELLED',
  LATE_PAYMENT = 'LATE_PAYMENT',
}

export enum CancelRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  VISIBLE = 'VISIBLE',
  HIDDEN = 'HIDDEN',
}

export enum PromotionType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
}

export enum SupplierType {
  HOTEL = 'HOTEL',
  TRANSPORT = 'TRANSPORT',
}

/** Loại nguồn lực được phân bổ cho một lịch khởi hành. */
export enum ResourceType {
  HOTEL = 'HOTEL',
  BUS = 'BUS',
  FLIGHT = 'FLIGHT',
  TRAIN = 'TRAIN',
  BOAT = 'BOAT',
  OTHER = 'OTHER',
}

export enum AssignmentStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

/** Kết quả xử lý webhook/IPN của cổng thanh toán. */
export enum WebhookEventType {
  IPN = 'IPN',
  RETURN = 'RETURN',
  QUERY = 'QUERY',
}

export enum WebhookResult {
  PROCESSED = 'PROCESSED',
  IGNORED = 'IGNORED',
  INVALID = 'INVALID',
  LATE = 'LATE',
}

/** Loại thông báo gửi cho người dùng. */
export enum NotificationType {
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_REJECTED = 'BOOKING_REJECTED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  /** Chuyến đi đã kết thúc, booking chuyển `COMPLETED` – mời khách để lại đánh giá. */
  BOOKING_COMPLETED = 'BOOKING_COMPLETED',
  PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  GUIDE_ASSIGNED = 'GUIDE_ASSIGNED',
  GUIDE_REVOKED = 'GUIDE_REVOKED',
  DEPARTURE_REMINDER = 'DEPARTURE_REMINDER',
  CANCEL_REQUESTED = 'CANCEL_REQUESTED',
  REVIEW_REPLIED = 'REVIEW_REPLIED',
  /** Đánh giá được duyệt và hiển thị công khai. */
  REVIEW_APPROVED = 'REVIEW_APPROVED',
  /** Đánh giá bị ẩn do vi phạm tiêu chuẩn. */
  REVIEW_HIDDEN = 'REVIEW_HIDDEN',
  SYSTEM = 'SYSTEM',
}
