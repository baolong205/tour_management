import { SetMetadata } from '@nestjs/common';
import type { RoleName } from '../enums/index.js';

export const ROLES_KEY = 'auth:roles';

/**
 * Giới hạn route theo **tên vai trò** (CUSTOMER / STAFF / GUIDE / ADMIN).
 * Người dùng chỉ cần sở hữu **một trong** các role liệt kê là được phép.
 *
 * Với nghiệp vụ cần kiểm soát chi tiết, ưu tiên `@RequirePermissions()`.
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
