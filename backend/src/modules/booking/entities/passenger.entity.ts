import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { PassengerType } from '../../../common/enums/index.js';
import { moneyTransformer } from '../../../common/transformers/money.transformer.js';
import { Booking } from './booking.entity.js';

/**
 * `passengers` – hành khách trong booking (composition của `bookings`).
 * `type` được service suy ra từ `dob` so với `start_date` chứ không tin client gửi lên.
 */
@Entity('passengers')
@Index('idx_passengers_booking', ['bookingId'])
export class Passenger extends BaseEntity {
  @Column({ name: 'booking_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  bookingId: string;

  @ManyToOne(() => Booking, (b) => b.passengers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Relation<Booking>;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'date' })
  dob: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender?: string | null;

  /** CCCD / hộ chiếu. */
  @Column({ name: 'id_number', type: 'varchar', length: 30, nullable: true })
  idNumber?: string | null;

  @Column({ type: 'varchar', length: 10 })
  type: PassengerType;

  @Column({ name: 'unit_price', type: 'decimal', precision: 14, scale: 0, transformer: moneyTransformer })
  unitPrice: number;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}