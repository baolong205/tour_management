import { type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator.js';

/**
 * Guard xác thực access token, gắn **toàn cục** trong `AppModule`:
 *
 * - Route có `@Public()` → bỏ qua kiểm tra token.
 * - Route còn lại → bắt buộc `Authorization: Bearer <accessToken>`.
 *
 * Đặt mặc định "đóng" (deny by default) giúp tránh quên gắn guard cho endpoint mới.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
