/**
 * Sự kiện nghiệp vụ dùng để tách rời luồng chính khỏi tác vụ phụ.
 *
 * Vấn đề trước đây: `AuditLogService` và `NotificationService` tồn tại nhưng
 * **không nơi nào gọi**. Hệ quả là bảng `audit_logs` luôn rỗng (không có vết
 * kiểm toán khi booking bị huỷ/từ chối/hoàn tiền) và người dùng không bao giờ
 * nhận được thông báo khi đơn của họ đổi trạng thái.
 *
 * Cách sửa: module nghiệp vụ chỉ **phát sự kiện** (không biết gì về audit hay
 * notification), listener ở tầng hạ tầng ghi log + tạo thông báo. Nhờ vậy:
 * - Không tạo phụ thuộc vòng `Booking → System/Notification`.
 * - Lỗi khi ghi audit/notification không làm hỏng giao dịch nghiệp vụ.
 * - Thêm kênh mới (email, webhook, Socket.IO) chỉ cần thêm listener.
 *
 * Quy ước tên: `<domain>.<hành động>` – ví dụ `booking.confirmed`.
 */

/** Tên sự kiện, gom một chỗ để tránh gõ sai chuỗi rải rác. */
export const DomainEvents = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_REJECTED: 'booking.rejected',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_COMPLETED: 'booking.completed',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  REFUND_REQUESTED: 'refund.requested',
  REFUND_COMPLETED: 'refund.completed',
  REVIEW_CREATED: 'review.created',
} as const;

export type DomainEventName = (typeof DomainEvents)[keyof typeof DomainEvents];

/**
 * Payload chung của một sự kiện nghiệp vụ.
 *
 * `actorId` là người **thực hiện** hành động (nhân viên duyệt đơn, khách huỷ…),
 * còn `notifyUserIds` là những người cần nhận thông báo. Hai tập này thường
 * khác nhau: nhân viên huỷ đơn thì khách mới là người cần biết.
 */
export interface DomainEventPayload {
  /** Loại thực thể bị tác động, ví dụ `booking`, `payment`. */
  entityType: string;
  /** Id bản ghi bị tác động. */
  entityId: string;
  /** Người thực hiện (null nếu do hệ thống/cron). */
  actorId?: string | null;
  /** IP của người thực hiện, để ghi vào nhật ký. */
  ip?: string | null;
  /** Trạng thái trước/sau, phục vụ truy vết. */
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  /** Những user cần nhận thông báo in-app. */
  notifyUserIds?: string[];
  /** Tiêu đề thông báo. */
  title?: string;
  /** Nội dung thông báo. */
  body?: string | null;
  /** Loại thông báo (khớp enum `NotificationType`). */
  notificationType?: string;
  /** Dữ liệu đính kèm cho client (id đơn, mã tour…). */
  payload?: Record<string, unknown> | null;
}

/** Sự kiện cần ghi nhật ký kiểm toán. */
export class AuditEvent {
  constructor(
    /** Hành động dạng `booking.cancel`, khớp `audit_logs.action`. */
    public readonly action: string,
    public readonly data: DomainEventPayload,
  ) { }
}

/** Sự kiện cần gửi thông báo cho người dùng. */
export class NotifyEvent {
  constructor(
    public readonly name: DomainEventName,
    public readonly data: DomainEventPayload,
  ) { }
}