import type { Relation } from 'typeorm';
import { BeforeInsert, Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';
import { CancelPolicyRule } from './cancel-policy-rule.entity.js';

export type CancellationFeeResult = {
  feePercent: number;
  fee: number;
  refund: number;
  /** `days_before` của rule được áp dụng; null nếu không rule nào khớp (miễn phí). */
  matchedDaysBefore: number | null;
};

const MS_PER_DAY = 86_400_000;

/**
 * `cancel_policies` – chính sách hủy tour, gồm nhiều mốc `cancel_policy_rules`.
 *
 * Quy tắc tính phí: chọn rule có `days_before` lớn nhất mà ≤ số ngày còn lại tới
 * `start_date`; không rule nào khớp ⇒ phí 0%.
 *
 * Hai lưu ý quan trọng (khác bản PostgreSQL trong `docs/schema.md`):
 * 1. **Múi giờ**: `start_date` là date (00:00 giờ VN). Phải quy `requestedAt` về đầu
 *    ngày theo `timeZone` trước khi trừ, nếu không sẽ lệch 1 ngày với các yêu cầu
 *    gửi lúc 00:00–06:59 (giờ UTC của server).
 * 2. **Snapshot**: khi khách gửi yêu cầu hủy, service phải copy `rules` vào
 *    `cancel_requests.policy_snapshot`. Nếu chỉ giữ `policyId` rồi tính lại sau,
 *    admin sửa chính sách sẽ làm thay đổi số tiền hoàn của yêu cầu đã gửi.
 */
@Entity('cancel_policies')
export class CancelPolicy extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @OneToMany(() => CancelPolicyRule, (r) => r.policy, { cascade: ['insert', 'update'], eager: true })
  rules: Relation<CancelPolicyRule[]>;

  @BeforeInsert()
  protected ensureId(): void {
    this.id ??= uuidv4();
  }

  /**
   * @param total       Tổng tiền booking (VNĐ)
   * @param startDate   Ngày khởi hành (`YYYY-MM-DD` hoặc Date)
   * @param requestedAt Thời điểm khách gửi yêu cầu hủy
   * @param timeZone    Múi giờ dùng để quy đổi "ngày" (mặc định Asia/Ho_Chi_Minh)
   */
  calculateFee(
    total: number,
    startDate: string | Date,
    requestedAt: Date = new Date(),
    timeZone = 'Asia/Ho_Chi_Minh',
  ): CancellationFeeResult {
    const daysLeft = this.daysUntil(startDate, requestedAt, timeZone);
    const sorted = [...(this.rules ?? [])].sort((a, b) => b.daysBefore - a.daysBefore);
    const rule = sorted.find((r) => r.daysBefore <= daysLeft) ?? null;
    const feePercent = rule?.feePercent ?? 0;
    const fee = Math.round((total * feePercent) / 100);

    return {
      feePercent,
      fee,
      refund: Math.max(total - fee, 0),
      matchedDaysBefore: rule?.daysBefore ?? null,
    };
  }

  /** Số ngày (nguyên) từ đầu ngày của `requestedAt` tới `startDate`. */
  private daysUntil(startDate: string | Date, requestedAt: Date, timeZone: string): number {
    const start = this.toDateAtMidnight(startDate, timeZone);
    const requestDay = this.toDateAtMidnight(requestedAt, timeZone);
    return Math.floor((start.getTime() - requestDay.getTime()) / MS_PER_DAY);
  }

  /**
   * Quy một mốc thời gian về 00:00 theo `timeZone`, trả về Date dạng UTC nửa đêm
   * để phép trừ ngày không bị lệch do DST/offset.
   */
  private toDateAtMidnight(value: string | Date, timeZone: string): Date {
    if (typeof value === 'string') {
      // `YYYY-MM-DD` – đã là "ngày thuần", không cần đổi múi giờ.
      const [y, m, d] = value.slice(0, 10).split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    }
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);

    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
  }
}
