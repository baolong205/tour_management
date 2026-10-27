import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from './auth.types.js';

/**
 * Lấy người dùng đã xác thực (do `JwtStrategy` gắn vào `request.user`).
 *
 * ```ts
 * @Get('me')
 * me(@CurrentUser() user: AuthenticatedUser) { return user; }
 *
 * // Chỉ lấy một trường
 * @Get('me/roles')
 * roles(@CurrentUser('roles') roles: RoleName[]) { return roles; }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) return undefined;
    return field ? user[field] : user;
  },
);
