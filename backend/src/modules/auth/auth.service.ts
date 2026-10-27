import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { LessThan, type Repository } from 'typeorm';
import type { AuthenticatedUser, JwtPayload } from '../../common/auth/auth.types.js';
import { generateOpaqueToken, hashToken } from '../../common/auth/token.util.js';
import { RoleName, TokenType, UserStatus } from '../../common/enums/index.js';
import { AuthToken } from '../users/entities/auth-token.entity.js';
import { User } from '../users/entities/user.entity.js';
import { type PublicUser, UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from './dto/password.dto.js';
import { RegisterDto } from './dto/register.dto.js';

/** Ngưỡng khóa tài khoản mặc định; có thể ghi đè qua `system_settings.login.max_failed`. */
const DEFAULT_MAX_FAILED = 5;
const DEFAULT_LOCK_MINUTES = 15;
const BCRYPT_ROUNDS = 12;

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Giây – khớp `exp - iat` của access token. */
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthResult extends AuthTokens {
  user: PublicUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(AuthToken) private readonly tokenRepo: Repository<AuthToken>,
  ) { }

  // ===================================================================
  // Đăng ký
  // ===================================================================

  /**
   * Tạo tài khoản CUSTOMER.
   *
   * Thiết kế: tài khoản mới mặc định `ACTIVE` để dùng được ngay (đồ án không có
   * mail server thật). Vẫn tạo sẵn token `VERIFY_EMAIL`; khi bật xác thực email
   * thì chỉ cần đổi `status` khởi tạo thành `PENDING_VERIFY` và chặn ở `JwtStrategy`.
   */
  async register(dto: RegisterDto, meta: RequestMeta = {}): Promise<{ user: PublicUser; verifyToken: string | null }> {
    const email = dto.email.trim().toLowerCase();
    if (await this.usersService.existsByEmail(email)) {
      throw new ConflictException('Email đã được đăng ký');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.createUser({
      email,
      fullName: dto.fullName.trim(),
      phone: dto.phone?.trim() || null,
      passwordHash,
      status: UserStatus.ACTIVE,
    });

    const customerRole = await this.usersService.findRoleByName(RoleName.CUSTOMER);
    await this.usersService.assignRoles(user, [customerRole.name as RoleName]);

    const verifyToken = await this.issueToken(user, TokenType.VERIFY_EMAIL, 24 * 60 * 60 * 1000, meta);
    this.logger.log(`Đăng ký mới: ${email}`);

    // `createUser` chưa nạp quan hệ `roles`; gán lại để response có role vừa cấp.
    const saved = (await this.usersService.findById(user.id)) ?? user;
    saved.roles = [customerRole];

    return {
      user: this.usersService.toPublicUser(saved),
      // Trả token để FE hiển thị link xác thực khi chưa tích hợp SMTP.
      verifyToken,
    };
  }

  // ===================================================================
  // Đăng nhập / đăng xuất
  // ===================================================================

  async login(dto: LoginDto, meta: RequestMeta = {}): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    // Thông báo chung cho cả hai trường hợp để không lộ email có tồn tại hay không.
    const invalid = new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (!user || !user.passwordHash) throw invalid;

    if (user.status === UserStatus.LOCKED) {
      throw new ForbiddenException('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
    }
    if (user.isTemporarilyLocked()) {
      throw new ForbiddenException(
        `Tài khoản tạm khóa do đăng nhập sai nhiều lần. Thử lại sau ${Math.ceil(
          (user.lockedUntil!.getTime() - Date.now()) / 60000,
        )} phút.`,
      );
    }

    const matched = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matched) {
      await this.onFailedLogin(user);
      throw invalid;
    }

    user.failedLoginCount = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.usersService.save(user);

    const tokens = await this.issueSession(user, meta);
    const permissions = await this.usersService.resolvePermissions(user.id);
    return { ...tokens, user: this.usersService.toPublicUser(user, permissions) };
  }

  /** Tăng bộ đếm đăng nhập sai và khóa tạm khi vượt ngưỡng. */
  private async onFailedLogin(user: User): Promise<void> {
    user.failedLoginCount = (user.failedLoginCount ?? 0) + 1;
    if (user.failedLoginCount >= DEFAULT_MAX_FAILED) {
      user.lockedUntil = new Date(Date.now() + DEFAULT_LOCK_MINUTES * 60_000);
      user.failedLoginCount = 0;
      this.logger.warn(`Khóa tạm ${DEFAULT_LOCK_MINUTES} phút do đăng nhập sai: ${user.email}`);
    }
    await this.usersService.save(user);
  }

  /**
   * Đăng xuất: thu hồi **toàn bộ** refresh token của người dùng (mọi thiết bị).
   * Access token còn lại tự hết hạn theo `JWT_EXPIRES_IN`.
   */
  async logout(userId: string): Promise<{ revoked: number }> {
    return { revoked: await this.revokeAllRefreshTokens(userId) };
  }

  /**
   * Thu hồi mọi refresh token còn hiệu lực của một tài khoản.
   *
   * Dùng chung cho `logout` và cho nhánh phát hiện token bị dùng lại, để hai
   * luồng không bao giờ lệch nhau về điều kiện lọc (`type = REFRESH`,
   * `revoked_at IS NULL`).
   */
  private async revokeAllRefreshTokens(userId: string): Promise<number> {
    const result = await this.tokenRepo.update(
      { userId, type: TokenType.REFRESH, revokedAt: null as never },
      { revokedAt: new Date() },
    );
    return result.affected ?? 0;
  }

  // ===================================================================
  // Refresh token
  // ===================================================================

  /** Xoay vòng refresh token: token cũ bị thu hồi ngay khi cấp token mới. */
  async refresh(refreshToken: string, meta: RequestMeta = {}): Promise<AuthTokens> {
    const stored = await this.tokenRepo.findOne({
      where: { tokenHash: hashToken(refreshToken), type: TokenType.REFRESH },
    });
    if (!stored) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    /**
     * Phát hiện refresh token bị dùng lại (token theft / replay).
     *
     * Bình thường mỗi refresh token chỉ dùng **một lần**: dùng xong bị thu hồi
     * và cấp token mới (rotation). Nếu một token **đã thu hồi** lại được trình
     * lên, nghĩa là đã có hai bên cùng giữ token đó: kẻ tấn công lấy được token
     * và đang cố dùng lại, hoặc nạn nhân dùng lại sau khi kẻ tấn công đã xoay
     * vòng trước. Không thể phân biệt ai là ai ⇒ **thu hồi toàn bộ session**
     * của tài khoản, buộc cả hai phía đăng nhập lại bằng mật khẩu.
     *
     * Đây chính là hành vi còn thiếu trước đây: token đã thu hồi chỉ bị trả 401
     * mà không vô hiệu hoá token kẻ tấn công đang giữ ⇒ kẻ tấn công duy trì
     * được phiên vô thời hạn.
     */
    if (stored.revokedAt) {
      const revoked = await this.revokeAllRefreshTokens(stored.userId);
      this.logger.error(
        `Phát hiện refresh token bị dùng lại cho user ${stored.userId} ` +
        `(ip=${meta.ip ?? 'n/a'}) ⇒ đã thu hồi ${revoked} phiên, buộc đăng nhập lại`,
      );
      throw new UnauthorizedException(
        'Phiên đăng nhập không còn an toàn. Vui lòng đăng nhập lại bằng mật khẩu.',
      );
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    stored.revokedAt = new Date();
    await this.tokenRepo.save(stored);

    const user = await this.usersService.findById(stored.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản không khả dụng');
    }

    // Kiểm tra chữ ký JWT độc lập để chắc chắn token được phát bởi hệ thống này.
    try {
      this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret') ?? 'change_me_refresh',
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    return this.issueSession(user, meta);
  }

  // ===================================================================
  // Hồ sơ
  // ===================================================================

  async me(user: AuthenticatedUser): Promise<PublicUser> {
    const entity = await this.usersService.findById(user.id);
    if (!entity) throw new UnauthorizedException('Tài khoản không tồn tại');
    return this.usersService.toPublicUser(entity, user.permissions);
  }

  // ===================================================================
  // Mật khẩu & xác thực email
  // ===================================================================

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ changed: true }> {
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user?.passwordHash) throw new UnauthorizedException('Tài khoản không tồn tại');

    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    if (await bcrypt.compare(dto.newPassword, user.passwordHash)) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.usersService.save(user);
    // Đổi mật khẩu ⇒ đăng xuất mọi thiết bị khác.
    await this.logout(userId);
    return { changed: true };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ sent: true; resetToken?: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    // Luôn trả thành công để tránh dò email tồn tại.
    if (!user) return { sent: true };

    await this.tokenRepo.update(
      { userId: user.id, type: TokenType.RESET_PASSWORD, revokedAt: null as never },
      { revokedAt: new Date() },
    );
    const token = await this.issueToken(user, TokenType.RESET_PASSWORD, 30 * 60 * 1000);
    return { sent: true, resetToken: token };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ reset: true }> {
    const stored = await this.tokenRepo.findOne({
      where: { tokenHash: hashToken(dto.token), type: TokenType.RESET_PASSWORD },
    });
    if (!stored || !stored.isUsable()) {
      throw new BadRequestException('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.usersService.findById(stored.userId);
    if (!user) throw new BadRequestException('Tài khoản không tồn tại');

    user.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    await this.usersService.save(user);

    stored.revokedAt = new Date();
    await this.tokenRepo.save(stored);
    await this.logout(user.id);
    return { reset: true };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ verified: true }> {
    const stored = await this.tokenRepo.findOne({
      where: { tokenHash: hashToken(dto.token), type: TokenType.VERIFY_EMAIL },
    });
    if (!stored || !stored.isUsable()) {
      throw new BadRequestException('Token xác thực không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.usersService.findById(stored.userId);
    if (!user) throw new BadRequestException('Tài khoản không tồn tại');

    user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
    if (user.status === UserStatus.PENDING_VERIFY) user.status = UserStatus.ACTIVE;
    await this.usersService.save(user);

    stored.revokedAt = new Date();
    await this.tokenRepo.save(stored);
    return { verified: true };
  }

  // ===================================================================
  // Cấp token
  // ===================================================================

  private async issueSession(user: User, meta: RequestMeta): Promise<AuthTokens> {
    const roles = await this.usersService.getRoleNames(user.id);
    const expiresIn = this.accessTokenSeconds();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
      jti: randomUUID(),
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.secret') ?? 'change_me',
      expiresIn,
    });

    const refreshToken = generateOpaqueToken();
    // Refresh token là chuỗi opaque (không phải JWT) nhưng vẫn ký để `refresh()`
    // xác minh được nguồn phát; lưu hash vào DB để so khớp.
    const ttlMs = this.refreshTokenMs();
    await this.saveToken(user.id, TokenType.REFRESH, refreshToken, ttlMs, meta);

    return { accessToken, refreshToken, expiresIn, tokenType: 'Bearer' };
  }

  private async issueToken(user: User, type: TokenType, ttlMs: number, meta: RequestMeta = {}): Promise<string> {
    const token = generateOpaqueToken();
    await this.saveToken(user.id, type, token, ttlMs, meta);
    return token;
  }

  private async saveToken(userId: string, type: TokenType, token: string, ttlMs: number, meta: RequestMeta): Promise<void> {
    const entity = this.tokenRepo.create({
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
    });
    await this.tokenRepo.save(entity);
  }

  private accessTokenSeconds(): number {
    const raw = this.config.get<string>('jwt.expiresIn') ?? '1d';
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match) return 86_400;
    const value = Number(match[1]);
    const unit = match[2];
    const factor = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3_600 : 86_400;
    return value * factor;
  }

  private refreshTokenMs(): number {
    const raw = this.config.get<string>('jwt.refreshExpiresIn') ?? '7d';
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match) return 7 * 86_400_000;
    const value = Number(match[1]);
    const unit = match[2];
    const factor = unit === 's' ? 1_000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return value * factor;
  }

  /** Job `cleanup-tokens` có thể gọi hàm này để dọn token hết hạn. */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.tokenRepo.delete({ expiresAt: LessThan(new Date()) });
    return result.affected ?? 0;
  }
}
