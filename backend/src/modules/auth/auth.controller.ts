import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { Public } from '../../common/auth/public.decorator.js';
import { AuthService, type RequestMeta } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from './dto/password.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';

function metaOf(req: Request): RequestMeta {
  const forwarded = req.headers['x-forwarded-for'];
  return {
    ip: (Array.isArray(forwarded) ? forwarded[0] : forwarded) ?? req.ip,
    userAgent: req.headers['user-agent'],
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /**
   * 5 tài khoản / 10 phút / IP.
   *
   * Đủ cho một người đăng ký hộ gia đình, nhưng chặn được script tạo hàng loạt
   * tài khoản rác (trước đây không có giới hạn nào).
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Post('register')
  @ApiOperation({
    summary: 'Đăng ký tài khoản khách hàng',
    description: 'Giới hạn 5 lần / 10 phút / IP.',
  })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, metaOf(req));
  }

  /**
   * 10 lần / phút / IP.
   *
   * Cố ý **rộng hơn** ngưỡng khoá tài khoản (`login.max_failed` = 5) để cơ chế
   * khoá theo tài khoản vẫn là lớp bảo vệ chính; rate limit ở đây chỉ chặn
   * brute-force trải rộng nhiều email từ cùng một IP.
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập bằng email và mật khẩu',
    description: 'Giới hạn 10 lần / phút / IP; sai quá 5 lần sẽ khoá tài khoản 15 phút.',
  })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, metaOf(req));
  }

  /** 30 lần / phút / IP – đủ cho access token hết hạn luân phiên ở nhiều tab. */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cấp lại access token từ refresh token',
    description: 'Giới hạn 30 lần / phút / IP.',
  })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, metaOf(req));
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Thu hồi toàn bộ refresh token của tài khoản' })
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.id);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Thông tin người dùng hiện tại kèm vai trò và quyền' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đổi mật khẩu' })
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  /**
   * 3 lần / 15 phút / IP.
   *
   * Endpoint này gửi email thật (tốn phí + có thể bị lợi dụng để spam hộp thư
   * người khác), nên phải siết chặt hơn hẳn các endpoint còn lại.
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gửi yêu cầu đặt lại mật khẩu',
    description: 'Giới hạn 3 lần / 15 phút / IP để chống spam email.',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /** 5 lần / 15 phút / IP – chặn dò token đặt lại mật khẩu. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đặt lại mật khẩu bằng token',
    description: 'Giới hạn 5 lần / 15 phút / IP.',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /** 10 lần / 15 phút / IP – chặn dò token xác thực email. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xác thực email bằng token',
    description: 'Giới hạn 10 lần / 15 phút / IP.',
  })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }
}
