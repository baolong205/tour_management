import { Column, Entity, PrimaryColumn } from 'typeorm';
import { jsonTransformer } from '../../../common/transformers/money.transformer.js';

/**
 * `system_settings` – cấu hình động, khóa chính là `key` (không dùng uuid).
 *
 * Ví dụ: `booking.hold_minutes` = 15, `infant.counts_seat` = false, `login.max_failed` = 5.
 * Vì `value` là `json`, đọc ra có thể là number/boolean/object – service nên có
 * helper `getNumber(key, fallback)` để tránh `any` lan rộng.
 */
@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'json', transformer: jsonTransformer })
  value: unknown;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;
}