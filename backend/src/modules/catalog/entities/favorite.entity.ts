import type { Relation } from 'typeorm';
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Tour } from './tour.entity.js';
import { User } from '../../users/entities/user.entity.js';

/**
 * `favorites` – tour yêu thích của khách hàng.
 *
 * Bảng nối thuần (không có cột id riêng) nhưng vẫn được khai báo là entity để có thể
 * `repository.insert()` / `delete()` trực tiếp mà không cần load quan hệ.
 * Khóa chính kép `(user_id, tour_id)` chống trùng.
 */
@Entity('favorites')
export class Favorite {
  @PrimaryColumn({ name: 'user_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  userId: string;

  @PrimaryColumn({ name: 'tour_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  tourId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @ManyToOne(() => Tour, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tour_id' })
  tour?: Relation<Tour>;
}
