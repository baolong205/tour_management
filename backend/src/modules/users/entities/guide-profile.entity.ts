import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { GuideStatus } from '../../../common/enums/index.js';
import { stringArrayTransformer } from '../../../common/transformers/money.transformer.js';
import { User } from './user.entity.js';

/**
 * `guide_profiles` – hồ sơ hướng dẫn viên, gắn 1-1 với `users`.
 *
 * `languages` / `certificates` vốn là `text[]` (PostgreSQL); trên MySQL lưu `json`
 * với transformer để code vẫn làm việc bằng `string[]`.
 */
@Entity('guide_profiles')
@Index('uq_guide_profiles_user', ['userId'], { unique: true })
@Index('idx_guide_profiles_status', ['status'])
export class GuideProfile extends BaseEntity {
  @Column({ name: 'user_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  userId: string;

  @OneToOne(() => User, (u) => u.guideProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @Column({
    type: 'json',
    default: () => "('[]')",
    transformer: stringArrayTransformer,
  })
  languages: string[];

  @Column({
    type: 'json',
    default: () => "('[]')",
    transformer: stringArrayTransformer,
  })
  certificates: string[];

  @Column({ name: 'experience_years', type: 'int', default: 0 })
  experienceYears: number;

  @Column({ type: 'varchar', length: 20, default: GuideStatus.ACTIVE })
  status: GuideStatus;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}
