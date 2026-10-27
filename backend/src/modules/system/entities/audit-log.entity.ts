import type { Relation } from 'typeorm';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { jsonTransformer } from '../../../common/transformers/money.transformer.js';
import { User } from '../../users/entities/user.entity.js';

/**
 * `audit_logs` – nhật ký thao tác quản trị (append-only).
 *
 * Khác `schema.md`: khóa chính dùng `bigint` tự tăng (thay vì uuid/bigint identity).
 * `bigint` trả về dạng string ở một số driver; với bảng log ghi rất nhiều bản ghi
 * thì dùng `char(36)` là lãng phí, nên giữ `bigint` và xử lý ở tầng đọc khi cần so sánh.
 */
@Entity('audit_logs')
@Index('idx_audit_logs_actor', ['actorId'])
@Index('idx_audit_logs_entity', ['entityType', 'entityId'])
@Index('idx_audit_logs_created', ['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'actor_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  actorId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor?: Relation<User> | null;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 64 })
  entityId: string;

  @Column({ type: 'json', nullable: true, transformer: jsonTransformer })
  before?: Record<string, unknown> | null;

  @Column({ type: 'json', nullable: true, transformer: jsonTransformer })
  after?: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string | null;

  @Column({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
