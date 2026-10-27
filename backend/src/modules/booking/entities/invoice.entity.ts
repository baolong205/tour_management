import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { jsonTransformer } from '../../../common/transformers/money.transformer.js';
import { Booking } from './booking.entity.js';

export type InvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

/** Dữ liệu chụp tại thời điểm xuất hóa đơn – không đổi dù khách sửa thông tin sau. */
export type InvoiceSnapshot = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tourName: string;
  startDate: string;
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  total: number;
};

/**
 * `invoices` – hóa đơn, 1-1 với booking.
 * `number` sinh từ sequence `invoice_seq` (tạo trong migration) để không trùng khi
 * nhiều request xuất hóa đơn đồng thời.
 */
@Entity('invoices')
@Index('uq_invoices_booking', ['bookingId'], { unique: true })
@Index('uq_invoices_number', ['number'], { unique: true })
export class Invoice extends BaseEntity {
  @Column({ name: 'booking_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  bookingId: string;

  @OneToOne(() => Booking, (b) => b.invoice, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Relation<Booking>;

  @Column({ type: 'varchar', length: 30 })
  number: string;

  @Column({ name: 'issued_at', type: 'datetime', precision: 3 })
  issuedAt: Date;

  @Column({ name: 'pdf_url', type: 'text', nullable: true })
  pdfUrl?: string | null;

  @Column({ type: 'json', transformer: jsonTransformer })
  snapshot: InvoiceSnapshot;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}