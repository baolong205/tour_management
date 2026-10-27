import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { RoleName } from '../enums/index.js';
import type { AuthenticatedUser } from './auth.types.js';
import { ROLES_KEY } from './roles.decorator.js';

/**
 * Kiểm tra `request.user.roles` có chứa ít nhất một role khai báo bởi `@Roles()`.
 * Không khai báo `@Roles()` ⇒ chỉ cần đăng nhập là qua (JWT guard đã lo phần đó).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleName[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const userRoles = request.user?.roles ?? [];
    if (required.some((role) => userRoles.includes(role))) return true;

    throw new ForbiddenException(`Cần một trong các vai trò: ${required.join(', ')}`);
  }
}
