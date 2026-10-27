import { BeforeInsert, Column, Entity, Index } from 'typeorm';
import { uuidv4 } from '../../../common/entities/base.entity.js';
import { SoftDeletableEntity } from '../../../common/entities/soft-deletable.entity.js';
import { SupplierType } from '../../../common/enums/index.js';
import { jsonTransformer } from '../../../common/transformers/money.transformer.js';

/**
 * `suppliers` – nhà cung cấp (khách sạn, xe, hãng bay…).
 *
 * `type` phân biệt HOTEL/TRANSPORT. Trong `docs/schema.md` ghi "single-table inheritance";
 * ở đây khai báo một entity duy nhất + cột `type` và `meta json` cho thuộc tính riêng
 * của từng loại (hạng sao, loại xe, số chỗ…) – đơn giản hơn STI và không cần
 * discriminator của TypeORM, nhưng service vẫn có thể validate theo `type`.
 */
@Entity('suppliers')
@Index('idx_suppliers_type', ['type'])
@Index('idx_suppliers_active', ['active'])
export class Supplier extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 20 })
  type: SupplierType;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'contact_name', type: 'varchar', length: 150, nullable: true })
  contactName?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 191, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  /** Thuộc tính riêng theo loại: `{ stars: 4 }`, `{ seatCount: 45, plate: '29B-12345' }`… */
  @Column({ type: 'json', nullable: true, transformer: jsonTransformer })
  meta?: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }
}