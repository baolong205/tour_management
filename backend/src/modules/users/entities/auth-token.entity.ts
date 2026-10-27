import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { TokenType } from '../../../common/enums/index.js';
import { User } from './user.entity.js';

/**
 * `auth_tokens` – refresh token / token reset mật khẩu / token xác thực email.
 *
 * Chỉ lưu **hash SHA-256** của token (không lưu plaintext). Job `cleanup-tokens`
 * xóa các bản ghi quá `expires_at`.
 */
@Entity('auth_tokens')
@Index('idx_auth_tokens_user', ['userId'])
@Index('idx_auth_tokens_expires', ['expiresAt'])
@Index('uq_auth_tokens_hash', ['tokenHash'], { unique: true })
export class AuthToken extends BaseEntity {
  @Column({ name: 'user_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  userId: string;

  @ManyToOne(() => User, (u) => u.tokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @Column({ type: 'varchar', length: 20 })
  type: TokenType;

  @Column({ name: 'token_hash', type: 'varchar', length: 128 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'datetime', precision: 3 })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'datetime', precision: 3, nullable: true })
  revokedAt?: Date | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;

  /** MySQL 8 khuyến nghị `varchar(45)` cho địa chỉ IP (IPv6). */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string | null;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }

  isUsable(now: Date = new Date()): boolean {
    return this.revokedAt == null && this.expiresAt.getTime() > now.getTime();
  }
}
