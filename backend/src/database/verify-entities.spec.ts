import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../common/entities/entity-list.js';
import { Booking } from '../modules/booking/entities/booking.entity.js';
import { CancelPolicy } from '../modules/catalog/entities/cancel-policy.entity.js';
import { Promotion } from '../modules/promotion/entities/promotion.entity.js';
import { BookingStatus, PromotionType } from '../common/enums/index.js';

/**
 * Smoke test cho tầng entity – **không** cần database, chỉ cần MySQL driver.
 *
 * Chạy trong Vitest (nơi circular import giữa các file `*.entity.ts` được xử lý
 * như vite-node) để:
 * 1. Build metadata cho toàn bộ entity (phát hiện quan hệ/decorator sai).
 * 2. Kiểm tra state machine của Booking.
 * 3. Kiểm tra tính phí hủy và tính giảm giá.
 *
 * Lệnh: `npm run test:entities`
 */

class MetadataInspector extends DataSource {
  /** `buildMetadatas()` là protected ở type nhưng không chạm tới driver. */
  async inspect(): Promise<void> {
    await this.buildMetadatas();
  }
}

describe('Entity metadata (không cần DB)', () => {
  let dataSource: MetadataInspector;

  beforeAll(async () => {
    // Tạo DataSource bên trong beforeAll: Vitest nạp module theo ESM nên việc
    // khởi tạo driver ở top-level có thể chạy trước khi `reflect-metadata` sẵn sàng.
    dataSource = new MetadataInspector({
      type: 'mysql',
      host: 'localhost',
      username: 'root',
      database: 'tour_management',
      entities: ALL_ENTITIES,
      synchronize: false,
    });
    await dataSource.inspect();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('nạp đủ entity, không entity nào thiếu metadata', () => {
    // 36 class entity khai báo tường minh
    expect(ALL_ENTITIES.length).toBe(37);
    // + 3 bảng nối do @JoinTable sinh ra: user_roles, role_permissions, tour_categories
    expect(dataSource.entityMetadatas.length).toBe(40);

    const tables = dataSource.entityMetadatas.map((m) => m.tableName);
    expect(tables).toEqual(
      expect.arrayContaining([
        'user_roles',
        'role_permissions',
        'tour_categories',
        'tour_destinations',
        'favorites',
        'bookings',
        'payments',
        'departure_schedules',
      ]),
    );
  });

  it('bảng nhiều-nhiều có PK kép đúng kỳ vọng', () => {
    const existing = new Set(dataSource.entityMetadatas.map((m) => m.tableName));
    const pk = (table: string) =>
      dataSource
        .getMetadata(table)
        .primaryColumns.map((c) => c.databaseName)
        .sort();

    // bảng nối do @JoinTable sinh ra (chỉ kiểm tra khi metadata đã có)
    for (const table of ['user_roles', 'role_permissions', 'tour_categories']) {
      if (!existing.has(table)) continue;
      expect(pk(table)).toHaveLength(2);
    }

    // bảng nối khai báo tường minh bằng entity riêng
    expect(pk('tour_destinations')).toEqual(['destination_id', 'tour_id']);
    expect(pk('favorites')).toEqual(['tour_id', 'user_id']);
  });

  it('cột tiền dùng decimal(14,0) + transformer sang number', () => {
    const priceAdult = dataSource.getMetadata('departure_schedules').columns.find((c) => c.databaseName === 'price_adult');
    expect(priceAdult?.type).toBe('decimal');
    expect(priceAdult?.precision).toBe(14);
    expect(priceAdult?.scale).toBe(0);
    expect(priceAdult?.transformer).toBeTruthy();
  });

  it('password_hash không được select mặc định', () => {
    const col = dataSource.getMetadata('users').columns.find((c) => c.databaseName === 'password_hash');
    expect(col?.isSelect).toBe(false);
  });

  it('cột audit dùng datetime(3) + default CURRENT_TIMESTAMP(3)', () => {
    // Regression: TypeORM hard-code `CURRENT_TIMESTAMP(6)` cho Create/UpdateDateColumn
    // trong khi cột khai báo precision 3 ⇒ MySQL 8 trả ER_INVALID_DEFAULT khi sync.
    const meta = dataSource.getMetadata('guide_profiles');
    const createdAt = meta.columns.find((c) => c.databaseName === 'created_at');
    const updatedAt = meta.columns.find((c) => c.databaseName === 'updated_at');

    expect(createdAt?.type).toBe('datetime');
    expect(createdAt?.precision).toBe(3);
    expect(String(createdAt?.default)).toContain('CURRENT_TIMESTAMP(3)');

    expect(updatedAt?.precision).toBe(3);
    expect(String(updatedAt?.onUpdate)).toContain('CURRENT_TIMESTAMP(3)');
  });
});

describe('Booking – máy trạng thái', () => {
  it('cho phép CONFIRMED → COMPLETED', () => {
    const b = new Booking();
    b.status = BookingStatus.CONFIRMED;
    b.transitionTo(BookingStatus.COMPLETED);
    expect(b.status).toBe(BookingStatus.COMPLETED);
  });

  it('chặn chuyển từ trạng thái kết thúc COMPLETED → CANCELLED', () => {
    const b = new Booking();
    b.status = BookingStatus.COMPLETED;
    expect(() => b.transitionTo(BookingStatus.CANCELLED)).toThrowError(/Không thể chuyển/);
  });

  it('từ chối hủy thì quay về trạng thái trước đó', () => {
    const b = new Booking();
    b.status = BookingStatus.CONFIRMED;
    b.requestCancel();
    expect(b.status).toBe(BookingStatus.CANCEL_REQUESTED);
    b.rejectCancel();
    expect(b.status).toBe(BookingStatus.CONFIRMED);
  });

  it('tính lại tổng tiền từ hành khách + giảm giá', () => {
    const b = new Booking();
    b.passengers = [
      { unitPrice: 5_000_000 } as never,
      { unitPrice: 5_000_000 } as never,
    ];
    b.discount = 0;
    b.recalculateTotals(1_000_000);
    expect(b.subtotal).toBe(10_000_000);
    expect(b.total).toBe(9_000_000);
  });
});

describe('CancelPolicy – tính phí hủy theo mốc ngày', () => {
  const policy = (() => {
    const p = new CancelPolicy();
    p.rules = [
      { daysBefore: 7, feePercent: 0 },
      { daysBefore: 3, feePercent: 30 },
      { daysBefore: 1, feePercent: 70 },
      { daysBefore: 0, feePercent: 100 },
    ] as never;
    return p;
  })();

  const total = 10_000_000;
  const start = '2026-11-20';

  it('hủy trước 10 ngày → miễn phí', () => {
    expect(policy.calculateFee(total, start, new Date('2026-11-10T03:00:00Z'))).toEqual({
      feePercent: 0,
      fee: 0,
      refund: total,
      matchedDaysBefore: 7,
    });
  });

  it('hủy trước 5 ngày → phí 30%', () => {
    const r = policy.calculateFee(total, start, new Date('2026-11-15T03:00:00Z'));
    expect(r.feePercent).toBe(30);
    expect(r.fee).toBe(3_000_000);
  });

  it('hủy trước 1 ngày → phí 70%', () => {
    expect(policy.calculateFee(total, start, new Date('2026-11-19T03:00:00Z')).feePercent).toBe(70);
  });

  it('hủy trong ngày khởi hành (08:00 giờ VN) → phí 100%, không lệch múi giờ', () => {
    const r = policy.calculateFee(total, start, new Date('2026-11-20T01:00:00Z'));
    expect(r.feePercent).toBe(100);
    expect(r.refund).toBe(0);
  });
});

describe('Promotion – tính giảm giá', () => {
  it('20% của 20 triệu bị chặn bởi trần 300k', () => {
    const p = new Promotion();
    p.type = PromotionType.PERCENT;
    p.value = 20;
    p.maxDiscount = 300_000;
    p.minOrder = 0;
    p.usageLimit = null;
    p.usedCount = 0;
    p.active = true;
    p.validFrom = new Date('2026-01-01T00:00:00Z');
    p.validTo = new Date('2027-01-01T00:00:00Z');
    expect(p.calculateDiscount(20_000_000, new Date('2026-11-01T00:00:00Z'))).toBe(300_000);
  });

  it('hết lượt dùng thì không giảm', () => {
    const p = new Promotion();
    p.type = PromotionType.FIXED;
    p.value = 500_000;
    p.minOrder = 0;
    p.usageLimit = 5;
    p.usedCount = 5;
    p.active = true;
    p.validFrom = new Date('2026-01-01T00:00:00Z');
    p.validTo = new Date('2027-01-01T00:00:00Z');
    expect(p.calculateDiscount(1_000_000)).toBe(0);
  });
});
