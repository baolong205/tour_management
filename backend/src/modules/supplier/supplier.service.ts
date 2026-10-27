import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type {
  CreateSupplierDto,
  QuerySuppliersDto,
  UpdateSupplierDto,
} from './dto/supplier.dto.js';
import { ResourceAssignment } from './entities/resource-assignment.entity.js';
import { Supplier } from './entities/supplier.entity.js';
import type { SupplierView } from './types/supplier.types.js';

/**
 * Nhà cung cấp (khách sạn, xe, hãng bay…).
 *
 * Xóa mềm (`SoftDeletableEntity`) để giữ liên kết với `resource_assignments` lịch sử;
 * nhà cung cấp đã được phân bổ cho lịch thì nên tắt `active` thay vì xóa.
 */
@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    @InjectRepository(Supplier) private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(ResourceAssignment) private readonly assignmentRepo: Repository<ResourceAssignment>,
  ) { }

  // ===== truy vấn =====

  async paginate(query: QuerySuppliersDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.supplierRepo.createQueryBuilder('supplier');

    if (query.search) {
      qb.andWhere('(supplier.name LIKE :kw OR supplier.contactName LIKE :kw)', {
        kw: `%${query.search.trim()}%`,
      });
    }
    if (query.type) qb.andWhere('supplier.type = :type', { type: query.type });
    if (query.active !== undefined) qb.andWhere('supplier.active = :active', { active: query.active });

    qb.orderBy('supplier.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [suppliers, total] = await qb.getManyAndCount();
    return { items: suppliers.map((supplier) => this.toView(supplier)), total, page, limit };
  }

  async getById(id: string): Promise<SupplierView> {
    return this.toView(await this.getOrFail(id));
  }

  async getOrFail(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('Không tìm thấy nhà cung cấp');
    return supplier;
  }

  // ===== ghi =====

  async create(dto: CreateSupplierDto): Promise<SupplierView> {
    const supplier = await this.supplierRepo.save(
      this.supplierRepo.create({
        type: dto.type,
        name: dto.name.trim(),
        contactName: dto.contactName?.trim() ?? null,
        phone: dto.phone?.trim() ?? null,
        email: dto.email?.trim() ?? null,
        address: dto.address?.trim() ?? null,
        meta: dto.meta ?? null,
        active: dto.active ?? true,
      }),
    );

    this.logger.log(`Tạo nhà cung cấp ${supplier.name} (${supplier.type})`);
    return this.toView(supplier);
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierView> {
    const supplier = await this.getOrFail(id);

    if (dto.type !== undefined) supplier.type = dto.type;
    if (dto.name !== undefined) supplier.name = dto.name.trim();
    if (dto.contactName !== undefined) supplier.contactName = dto.contactName?.trim() ?? null;
    if (dto.phone !== undefined) supplier.phone = dto.phone?.trim() ?? null;
    if (dto.email !== undefined) supplier.email = dto.email?.trim() ?? null;
    if (dto.address !== undefined) supplier.address = dto.address?.trim() ?? null;
    if (dto.meta !== undefined) supplier.meta = dto.meta;
    if (dto.active !== undefined) supplier.active = dto.active;

    return this.toView(await this.supplierRepo.save(supplier));
  }

  /** Bật/tắt nhanh nhà cung cấp. */
  async setActive(id: string, active: boolean): Promise<SupplierView> {
    const supplier = await this.getOrFail(id);
    supplier.active = active;
    return this.toView(await this.supplierRepo.save(supplier));
  }

  /**
   * Xóa mềm nhà cung cấp. Chặn xóa nếu còn phân bổ nguồn lực đang tham chiếu
   * (FK `RESTRICT`) – gợi ý tắt `active` thay vì xóa.
   */
  async remove(id: string): Promise<void> {
    const supplier = await this.getOrFail(id);

    const inUse = await this.assignmentRepo.count({ where: { supplierId: id } });
    if (inUse > 0) {
      throw new ConflictException(
        `Nhà cung cấp đang được dùng trong ${inUse} phân bổ nguồn lực – hãy tắt (active = false) thay vì xóa`,
      );
    }

    await this.supplierRepo.softRemove(supplier);
    this.logger.log(`Xóa nhà cung cấp ${supplier.name}`);
  }

  // ===== nội bộ =====

  private toView(supplier: Supplier): SupplierView {
    return {
      id: supplier.id,
      type: supplier.type,
      name: supplier.name,
      contactName: supplier.contactName ?? null,
      phone: supplier.phone ?? null,
      email: supplier.email ?? null,
      address: supplier.address ?? null,
      meta: supplier.meta ?? null,
      active: supplier.active,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }
}