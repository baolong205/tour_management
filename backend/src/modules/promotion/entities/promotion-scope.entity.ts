import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { PromotionScopeType } from '../../../common/enums/index.js';
import type { Promotion } from './promotion.entity.js';

/**
 * `promotion_scopes` – mã áp cho phạm vi nào.
 *
 * Một mã có **nhiều** dòng phạm vi (vd: áp cho 3 tour cụ thể). Không có dòng nào
 * nghĩa là mã áp toàn hệ thống – đây là hành vi mặc định của dữ liệu cũ nên
 * không cần backfill.
 *
 * `scope_id` cố ý **không** khai báo FK: nó trỏ tới 4 bảng khác nhau tuỳ
 * `scope_type` (tours / categories / destinations / departure_schedules) nên
 * MySQL không tạo được FK đa hình. Ràng buộc "id có tồn tại" được kiểm ở
 * `PromotionService.replaceScopes()` trước khi ghi.
 */
@Entity('promotion_scopes')
@Index('uq_promotion_scopes', ['promotionId', 'scopeType', 'scopeId'], { unique: true })
@Index('idx_promotion_scopes_target', ['scopeType', 'scopeId'])
export class PromotionScope extends BaseEntity {
  @Column({ name: 'promotion_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  promotionId: string;

  // Dùng chuỗi 'Promotion' + import type để tránh circular dependency (TDZ lúc runtime)
  @ManyToOne('Promotion', (promotion: any) => promotion.scopes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id', foreignKeyConstraintName: 'fk_promotion_scopes_promotion' })
  promotion?: Relation<Promotion>;

  @Column({ name: 'scope_type', type: 'varchar', length: 20 })
  scopeType: PromotionScopeType;

  @Column({ name: 'scope_id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  scopeId: string;

  @BeforeInsert()
  protected assignId(): void {
    this.id ??= uuidv4();
  }
}
