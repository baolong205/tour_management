import { createHash, randomBytes } from 'node:crypto';

/**
 * Sinh token ngẫu nhiên 256-bit (dạng hex) dùng cho refresh token / đặt lại mật khẩu.
 * Chỉ **hash** được lưu vào `auth_tokens.token_hash`; giá trị gốc trả cho client một lần.
 */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('hex');
}

/** SHA-256 hex – khớp độ dài cột `token_hash varchar(128)`. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
