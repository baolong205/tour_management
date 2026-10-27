/**
 * Seed vai trò (roles), quyền (permissions) và tài khoản quản trị mặc định.
 *
 * Cách dùng (trong thư mục `backend/`):
 *   npm run db:seed
 *
 * Script **idempotent** – chạy nhiều lần không tạo bản ghi trùng:
 * - Role/permission được upsert theo `name` / `code`.
 * - Quan hệ `role_permissions` được đồng bộ đúng theo `ROLE_PERMISSIONS`.
 * - Tài khoản admin chỉ tạo khi chưa tồn tại email trong `ADMIN_EMAIL`.
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { DataSource, type Repository } from 'typeorm';
import { PERMISSION_DEFINITIONS, ROLE_DESCRIPTIONS, ROLE_PERMISSIONS } from '../src/common/auth/auth.constants.js';
import { ALL_ENTITIES } from '../src/common/entities/entity-list.js';
import { RoleName, UserStatus } from '../src/common/enums/index.js';
import databaseConfig from '../src/config/database.config.js';
import { Permission } from '../src/modules/users/entities/permission.entity.js';
import { Role } from '../src/modules/users/entities/role.entity.js';
import { User } from '../src/modules/users/entities/user.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, load: [databaseConfig], envFilePath: ['.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        synchronize: false,
        logging: false,
        timezone: config.get<string>('database.timezone'),
        charset: config.get<string>('database.charset'),
        entities: ALL_ENTITIES,
      }),
    }),
    TypeOrmModule.forFeature([User, Role, Permission]),
  ],
})
class SeedModule { }

async function seedRoles(dataSource: DataSource): Promise<Map<string, Role>> {
  const roleRepo = dataSource.getRepository(Role);
  const permissionRepo = dataSource.getRepository(Permission);

  // 1. Upsert permission
  const permissionByCode = new Map<string, Permission>();
  for (const definition of PERMISSION_DEFINITIONS) {
    let permission = await permissionRepo.findOne({ where: { code: definition.code } });
    if (!permission) {
      permission = permissionRepo.create({ code: definition.code, description: definition.description });
      await permissionRepo.save(permission);
    } else if (permission.description !== definition.description) {
      permission.description = definition.description;
      await permissionRepo.save(permission);
    }
    permissionByCode.set(permission.code, permission);
  }
  console.log(`Permissions: ${permissionByCode.size}`);

  // 2. Upsert role và gán đúng bộ quyền
  const roleByName = new Map<string, Role>();
  for (const name of Object.values(RoleName)) {
    let role = await roleRepo.findOne({ where: { name }, relations: { permissions: true } });
    if (!role) {
      role = roleRepo.create({ name, description: ROLE_DESCRIPTIONS[name] });
    }

    const codes = ROLE_PERMISSIONS[name] ?? [];
    const missing = codes.filter((code) => !permissionByCode.has(code));
    if (missing.length > 0) {
      throw new Error(`Role ${name} tham chiếu quyền chưa khai báo: ${missing.join(', ')}`);
    }
    role.permissions = codes.map((code) => permissionByCode.get(code)!);
    await roleRepo.save(role);
    roleByName.set(role.name, role);
    console.log(`Role ${name}: ${codes.length} quyền`);
  }

  return roleByName;
}

async function seedAdmin(dataSource: DataSource, roles: Map<string, Role>): Promise<void> {
  const userRepo = dataSource.getRepository(User);

  const email = (process.env.ADMIN_EMAIL ?? 'admin@tour.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@123456';

  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    console.log(`Admin: đã tồn tại ${email} – bỏ qua`);
    return;
  }

  const adminRole = roles.get(RoleName.ADMIN);
  if (!adminRole) throw new Error('Chưa seed role ADMIN');

  const user = userRepo.create({
    email,
    fullName: process.env.ADMIN_FULL_NAME ?? 'Quản trị viên',
    passwordHash: await bcrypt.hash(password, 12),
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    roles: [adminRole],
  });
  await userRepo.save(user);
  console.log(`Admin: đã tạo ${email} (mật khẩu lấy từ ADMIN_PASSWORD)`);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
  try {
    const dataSource = app.get(DataSource);
    const roles = await seedRoles(dataSource);
    await seedAdmin(dataSource, roles);
    console.log('\nSeed hoàn tất.');
  } finally {
    await app.close();
  }
}

await bootstrap();
