/**
 * Backfill sổ cái mã giảm giá từ dữ liệu `bookings` cũ.
 *
 * Chạy **sau** khi đã apply migration `PromotionCampaigns` (tạo 4 bảng mới).
 * Script này chỉ đọc `bookings` và ghi thêm vào:
 * - `promotion_redemptions` – mỗi booking có `promotion_id` → 1 dòng.
 * - `booking_discounts`    – snapshot mã/giá trị tại thời điểm đặt đơn.
 *
 * Sau đó tính lại `promotions.used_count` và `promotions.budget_used` từ sổ cái
 * để counter khớp với lịch sử (trước đây `used_count` được tăng/giảm thủ công).
 *
 * Idempotent: dùng `INSERT ... ON DUPLICATE KEY UPDATE` nên chạy lại nhiều lần
 * không sinh dòng trùng và không làm sai counter.
 *
 * Cách chạy:
 *   npx tsx scripts/backfill-promotion-redemptions.ts            # ghi thật
 *   npx tsx scripts/backfill-promotion-redemptions.ts --dry-run  # chỉ đếm
 */
import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { databaseSsl } from '../src/config/database-ssl.js';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/common/entities/entity-list.js';
import { BookingStatus, PromotionRedemptionStatus } from '../src/common/enums/index.js';

const DRY_RUN = process.argv.includes('--dry-run');

/** Booking đã đóng ⇒ lượt dùng được trả lại. */
const RELEASED_STATUSES: BookingStatus[] = [
  BookingStatus.CANCELLED,
  BookingStatus.REJECTED,
  BookingStatus.EXPIRED,
];

/** Booking đã thu được tiền ⇒ lượt dùng tính chính thức. */
const CONFIRMED_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING_CONFIRMATION,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];

interface LegacyBookingRow {
  id: string;
  promotion_id: string;
  customer_id: string;
  subtotal: string;
  discount: string;
  status: BookingStatus;
  created_at: Date;
  code: string;
  promotion_code: string;
  promotion_type: string;
  promotion_value: string;
  exclusive_group: string | null;
}

function statusFor(bookingStatus: BookingStatus): PromotionRedemptionStatus {
  if (RELEASED_STATUSES.includes(bookingStatus)) return PromotionRedemptionStatus.RELEASED;
  if (CONFIRMED_STATUSES.includes(bookingStatus)) return PromotionRedemptionStatus.CONFIRMED;
  return PromotionRedemptionStatus.RESERVED;
}

await ConfigModule.forRoot({ envFilePath: '.env' });
const source = new DataSource({
  ssl: databaseSsl(),
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'tour_management',
  timezone: '+07:00',
  charset: 'utf8mb4',
  entities: ALL_ENTITIES,
  synchronize: false,
  logging: false,
});

try {
  await source.initialize();

  const rows: LegacyBookingRow[] = await source.query(`
    SELECT b.id, b.promotion_id, b.customer_id, b.subtotal, b.discount, b.status,
           b.created_at, b.code,
           p.code AS promotion_code, p.type AS promotion_type,
           p.value AS promotion_value, p.exclusive_group
      FROM bookings b
      JOIN promotions p ON p.id = b.promotion_id
     WHERE b.promotion_id IS NOT NULL
     ORDER BY b.created_at ASC
  `);

  console.log(`Tìm thấy ${rows.length} booking có áp mã giảm giá.`);

  const counts = { reserved: 0, confirmed: 0, released: 0 };
  const touchedPromotions = new Set<string>();

  for (const row of rows) {
    const status = statusFor(row.status);
    if (status === PromotionRedemptionStatus.CONFIRMED) counts.confirmed += 1;
    else if (status === PromotionRedemptionStatus.RELEASED) counts.released += 1;
    else counts.reserved += 1;

    touchedPromotions.add(row.promotion_id);
    if (DRY_RUN) continue;

    const confirmedAt = status === PromotionRedemptionStatus.CONFIRMED ? row.created_at : null;
    const releasedAt = status === PromotionRedemptionStatus.RELEASED ? row.created_at : null;
    const releaseReason = status === PromotionRedemptionStatus.RELEASED ? row.status : null;

    await source.query(
      `INSERT INTO promotion_redemptions
         (id, promotion_id, booking_id, customer_id, discount_amount, subtotal_at_use,
          status, reserved_at, confirmed_at, released_at, release_reason)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         discount_amount = VALUES(discount_amount),
         subtotal_at_use = VALUES(subtotal_at_use),
         confirmed_at = VALUES(confirmed_at),
         released_at = VALUES(released_at),
         release_reason = VALUES(release_reason)`,
      [
        row.promotion_id,
        row.id,
        row.customer_id,
        Number(row.discount),
        Number(row.subtotal),
        status,
        row.created_at,
        confirmedAt,
        releasedAt,
        releaseReason,
      ],
    );

    await source.query(
      `INSERT INTO booking_discounts
         (id, booking_id, promotion_id, code_snapshot, type_snapshot,
          value_snapshot, discount_amount, exclusive_group)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         code_snapshot = VALUES(code_snapshot),
         type_snapshot = VALUES(type_snapshot),
         value_snapshot = VALUES(value_snapshot),
         discount_amount = VALUES(discount_amount),
         exclusive_group = VALUES(exclusive_group)`,
      [
        row.id,
        row.promotion_id,
        row.promotion_code,
        row.promotion_type,
        Number(row.promotion_value),
        Number(row.discount),
        row.exclusive_group,
      ],
    );
  }

  console.log(
    `Sổ cái: ${counts.confirmed} CONFIRMED · ${counts.reserved} RESERVED · ${counts.released} RELEASED.`,
  );

  if (DRY_RUN) {
    console.log('--dry-run: không ghi gì vào database.');
  } else {
    // Đồng bộ counter từ sổ cái – nguồn sự thật là `promotion_redemptions`.
    for (const promotionId of touchedPromotions) {
      await source.query(
        `UPDATE promotions p
            SET p.used_count = (
                  SELECT COUNT(*) FROM promotion_redemptions r
                   WHERE r.promotion_id = p.id AND r.status <> 'RELEASED'
                ),
                p.budget_used = (
                  SELECT COALESCE(SUM(r.discount_amount), 0) FROM promotion_redemptions r
                   WHERE r.promotion_id = p.id AND r.status <> 'RELEASED'
                )
          WHERE p.id = ?`,
        [promotionId],
      );
    }
    console.log(`Đã đồng bộ counter cho ${touchedPromotions.size} mã giảm giá.`);
  }
} finally {
  if (source.isInitialized) await source.destroy();
}
