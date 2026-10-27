import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditEvent, NotifyEvent } from '../../common/events/domain-events.js';
import {
  NotificationService,
  type CreateNotificationInput,
} from '../notification/notification.service.js';
import { AuditLogService } from './audit-log.service.js';

/**
 * Cầu nối giữa sự kiện nghiệp vụ và hai bảng `audit_logs` / `notifications`.
 *
 * Nguyên tắc: listener **không bao giờ ném lỗi**. Nếu ghi nhật ký hay tạo thông
 * báo thất bại (DB chậm, mất kết nối), nghiệp vụ chính (đã commit) vẫn phải
 * thành công – người dùng không nên thấy lỗi chỉ vì bước phụ hỏng. Mọi lỗi chỉ
 * được log lại kèm ngữ cảnh để xử lý sau.
 *
 * `suppressErrors` mặc định của `@nestjs/event-emitter` là `true` cho listener
 * async, nhưng ở đây bắt tường minh để log có ngữ cảnh thay vì nuốt im lặng.
 */
@Injectable()
export class DomainEventListener {
  private readonly logger = new Logger(DomainEventListener.name);

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly notificationService: NotificationService,
  ) { }

  /** Ghi một dòng `audit_logs` cho hành động nghiệp vụ. */
  @OnEvent('audit', { async: true })
  async handleAudit(event: AuditEvent): Promise<void> {
    try {
      await this.auditLogService.write({
        actorId: event.data.actorId ?? null,
        action: event.action,
        entityType: event.data.entityType,
        entityId: event.data.entityId,
        before: event.data.before ?? null,
        after: event.data.after ?? null,
        ip: event.data.ip ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Không ghi được nhật ký "${event.action}" cho ${event.data.entityType}#${event.data.entityId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Tạo thông báo in-app cho những người liên quan.
   *
   * Bỏ qua khi không có người nhận hoặc thiếu tiêu đề: đó là sự kiện chỉ cần
   * audit, không cần làm phiền người dùng.
   */
  @OnEvent('notify', { async: true })
  async handleNotify(event: NotifyEvent): Promise<void> {
    const recipients = event.data.notifyUserIds ?? [];
    if (recipients.length === 0) return;
    if (!event.data.title) {
      this.logger.warn(`Sự kiện "${event.name}" thiếu tiêu đề thông báo, bỏ qua`);
      return;
    }

    const title = event.data.title;

    try {
      await this.notificationService.createMany(
        recipients.map((userId) => ({
          userId,
          type: (event.data.notificationType ?? 'SYSTEM') as CreateNotificationInput['type'],
          title,
          body: event.data.body ?? null,
          payload: (event.data.payload as CreateNotificationInput['payload']) ?? null,
        })),
      );
      this.logger.debug(
        `Đã gửi "${event.data.title}" tới ${recipients.length} người (sự kiện ${event.name})`,
      );
    } catch (error) {
      this.logger.error(
        `Không gửi được thông báo cho sự kiện "${event.name}": ${(error as Error).message}`,
      );
    }
  }
}