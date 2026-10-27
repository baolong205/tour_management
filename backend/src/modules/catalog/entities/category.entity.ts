import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, ManyToMany } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { Tour } from './tour.entity.js';

/** `categories` – danh mục tour (Biển, Núi, Nghỉ dưỡng…). */
@Entity('categories')
@Index('uq_categories_slug', ['slug'], { unique: true })
export class Category extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 120 })
  slug: string;

  @ManyToMany(() => Tour, (t) => t.categories)
  tours?: Relation<Tour[]>;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}
