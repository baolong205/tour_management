import { applyDecorators, SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'auth:permissions';
export const PERMISSIONS_MODE_KEY = 'auth:permissionsMode';

export type PermissionMode = 'all' | 'any';

/**
 * Yêu cầu **mã quyền** dạng `resource:action` (vd `booking:confirm`, `user:manage`).
 *
 * - `@RequirePermissions('user:manage')` – mọi quyền liệt kê đều phải có (`all`).
 * - `@RequirePermissions(['booking:read', 'booking:write'], 'any')` – chỉ cần một.
 *
 * Quyền được gộp từ tất cả role của user (bảng `role_permissions`) và điền vào
 * `request.user.permissions` bởi `JwtStrategy`.
 */
export const RequirePermissions = (
  permissions: string | string[],
  mode: PermissionMode = 'all',
): ClassDecorator & MethodDecorator =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, Array.isArray(permissions) ? permissions : [permissions]),
    SetMetadata(PERMISSIONS_MODE_KEY, mode),
  );
