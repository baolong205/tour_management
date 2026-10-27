import type { NotificationType } from '../../../common/enums/index.js';
import type { NotificationPayload } from '../entities/notification.entity.js';

/** Bản hiển thị của thông báo trả về cho client. */
export interface NotificationView {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  payload: NotificationPayload | null;
  readAt: Date | null;
  isRead: boolean;
  createdAt: Date;
}

/** Số thông báo chưa đọc – dùng cho badge trên thanh điều hướng. */
export interface UnreadCountView {
  unread: number;
}