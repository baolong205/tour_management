import type { RoleName } from '../enums/index.js';

/**
 * Payload nhúng trong access token JWT.
 *
 * Cố ý **không** chứa danh sách permission: token giữ nhỏ và khi quyền bị thu hồi
 * thì chỉ cần đổi role trong DB là guard đọc lại quyền mới ở request kế tiếp.
 */
export interface JwtPayload {
  /** `users.id` */
  sub: string;
  email: string;
  /** Tên role tại thời điểm phát token (chỉ để hiển thị nhanh ở client). */
  roles: RoleName[];
  /** `jti` – dùng để vô hiệu hóa một access token cụ thể khi đăng xuất. */
  jti?: string;
  iat?: number;
  exp?: number;
}

/** Thông tin người dùng đã xác thực, gắn vào `request.user` bởi `JwtStrategy`. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  status: string;
  roles: RoleName[];
  /** Mã quyền dạng `resource:action`, đã gộp từ mọi role. */
  permissions: string[];
  /** `exp` của access token – dùng khi trả về `me` để client biết hạn. */
  tokenExpiresAt?: number;
}
