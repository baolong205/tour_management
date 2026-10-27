import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from './auth.types.js';
import { PERMISSIONS_KEY, PERMISSIONS_MODE_KEY, type PermissionMode } from './permissions.decorator.js';

/**
 * RBAC theo **mã quyền** – lớp kiểm soát chi tiết hơn `RolesGuard`.
 *
 * Quyền lấy từ `request.user.permissions`, được `JwtStrategy` tổng hợp từ mọi role
 * của người dùng (xem `AuthService.resolvePermissions`).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const mode =
      this.reflector.getAllAndOverride<PermissionMode>(PERMISSIONS_MODE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'all';

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const granted = new Set(request.user?.permissions ?? []);

    const ok = mode === 'any' ? required.some((code) => granted.has(code)) : required.every((code) => granted.has(code));
    if (ok) return true;

    throw new ForbiddenException(`Thiếu quyền: ${required.join(', ')}`);
  }
}
