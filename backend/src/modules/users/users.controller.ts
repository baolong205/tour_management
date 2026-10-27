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
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { UserStatus } from '../../common/enums/index.js';
import { AssignRolesDto, QueryUsersDto, UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

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

  @Get()
  @ApiOperation({ summary: 'Danh sách người dùng có phân trang và lọc' })
  list(@Query() query: QueryUsersDto) {
    return this.usersService.paginate(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết người dùng kèm quyền hiệu lực' })
  async detail(@Param('id', new ParseUUIDPipe()) id: string) {
    const user = await this.usersService.getOrFail(id);
    const permissions = await this.usersService.resolvePermissions(id);
    return this.usersService.toPublicUser(user, permissions);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật hồ sơ cơ bản của người dùng' })
  async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.getOrFail(id);
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
