import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { uuidv4 } from '../../common/entities/base.entity.js';
import { SupportTicket } from './support.entity.js';
import type { CreateSupportDto, QuerySupportDto } from './support.dto.js';

export function canManageSupport(user: AuthenticatedUser): boolean {
  return user.permissions.includes('support:manage');
}

@Injectable()
export class SupportService {
  constructor(@InjectRepository(SupportTicket) private readonly repo: Repository<SupportTicket>, private readonly dataSource: DataSource) {}

  async list(user: AuthenticatedUser, query: QuerySupportDto, all = false) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.repo.findAndCount({
      where: all && canManageSupport(user) ? {} : { customerId: user.id },
      order: { createdAt: 'DESC' }, skip: (page - 1) * limit, take: limit,
    });
    return { items, total, page, limit };
  }

  create(user: AuthenticatedUser, dto: CreateSupportDto) {
    return this.repo.save(this.repo.create({ id: uuidv4(), customerId: user.id, customerName: user.fullName, subject: dto.subject.trim(), message: dto.message.trim(), status: 'OPEN', replies: [] }));
  }

  async update(id: string, user: AuthenticatedUser, message?: string, status?: SupportTicket['status']) {
    return this.dataSource.transaction(async manager => {
      const repo = manager.getRepository(SupportTicket);
      const ticket = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!ticket || (ticket.customerId !== user.id && !canManageSupport(user))) throw new NotFoundException('Không tìm thấy yêu cầu hỗ trợ');
      if (message) {
        ticket.replies = [...ticket.replies, { authorId: user.id, authorName: user.fullName, message: message.trim(), createdAt: new Date().toISOString() }];
        ticket.status = canManageSupport(user) ? 'IN_PROGRESS' : 'OPEN';
      }
      if (status) ticket.status = status;
      return repo.save(ticket);
    });
  }
}