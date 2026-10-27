import { BeforeInsert, BeforeUpdate, Column, Entity, Index } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { PromotionType } from '../../../common/enums/index.js';
import { moneyTransformer } from '../../../common/transformers/money.transformer.js';

/**
 * `promotions` – mã giảm giá.
 *
 * `value` khai báo `decimal(14,2)` (không phải `numeric(14,0)` như các cột tiền khác)
 * vì với `type = PERCENT`, `value` có thể là `12.5` (%). Vì vậy dùng
 * `decimalTransformer` thay vì `moneyTransformer`? Không – `moneyTransformer` chỉ ép
 * string → number, vẫn giữ đủ phần thập phân, nên dùng lại được.
 *
 * Kiểm tra nghiệp vụ ở service (không dùng `@Check` vì TypeORM không sinh CHECK trên MySQL):
 * - `valid_to > valid_from`
 * - `used_count <= usage_limit` khi `usage_limit` khác null
 * - nếu `type = PERCENT` thì `value <= 100`
 */
@Entity('promotions')
@Index('uq_promotions_code', ['code'], { unique: true })
@Index('idx_promotions_validity', ['active', 'validFrom', 'validTo'])
export class Promotion extends BaseEntity {
  /** Luôn lưu chữ IN HOA để so khớp không phân biệt hoa/thường. */
  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({ type: 'varchar', length: 20 })
  type: PromotionType;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: moneyTransformer })
  value: number;

  /** Trần giảm khi `type = PERCENT`. */
  @Column({ name: 'max_discount', type: 'decimal', precision: 14, scale: 0, nullable: true, transformer: moneyTransformer })
  maxDiscount?: number | null;

  @Column({ name: 'min_order', type: 'decimal', precision: 14, scale: 0, default: 0, transformer: moneyTransformer })
  minOrder: number;

  /** null = không giới hạn. */
  @Column({ name: 'usage_limit', type: 'int', unsigned: true, nullable: true })
  usageLimit?: number | null;

  @Column({ name: 'used_count', type: 'int', unsigned: true, default: 0 })
  usedCount: number;

  @Column({ name: 'per_user_limit', type: 'int', unsigned: true, default: 1 })
  perUserLimit: number;

  @Column({ name: 'valid_from', type: 'datetime', precision: 3 })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'datetime', precision: 3 })
  validTo: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @BeforeInsert()
  @BeforeUpdate()
  protected normalize(): void {
    this.id ??= uuidv4();
    this.code = this.code.trim().toUpperCase();
  }

  /**
   * Tính số tiền được giảm cho một đơn hàng.
   * Trả 0 nếu mã không đủ điều kiện (service vẫn nên báo lỗi cụ thể cho người dùng).
   */
  calculateDiscount(subtotal: number, now: Date = new Date()): number {
    if (!this.isUsable(subtotal, now)) return 0;

    let discount =
      this.type === PromotionType.PERCENT
        ? Math.round((subtotal * this.value) / 100)
        : Math.round(this.value);

    if (this.maxDiscount != null) discount = Math.min(discount, this.maxDiscount);
    return Math.min(discount, subtotal);
  }

  isUsable(subtotal: number, now: Date = new Date()): boolean {
    const outOfQuota = this.usageLimit != null && this.usedCount >= this.usageLimit;
    return (
      this.active &&
      !outOfQuota &&
      subtotal >= this.minOrder &&
      now >= this.validFrom &&
      now <= this.validTo
    );
  }
}