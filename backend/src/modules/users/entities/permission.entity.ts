import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, ManyToMany } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { Role } from './role.entity.js';

/**
 * `permissions` – mã quyền dạng `resource:action`, vd `booking:confirm`, `tour:write`.
 * Guard sẽ so khớp chuỗi này với danh sách quyền của user.
 */
@Entity('permissions')
@Index('uq_permissions_code', ['code'], { unique: true })
export class Permission extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @ManyToMany(() => Role, (r) => r.permissions)
  roles?: Relation<Role[]>;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}
