import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { uuidv4 } from '../../../common/entities/base.entity.js';
import { Destination } from './destination.entity.js';
import { Tour } from './tour.entity.js';

/**
 * `tour_destinations` – quan hệ tour ↔ điểm đến **có thứ tự** (`sort_order`).
 *
 * Vì có cột phụ nên không thể dùng `@ManyToMany` thuần; entity nối này vừa là bảng
 * nối vừa mang dữ liệu. Khóa chính kép `(tour_id, destination_id)` chống trùng.
 */
@Entity('tour_destinations')
@Index('idx_tour_destinations_destination', ['destinationId'])
export class TourDestination {
  @PrimaryColumn({ name: 'tour_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  tourId: string;

  @PrimaryColumn({
    name: 'destination_id',
    type: 'char',
    length: 36,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  destinationId: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Tour, (t) => t.destinations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tour_id' })
  tour?: Relation<Tour>;

  @ManyToOne(() => Destination, (d) => d.tourLinks, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'destination_id' })
  destination?: Relation<Destination>;

  @BeforeInsert()
  protected ensureId(): void {
    // Bảng nối không có id riêng; hook giữ chỗ để tránh nhầm khi copy pattern.
    void uuidv4;
  }
}
