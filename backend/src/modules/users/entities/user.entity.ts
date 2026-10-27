import type { Relation } from 'typeorm';
import { BeforeInsert, BeforeUpdate, Column, Entity, Index, JoinTable, ManyToMany, OneToMany, OneToOne } from 'typeorm';
import { uuidv4 } from '../../../common/entities/base.entity.js';
import { SoftDeletableEntity } from '../../../common/entities/soft-deletable.entity.js';
import { UserStatus } from '../../../common/enums/index.js';
import { AuthToken } from './auth-token.entity.js';
import { GuideProfile } from './guide-profile.entity.js';
import { Role } from './role.entity.js';

/**
 * `users`
 *
 * Khác biệt so với bản PostgreSQL trong `docs/schema.md`:
 * - `email citext` → `varchar(191)` + `COLLATE utf8mb4_unicode_ci`: collation của MySQL
 *   vốn không phân biệt hoa/thường nên `UQ(email)` đã đúng nghĩa "không phân biệt hoa thường".
 *   Độ dài 191 để index an toàn cả khi dùng `utf8mb4` với InnoDB cũ.
 * - `google_id varchar(64)` giữ nguyên.
 * - `password_hash` khai báo `select: false` ⇒ mọi query phải `.addSelect('user.passwordHash')`
 *   nếu cần so khớp mật khẩu, tránh rò rỉ hash ra response.
 */
@Entity('users')
@Index('uq_users_email', ['email'], { unique: true })
@Index('idx_users_status', ['status'])
@Index('uq_users_google_id', ['googleId'], { unique: true })
export class User extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 191 })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash?: string | null;

  @Column({ name: 'google_id', type: 'varchar', length: 64, nullable: true })
  googleId?: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl?: string | null;

  @Column({ type: 'varchar', length: 20, default: UserStatus.PENDING_VERIFY })
  status: UserStatus;

  @Column({ name: 'email_verified_at', type: 'datetime', precision: 3, nullable: true })
  emailVerifiedAt?: Date | null;

  @Column({ name: 'last_login_at', type: 'datetime', precision: 3, nullable: true })
  lastLoginAt?: Date | null;

  /** Số lần đăng nhập sai liên tiếp – reset về 0 khi đăng nhập thành công. */
  @Column({ name: 'failed_login_count', type: 'int', default: 0 })
  failedLoginCount: number;

  /** Khóa tạm thời khi vượt ngưỡng `login.max_failed` trong `system_settings`. */
  @Column({ name: 'locked_until', type: 'datetime', precision: 3, nullable: true })
  lockedUntil?: Date | null;

  // --- quan hệ ---
  @OneToMany(() => AuthToken, (t) => t.user)
  tokens?: Relation<AuthToken[]>;

  @OneToOne(() => GuideProfile, (g) => g.user)
  guideProfile?: Relation<GuideProfile> | null;

  /**
   * Quan hệ nhiều-nhiều với `Role` qua bảng nối `user_roles`.
   *
   * `@JoinTable` PHẢI khai báo ở phía này (owner side). Trước đây chỉ khai báo ở `Role`
   * khiến TypeORM không coi `User.roles` là quan hệ và ném
   * `EntityPropertyNotFoundError: Property "roles" was not found in "User"`.
   */
  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles?: Relation<Role[]>;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }

  @BeforeUpdate()
  protected normalizeEmail(): void {
    this.email = this.email.trim().toLowerCase();
  }

  /** True nếu tài khoản đang bị khóa tạm do đăng nhập sai nhiều lần. */
  isTemporarilyLocked(now: Date = new Date()): boolean {
    return this.lockedUntil != null && this.lockedUntil.getTime() > now.getTime();
  }
}
