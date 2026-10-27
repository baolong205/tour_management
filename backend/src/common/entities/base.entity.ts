import { Column, PrimaryColumn } from 'typeorm';

/**
 * Base entity dùng chung: khóa chính `char(36)` + audit 2 cột.
 *
 * Vì sao không dùng `@PrimaryGeneratedColumn('uuid')`:
 * - Trên MySQL, TypeORM sinh cột `varchar(36)` với `DEFAULT (uuid())` – chỉ có từ
 *   MySQL 8.0.13 và tốn 36 byte + 1 byte độ dài cho mỗi giá trị.
 * - Ở đây dùng `@PrimaryColumn` kiểu `char(36) charset ascii` và **sinh UUID ở tầng
 *   ứng dụng** (xem `uuidv4()` bên dưới). Lợi ích:
 *   - Tương thích cả MySQL 5.7/8.x, MariaDB.
 *   - `char(36)` cố định, `ascii` ⇒ index nhỏ, join nhanh hơn `varchar(36)`.
 *   - ID có sẵn trước khi INSERT ⇒ tạo được cả object graph (Booking + Passengers)
 *     trong một transaction mà không phải save lần lượt để lấy id.
 *
 * Cách dùng: mọi entity phải gán `id` trước khi `save`, hoặc dùng hook
 * `@BeforeInsert()` gọi `this.id ??= uuidv4()`.
 *
 * Vì sao khai báo `created_at` / `updated_at` bằng `@Column` thay vì
 * `@CreateDateColumn` / `@UpdateDateColumn`:
 * TypeORM hard-code `createDateDefault = 'CURRENT_TIMESTAMP(6)'` trong
 * `driver/mysql/MysqlDriver.js` (mappedDataTypes) mà **không** cắt theo `precision`
 * khai báo trên cột, nên `datetime(3) DEFAULT CURRENT_TIMESTAMP(6)` bị MySQL 8
 * từ chối với `ER_INVALID_DEFAULT: Invalid default value for 'created_at'`.
 * Khai báo tường minh giữ đúng `datetime(3)` + `CURRENT_TIMESTAMP(3)` khớp nhau,
 * đồng thời vẫn giữ giá trị mặc định do DB sinh (kể cả khi INSERT bằng SQL thuần).
 */
export abstract class BaseEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  id: string;

  @Column({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
    onUpdate: 'CURRENT_TIMESTAMP(3)',
  })
  updatedAt: Date;
}

/**
 * Entity chỉ ghi thêm (append-only) như `audit_logs`, `payment_events`:
 * không có `updated_at`.
 */
export abstract class CreatedOnlyEntity {
  @PrimaryColumn({ name: 'id', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin' })
  id: string;

  @Column({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;
}

/**
 * Sinh UUID v4 không phụ thuộc package ngoài (`crypto.randomUUID` có từ Node 14.17+).
 * Dùng trong `@BeforeInsert()` của các entity kế thừa `BaseEntity`.
 */
export function uuidv4(): string {
  return globalThis.crypto.randomUUID();
}
