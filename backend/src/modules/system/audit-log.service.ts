import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import type { QueryAuditLogsDto } from './dto/system.dto.js';
import { AuditLog } from './entities/audit-log.entity.js';
import type { AuditLogView } from './types/system.types.js';

/** Tham số ghi nhật ký thao tác (gọi nội bộ từ các module khác). */
export interface WriteAuditLogInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
}

/**
 * Nhật ký thao tác quản trị (append-only).
 *
 * Chỉ ghi và đọc – không sửa/xóa để giữ tính toàn vẹn của vết kiểm toán.
 * Các module khác gọi `write()` để ghi lại thao tác nhạy cảm.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(@InjectRepository(AuditLog) private readonly auditLogRepo: Repository<AuditLog>) { }

  // ===== ghi =====

  /** Ghi một bản ghi nhật ký. Không ném lỗi ra ngoài để không chặn luồng nghiệp vụ. */
  async write(input: WriteAuditLogInput): Promise<void> {
    try {
      await this.auditLogRepo.save(
        this.auditLogRepo.create({
          actorId: input.actorId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          before: input.before ?? null,
          after: input.after ?? null,
          ip: input.ip ?? null,
          createdAt: new Date(),
        }),
      );
    } catch (error) {
      this.logger.error(`Không ghi được nhật ký ${input.action} cho ${input.entityType}:${input.entityId}`, error as Error);
    }
  }

  // ===== truy vấn =====

  async paginate(query: QueryAuditLogsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor');

    if (query.actorId) qb.andWhere('log.actorId = :actorId', { actorId: query.actorId });
    if (query.action) qb.andWhere('log.action = :action', { action: query.action });
    if (query.entityType) qb.andWhere('log.entityType = :entityType', { entityType: query.entityType });
    if (query.entityId) qb.andWhere('log.entityId = :entityId', { entityId: query.entityId });

    qb.orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [logs, total] = await qb.getManyAndCount();
    return { items: logs.map((log) => this.toView(log)), total, page, limit };
  }

  // ===== nội bộ =====

  private toView(log: AuditLog): AuditLogView {
    const actor = log.actor as User | undefined;
    return {
      id: log.id,
      actorId: log.actorId ?? null,
      actorName: actor?.fullName ?? null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      before: log.before ?? null,
      after: log.after ?? null,
      ip: log.ip ?? null,
      createdAt: log.createdAt,
    };
  }
}