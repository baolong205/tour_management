import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { Permission } from './entities/permission.entity.js';
import { Role } from './entities/role.entity.js';

/** Danh mục vai trò & quyền – phục vụ màn hình phân quyền của quản trị viên. */
@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionRepo: Repository<Permission>,
  ) { }

  @Get()
  @RequirePermissions('role:manage')
  @ApiOperation({ summary: 'Danh sách vai trò kèm quyền được gán' })
  async list() {
    const roles = await this.roleRepo.find({ relations: { permissions: true }, order: { name: 'ASC' } });
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      permissions: (role.permissions ?? []).map((permission) => permission.code).sort(),
    }));
  }

  @Get('permissions')
  @RequirePermissions('role:manage')
  @ApiOperation({ summary: 'Toàn bộ mã quyền của hệ thống' })
  async permissions() {
    const permissions = await this.permissionRepo.find({ order: { code: 'ASC' } });
    return permissions.map((permission) => ({
      id: permission.id,
      code: permission.code,
      description: permission.description ?? null,
    }));
  }
}
