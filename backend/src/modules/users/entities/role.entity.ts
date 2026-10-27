import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { User } from './user.entity.js';
import { Permission } from './permission.entity.js';

/**
 * `roles` – CUSTOMER / STAFF / GUIDE / ADMIN.
 *
 * Admin kế thừa quyền của Staff bằng cách **gán đủ permission ở seed**, không lưu
 * quan hệ kế thừa trong DB (giữ schema phẳng, dễ truy vấn).
 */
@Entity('roles')
@Index('uq_roles_name', ['name'], { unique: true })
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  /**
   * Bảng nối `user_roles`: user_id + role_id là khóa chính kép.
   * Phía **owner** là `User.roles` (khai báo `@JoinTable` ở đó), nên ở đây không lặp lại.
   */
  @ManyToMany(() => User, (u) => u.roles)
  users?: Relation<User[]>;

  /** Bảng nối `role_permissions`: role_id + permission_id là khóa chính kép. */
  @ManyToMany(() => Permission, (p) => p.roles, { cascade: ['insert', 'update'] })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions?: Relation<Permission[]>;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}
