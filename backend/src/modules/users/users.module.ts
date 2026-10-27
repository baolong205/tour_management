import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthToken } from './entities/auth-token.entity.js';
import { GuideProfile } from './entities/guide-profile.entity.js';
import { Permission } from './entities/permission.entity.js';
import { Role } from './entities/role.entity.js';
import { User } from './entities/user.entity.js';
import { RolesController } from './roles.controller.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

/**
 * Truy cập dữ liệu người dùng / vai trò / quyền.
 *
 * `AuthModule` import module này để dùng `UsersService`; các controller quản trị
 * được bảo vệ bằng `@RequirePermissions('user:manage' | 'role:manage')`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission, AuthToken, GuideProfile])],
  controllers: [UsersController, RolesController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule { }
