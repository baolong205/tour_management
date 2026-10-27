import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { NotificationType } from '../../common/enums/index.js';
import type { CreateNotificationDto, QueryNotificationsDto } from './dto/notification.dto.js';
import { Notification, type NotificationPayload } from './entities/notification.entity.js';
import type { NotificationView, UnreadCountView } from './types/notification.types.js';

/** Tham số tạo thông báo khi gọi nội bộ từ module khác (không qua DTO). */
export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  payload?: NotificationPayload | null;
}

/**
 * Thông báo in-app.
 *
 * Lưu lịch sử vào bảng `notifications`; việc đẩy realtime (Socket.IO) nếu có sẽ do
 * tầng gateway đảm nhiệm – service này chỉ chịu trách nhiệm ghi/đọc dữ liệu.
 * Các module khác gọi `create()` để phát thông báo cho người dùng.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(@InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>) { }

  // ===== ghi =====

  /** Tạo một thông báo. Dùng nội bộ từ booking / payment / operations. */
  async create(input: CreateNotificationInput): Promise<NotificationView> {
    const notification = await this.notificationRepo.save(
      this.notificationRepo.create({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        payload: input.payload ?? null,
      }),
    );
    return this.toView(notification);
  }

  /** Tạo từ DTO (endpoint admin). */
  async createFromDto(dto: CreateNotificationDto): Promise<NotificationView> {
    return this.create({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body ?? null,
      payload: (dto.payload as NotificationPayload | undefined) ?? null,
    });
  }

  /** Tạo nhiều thông báo cùng lúc (vd thông báo hệ thống cho nhiều người). */
  async createMany(inputs: CreateNotificationInput[]): Promise<number> {
    if (inputs.length === 0) return 0;
    const rows = inputs.map((input) =>
      this.notificationRepo.create({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        payload: input.payload ?? null,
      }),
    );
    const saved = await this.notificationRepo.save(rows);
    return saved.length;
  }

  // ===== truy vấn =====

  /** Danh sách thông báo của một người (mới nhất trước). */
  async listMine(userId: string, query: QueryNotificationsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.notificationRepo
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (query.unreadOnly) qb.andWhere('notification.readAt IS NULL');
    if (query.type) qb.andWhere('notification.type = :type', { type: query.type });

    qb.orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [notifications, total] = await qb.getManyAndCount();
    return { items: notifications.map((notification) => this.toView(notification)), total, page, limit };
  }

  /** Số thông báo chưa đọc – dùng cho badge. */
  async unreadCount(userId: string): Promise<UnreadCountView> {
    const unread = await this.notificationRepo
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.readAt IS NULL')
      .getCount();
    return { unread };
  }

  // ===== cập nhật =====

  /** Đánh dấu một thông báo đã đọc (chỉ chủ sở hữu). */
  async markRead(id: string, userId: string): Promise<NotificationView> {
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Không tìm thấy thông báo');
    if (notification.userId !== userId) throw new NotFoundException('Không tìm thấy thông báo');

    notification.markRead();
    await this.notificationRepo.save(notification);
    return this.toView(notification);
  }

  /** Đánh dấu tất cả thông báo chưa đọc của người dùng là đã đọc. */
  async markAllRead(userId: string): Promise<UnreadCountView> {
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: () => 'CURRENT_TIMESTAMP(3)' })
      .where('user_id = :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();

    this.logger.log(`Đánh dấu đã đọc toàn bộ thông báo của người dùng ${userId}`);
    return this.unreadCount(userId);
  }

  // ===== nội bộ =====

  private toView(notification: Notification): NotificationView {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body ?? null,
      payload: notification.payload ?? null,
      readAt: notification.readAt ?? null,
      isRead: notification.readAt !== null && notification.readAt !== undefined,
      createdAt: notification.createdAt,
    };
  }
}