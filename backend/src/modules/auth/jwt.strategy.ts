import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser, JwtPayload } from '../../common/auth/auth.types.js';
import { UserStatus } from '../../common/enums/index.js';
import { UsersService } from '../users/users.service.js';

/**
 * Xác thực access token từ header `Authorization: Bearer ...`.
 *
 * Mỗi request đều **đọc lại user từ DB** thay vì tin hoàn toàn vào payload:
 * nhờ vậy, tài khoản bị khóa/xóa hoặc bị thu hồi quyền sẽ mất hiệu lực ngay
 * (không phải chờ token hết hạn). Chi phí là 2 truy vấn nhỏ theo khóa chính.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') ?? 'change_me',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) throw new UnauthorizedException('Token không hợp lệ');

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại');
    if (user.status === UserStatus.LOCKED || user.status === UserStatus.PENDING_VERIFY) {
      throw new UnauthorizedException('Tài khoản chưa được kích hoạt hoặc đã bị khóa');
    }
    if (user.isTemporarilyLocked()) {
      throw new UnauthorizedException('Tài khoản đang bị khóa tạm thời');
    }

    const [roles, permissions] = await Promise.all([
      this.usersService.getRoleNames(user.id),
      this.usersService.resolvePermissions(user.id),
    ]);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      roles,
      permissions,
      tokenExpiresAt: payload.exp,
    };
  }
}
