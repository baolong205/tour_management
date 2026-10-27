import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { decimalTransformer } from '../../../common/transformers/money.transformer.js';
import { TourDestination } from './tour-destination.entity.js';

/** `destinations` – điểm đến, có toạ độ để vẽ bản đồ. */
@Entity('destinations')
@Index('uq_destinations_slug', ['slug'], { unique: true })
export class Destination extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 170 })
  slug: string;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  latitude?: number | null;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  longitude?: number | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @OneToMany(() => TourDestination, (td) => td.destination)
  tourLinks?: Relation<TourDestination[]>;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}
