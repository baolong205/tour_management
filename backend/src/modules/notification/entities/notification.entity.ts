import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { NotificationType } from '../../../common/enums/index.js';
import { jsonTransformer } from '../../../common/transformers/money.transformer.js';
import { User } from '../../users/entities/user.entity.js';

/** Dữ liệu kèm theo để FE deep-link (vd `{ bookingId: '...' }`). */
export type NotificationPayload = {
  bookingId?: string;
  paymentId?: string;
  scheduleId?: string;
  tourId?: string;
  [key: string]: unknown;
};

/**
 * `notifications` – thông báo in-app (đẩy qua Socket.IO) + lưu lịch sử.
 * Index `(user_id, read_at, created_at)` phục vụ truy vấn "thông báo chưa đọc mới nhất".
 *
 * Ghi chú MySQL: index composite không hỗ trợ `DESC` trên mọi phiên bản/engine,
 * nên khai báo index thường; MySQL 8 đọc ngược index vẫn hiệu quả (backward index scan).
 */
@Entity('notifications')
@Index('idx_notifications_user_read_created', ['userId', 'readAt', 'createdAt'])
export class Notification extends BaseEntity {
  @Column({ name: 'user_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @Column({ type: 'varchar', length: 50 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body?: string | null;

  @Column({ type: 'json', nullable: true, transformer: jsonTransformer })
  payload?: NotificationPayload | null;

  @Column({ name: 'read_at', type: 'datetime', precision: 3, nullable: true })
  readAt?: Date | null;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }

  markRead(at: Date = new Date()): void {
    this.readAt ??= at;
  }
}
