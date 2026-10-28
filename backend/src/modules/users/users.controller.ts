import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { UserStatus } from '../../common/enums/index.js';
import { AssignRolesDto, QueryUsersDto, UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';
import { RoleName } from '../../common/enums/index.js';
import { RegisterDto } from '../auth/dto/register.dto.js';
import bcrypt from 'bcrypt';
import { ConflictException } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator.js';

/**
 * Quản trị người dùng – mọi route yêu cầu quyền `user:manage`
 * (được seed cho STAFF và ADMIN).
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@RequirePermissions('user:manage')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post('staff')
  @Roles(RoleName.ADMIN)
  @RequirePermissions('role:manage')
  async createStaff(@Body() dto: RegisterDto) {
    if (await this.usersService.existsByEmail(dto.email)) throw new ConflictException('Email đã được đăng ký');
    const role = await this.usersService.findRoleByName(RoleName.STAFF);
    const user = await this.usersService.createUser({ email: dto.email.trim().toLowerCase(), fullName: dto.fullName.trim(), phone: dto.phone?.trim() || null, passwordHash: await bcrypt.hash(dto.password, 12), status: UserStatus.ACTIVE, roles: [role] });
    return this.usersService.toPublicUser(user);
  }

  @Get()
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'Danh sách người dùng có phân trang và lọc' })
  list(@Query() query: QueryUsersDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.paginate(actor.permissions.includes('user:manage') ? query : { ...query, role: RoleName.CUSTOMER });
  }

  @Get(':id')
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'Chi tiết người dùng kèm quyền hiệu lực' })
  async detail(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() actor: AuthenticatedUser) {
    const user = await this.usersService.getOrFail(id);
    if (!actor.permissions.includes('user:manage') && (!user.roles?.length || user.roles.some(role => role.name !== RoleName.CUSTOMER))) throw new ForbiddenException('Nhân viên chỉ được xem hồ sơ khách hàng');
    const permissions = await this.usersService.resolvePermissions(id);
    return this.usersService.toPublicUser(user, permissions);
  }

  @Patch(':id')
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'Cập nhật hồ sơ cơ bản của người dùng' })
  async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    const user = await this.usersService.getOrFail(id);
    if (!actor.permissions.includes('user:manage') && (!user.roles?.length || user.roles.some(role => role.name !== RoleName.CUSTOMER))) {
      throw new ForbiddenException('Nhân viên chỉ được điều chỉnh hồ sơ khách hàng');
    }
    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone || null;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl || null;
    return this.usersService.toPublicUser(await this.usersService.save(user));
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Khóa / mở khóa / đặt lại trạng thái tài khoản' })
  async setStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (actor.id === id) {
      throw new ForbiddenException('Không thể tự đổi trạng thái tài khoản của chính mình');
    }

    const user = await this.usersService.getOrFail(id);
    user.status = dto.status;
    if (dto.status !== UserStatus.LOCKED) {
      user.failedLoginCount = 0;
      user.lockedUntil = null;
    }
    return this.usersService.toPublicUser(await this.usersService.save(user));
  }

  @Patch(':id/roles')
  @Roles(RoleName.ADMIN)
  @RequirePermissions('role:manage')
  @ApiOperation({ summary: 'Gán lại toàn bộ vai trò của người dùng' })
  async assignRoles(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (actor.id === id) {
      throw new ForbiddenException('Không thể tự thay đổi vai trò của chính mình');
    }

    const user = await this.usersService.getOrFail(id);
    const updated = await this.usersService.assignRoles(user, dto.roles);
    const permissions = await this.usersService.resolvePermissions(id);
    return this.usersService.toPublicUser(updated, permissions);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm tài khoản (giữ dữ liệu lịch sử)' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() actor: AuthenticatedUser) {
    if (actor.id === id) {
      throw new ForbiddenException('Không thể tự xóa tài khoản của chính mình');
    }
    await this.usersService.softDelete(id);
    return { deleted: true };
  }
}
