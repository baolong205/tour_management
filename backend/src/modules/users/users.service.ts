import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { RoleName, UserStatus } from '../../common/enums/index.js';
import { Permission } from './entities/permission.entity.js';
import { Role } from './entities/role.entity.js';
import { User } from './entities/user.entity.js';

/** Cấu trúc trả về cho client – không bao giờ chứa `passwordHash`. */
export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  roles: RoleName[];
  permissions: string[];
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionRepo: Repository<Permission>,
  ) { }

  // ===== truy vấn =====

  /**
   * Tìm user theo email, **kèm** `passwordHash` (cột khai báo `select: false`).
   * Dùng cho luồng đăng nhập / đổi mật khẩu – các chỗ khác dùng `findOneById`.
   */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  findByIdWithPassword(id: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.userRepo.exists({ where: { email: email.trim().toLowerCase() } });
  }

  /** Danh sách user có phân trang + lọc theo vai trò/trạng thái (cho màn hình quản trị). */
  async paginate(options: { page?: number; limit?: number; search?: string; role?: RoleName; status?: UserStatus }) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (options.search) {
      qb.andWhere('(user.email LIKE :kw OR user.fullName LIKE :kw)', { kw: `%${options.search.trim()}%` });
    }
    if (options.status) {
      qb.andWhere('user.status = :status', { status: options.status });
    }
    if (options.role) {
      // Lọc theo role bằng subquery để không làm mất các role khác trong kết quả join.
      qb.andWhere(
        'EXISTS (SELECT 1 FROM user_roles ur INNER JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = user.id AND r.name = :role)',
        { role: options.role },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items: items.map((user) => this.toPublicUser(user)), total, page, limit };
  }

  // ===== ghi =====

  /** Tìm user theo id, ném 404 nếu không tồn tại (dùng cho controller quản trị). */
  async getOrFail(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id }, relations: { roles: true } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  /** Xóa mềm: giữ bản ghi để không mất lịch sử booking/hóa đơn. */
  async softDelete(id: string): Promise<void> {
    const result = await this.userRepo.softDelete({ id });
    if (!result.affected) throw new NotFoundException('Không tìm thấy người dùng');
  }

  createUser(data: Partial<User>): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  save(user: User): Promise<User> {
    return this.userRepo.save(user);
  }

  /** Gán role theo tên; ném lỗi nếu role chưa được seed vào DB. */
  async assignRoles(user: User, roleNames: RoleName[]): Promise<User> {
    if (roleNames.length === 0) throw new BadRequestException('Cần ít nhất một vai trò');
    const roles = await this.roleRepo.find({ where: { name: In(roleNames) } });
    const found = new Set(roles.map((role) => role.name));
    const missing = roleNames.filter((name) => !found.has(name));
    if (missing.length > 0) {
      throw new BadRequestException(`Vai trò chưa được khởi tạo: ${missing.join(', ')}`);
    }
    user.roles = roles;
    return this.userRepo.save(user);
  }

  async findRoleByName(name: RoleName): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { name } });
    if (!role) throw new NotFoundException(`Không tìm thấy vai trò ${name}. Hãy chạy seed trước.`);
    return role;
  }

  /**
   * Gộp quyền của tất cả role của user thành mảng mã quyền duy nhất.
   * Admin được seed sẵn đủ quyền của Staff nên không cần xử lý kế thừa ở đây.
   */
  async resolvePermissions(userId: string): Promise<string[]> {
    const rows = await this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .innerJoin('role.permissions', 'permission')
      .select('DISTINCT permission.code', 'code')
      .where('user.id = :userId', { userId })
      .getRawMany<{ code: string }>();
    return rows.map((row) => row.code);
  }

  async getRoleNames(userId: string): Promise<RoleName[]> {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: { roles: true } });
    return (user?.roles ?? []).map((role) => role.name as RoleName);
  }

  // ===== chuyển đổi =====

  toPublicUser(user: User, permissions: string[] = []): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt,
      roles: (user.roles ?? []).map((role) => role.name as RoleName),
      permissions,
    };
  }
}
