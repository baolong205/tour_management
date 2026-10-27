import type { ValueTransformer } from 'typeorm';

/**
 * Cột tiền (VNĐ) khai báo `decimal(14,0)`.
 *
 * - MySQL driver trả `decimal` về dạng **string** để tránh mất chính xác.
 * - Transformer chuyển sang `number` khi đọc, nhờ vậy code nghiệp vụ cộng/trừ/nhân
 *   trực tiếp mà không phải `Number(...)` ở mọi chỗ.
 * - Khi ghi vẫn giữ nguyên giá trị, driver tự ép về chuỗi số.
 *
 * Với dữ liệu tiền ≤ 99.999.999.999.999 VNĐ, `number` (double, an toàn tới 2^53)
 * biểu diễn chính xác số nguyên nên không có sai số.
 */
export const moneyTransformer: ValueTransformer = {
  to: (value?: number | null) => (value === null || value === undefined ? value : value),
  from: (value?: string | number | null) => {
    if (value === null || value === undefined) return value as null | undefined;
    return typeof value === 'number' ? value : Number(value);
  },
};

/**
 * Cột phần trăm / hệ số thập phân (vd `avg_rating numeric(2,1)`).
 * MySQL trả về string, cần ép sang number để tính toán.
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => (value === null || value === undefined ? value : value),
  from: (value?: string | number | null) => {
    if (value === null || value === undefined) return value as null | undefined;
    return typeof value === 'number' ? value : Number(value);
  },
};

/**
 * Cột `json` / `longtext` lưu JSON (thay cho `jsonb` của PostgreSQL).
 *
 * MySQL có kiểu `json` native, nhưng TypeORM sẽ **không** tự parse khi đọc ở mọi
 * trường hợp (tuỳ driver/phiên bản). Transformer đảm bảo giá trị luôn là object.
 */
export const jsonTransformer: ValueTransformer = {
  to: (value?: unknown) => {
    if (value === null || value === undefined) return value;
    return typeof value === 'string' ? value : JSON.stringify(value);
  },
  from: (value?: string | object | null) => {
    if (value === null || value === undefined) return value as null | undefined;
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  },
};

/**
 * Cột mảng chuỗi (thay cho `text[]` của PostgreSQL) – lưu `json` dạng `["vi","en"]`.
 */
export const stringArrayTransformer: ValueTransformer = {
  to: (value?: string[] | null) => {
    if (!Array.isArray(value)) return JSON.stringify([]);
    return JSON.stringify(value);
  },
  from: (value?: string | string[] | null) => {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value as string[];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  },
};
