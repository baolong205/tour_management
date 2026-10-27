import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';

/**
 * Xác thực & phân quyền: JWT access token, refresh token xoay vòng,
 * đặt lại mật khẩu, xác thực email.
 */
@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') ?? 'change_me',
        // `expiresIn` của jsonwebtoken dùng kiểu `StringValue` (vd '15m', '1d');
        // giá trị đọc từ env là `string` nên phải ép qua kiểu của tuỳ chọn.
        signOptions: {
          expiresIn: (config.get<string>('jwt.expiresIn') ?? '1d') as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule { }
