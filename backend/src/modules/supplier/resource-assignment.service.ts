import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import type {
  CreateResourceAssignmentDto,
  QueryResourceAssignmentsDto,
  UpdateResourceAssignmentDto,
} from './dto/supplier.dto.js';
import { ResourceAssignment } from './entities/resource-assignment.entity.js';
import { Supplier } from './entities/supplier.entity.js';
import type { ResourceAssignmentView, ScheduleResourceSummary } from './types/supplier.types.js';

/**
 * Phân bổ nguồn lực (khách sạn, xe, vé…) cho một lịch khởi hành.
 *
 * Mỗi dòng gắn một `supplier` + `type` (loại nguồn lực) + số lượng + chi phí.
 * Tổng chi phí theo lịch dùng để đối soát giá thành tour.
 */
@Injectable()
export class ResourceAssignmentService {
  private readonly logger = new Logger(ResourceAssignmentService.name);

  constructor(
    @InjectRepository(ResourceAssignment) private readonly assignmentRepo: Repository<ResourceAssignment>,
    @InjectRepository(Supplier) private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(DepartureSchedule) private readonly scheduleRepo: Repository<DepartureSchedule>,
  ) { }

  // ===== truy vấn =====

  async paginate(query: QueryResourceAssignmentsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.supplier', 'supplier');

    if (query.scheduleId) qb.andWhere('assignment.scheduleId = :scheduleId', { scheduleId: query.scheduleId });
    if (query.supplierId) qb.andWhere('assignment.supplierId = :supplierId', { supplierId: query.supplierId });
    if (query.type) qb.andWhere('assignment.type = :type', { type: query.type });

    qb.orderBy('assignment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [assignments, total] = await qb.getManyAndCount();
    return { items: assignments.map((assignment) => this.toView(assignment)), total, page, limit };
  }

  /** Toàn bộ phân bổ của một lịch + tổng chi phí. */
  async listBySchedule(scheduleId: string): Promise<ScheduleResourceSummary> {
    const assignments = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.supplier', 'supplier')
      .where('assignment.scheduleId = :scheduleId', { scheduleId })
      .orderBy('assignment.createdAt', 'ASC')
      .getMany();

    const items = assignments.map((assignment) => this.toView(assignment));
    return {
      scheduleId,
      items,
      totalCost: items.reduce((sum, item) => sum + (item.cost ?? 0), 0),
    };
  }

  async getById(id: string): Promise<ResourceAssignmentView> {
    return this.toView(await this.getOrFail(id));
  }

  async getOrFail(id: string): Promise<ResourceAssignment> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: { supplier: true },
    });
    if (!assignment) throw new NotFoundException('Không tìm thấy phân bổ nguồn lực');
    return assignment;
  }

  // ===== ghi =====

  async create(dto: CreateResourceAssignmentDto): Promise<ResourceAssignmentView> {
    await this.assertScheduleExists(dto.scheduleId);
    await this.assertSupplierExists(dto.supplierId);

    const assignment = await this.assignmentRepo.save(
      this.assignmentRepo.create({
        scheduleId: dto.scheduleId,
        supplierId: dto.supplierId,
        type: dto.type,
        quantity: dto.quantity ?? 1,
        cost: dto.cost ?? null,
        note: dto.note?.trim() ?? null,
      }),
    );

    this.logger.log(`Phân bổ ${assignment.type} cho lịch ${assignment.scheduleId}`);
    return this.getById(assignment.id);
  }

  async update(id: string, dto: UpdateResourceAssignmentDto): Promise<ResourceAssignmentView> {
    const assignment = await this.getOrFail(id);

    if (dto.scheduleId !== undefined && dto.scheduleId !== assignment.scheduleId) {
      await this.assertScheduleExists(dto.scheduleId);
      assignment.scheduleId = dto.scheduleId;
    }
    if (dto.supplierId !== undefined && dto.supplierId !== assignment.supplierId) {
      await this.assertSupplierExists(dto.supplierId);
      assignment.supplierId = dto.supplierId;
    }
    if (dto.type !== undefined) assignment.type = dto.type;
    if (dto.quantity !== undefined) assignment.quantity = dto.quantity;
    if (dto.cost !== undefined) assignment.cost = dto.cost;
    if (dto.note !== undefined) assignment.note = dto.note?.trim() ?? null;

    await this.assignmentRepo.save(assignment);
    return this.getById(id);
  }

  async remove(id: string): Promise<void> {
    const assignment = await this.getOrFail(id);
    await this.assignmentRepo.remove(assignment);
    this.logger.log(`Xóa phân bổ nguồn lực ${id}`);
  }

  // ===== nội bộ =====

  private async assertScheduleExists(scheduleId: string): Promise<void> {
    const exists = await this.scheduleRepo.exists({ where: { id: scheduleId } });
    if (!exists) throw new NotFoundException('Không tìm thấy lịch khởi hành');
  }

  private async assertSupplierExists(supplierId: string): Promise<void> {
    const exists = await this.supplierRepo.exists({ where: { id: supplierId } });
    if (!exists) throw new NotFoundException('Không tìm thấy nhà cung cấp');
  }

  private toView(assignment: ResourceAssignment): ResourceAssignmentView {
    const supplier = assignment.supplier as Supplier | undefined;
    return {
      id: assignment.id,
      scheduleId: assignment.scheduleId,
      supplierId: assignment.supplierId,
      supplierName: supplier?.name ?? null,
      supplierType: supplier?.type ?? null,
      type: assignment.type,
      quantity: assignment.quantity,
      cost: assignment.cost ?? null,
      note: assignment.note ?? null,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  }
}