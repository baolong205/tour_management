import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';

/**
 * Đánh dấu route/controller **không** cần access token.
 *
 * Vì `JwtAuthGuard` được gắn toàn cục ở `AppModule` (mặc định mọi route đều bảo vệ),
 * mọi endpoint công khai – đăng ký, đăng nhập, refresh, danh sách tour – phải khai báo
 * `@Public()` để không bị chặn 401.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
