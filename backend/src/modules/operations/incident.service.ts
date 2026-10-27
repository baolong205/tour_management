import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { User } from '../users/entities/user.entity.js';
import type { CreateIncidentDto, QueryIncidentsDto, UpdateIncidentDto } from './dto/operations.dto.js';
import { Incident } from './entities/incident.entity.js';
import { GuideAssignmentService } from './guide-assignment.service.js';
import type { IncidentView } from './types/operations.types.js';

/**
 * Sự cố trong chuyến + chi phí phát sinh.
 *
 * Quyền ghi: HDV được phân công cho lịch, hoặc nhân viên có `guide:assign`.
 * Không xóa cứng sự cố – sửa nội dung/chi phí để giữ lịch sử đối soát chi phí tour.
 */
@Injectable()
export class IncidentService {
  private readonly logger = new Logger(IncidentService.name);

  constructor(
    @InjectRepository(Incident) private readonly incidentRepo: Repository<Incident>,
    @InjectRepository(DepartureSchedule) private readonly scheduleRepo: Repository<DepartureSchedule>,
    private readonly guideAssignmentService: GuideAssignmentService,
  ) { }

  async paginate(query: QueryIncidentsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.incidentRepo
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.reporter', 'reporter')
      .leftJoinAndSelect('incident.schedule', 'schedule')
      .leftJoinAndSelect('schedule.tour', 'tour');

    if (query.scheduleId) qb.andWhere('incident.scheduleId = :scheduleId', { scheduleId: query.scheduleId });

    qb.orderBy('incident.occurredAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [incidents, total] = await qb.getManyAndCount();
    return { items: incidents.map((incident) => this.toView(incident)), total, page, limit };
  }

  /** Sự cố của một lịch + tổng chi phí phát sinh. */
  async listBySchedule(scheduleId: string) {
    const incidents = await this.incidentRepo
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.reporter', 'reporter')
      .leftJoinAndSelect('incident.schedule', 'schedule')
      .leftJoinAndSelect('schedule.tour', 'tour')
      .where('incident.scheduleId = :scheduleId', { scheduleId })
      .orderBy('incident.occurredAt', 'DESC')
      .getMany();

    const items = incidents.map((incident) => this.toView(incident));
    return { items, totalExtraCost: items.reduce((sum, item) => sum + item.extraCost, 0) };
  }

  async getById(id: string): Promise<IncidentView> {
    const incident = await this.incidentRepo.findOne({
      where: { id },
      relations: { reporter: true, schedule: { tour: true } },
    });
    if (!incident) throw new NotFoundException('Không tìm thấy sự cố');
    return this.toView(incident);
  }

  async create(dto: CreateIncidentDto, actor: AuthenticatedUser): Promise<IncidentView> {
    await this.assertCanWrite(dto.scheduleId, actor);

    const incident = await this.incidentRepo.save(
      this.incidentRepo.create({
        scheduleId: dto.scheduleId,
        reportedBy: actor.id,
        description: dto.description.trim(),
        extraCost: dto.extraCost ?? 0,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      }),
    );

    this.logger.log(`Ghi nhận sự cố cho lịch ${dto.scheduleId}: chi phí ${incident.extraCost}đ`);
    return this.getById(incident.id);
  }

  async update(id: string, dto: UpdateIncidentDto, actor: AuthenticatedUser): Promise<IncidentView> {
    const incident = await this.incidentRepo.findOne({ where: { id } });
    if (!incident) throw new NotFoundException('Không tìm thấy sự cố');
    await this.assertCanWrite(incident.scheduleId, actor);

    if (dto.description !== undefined) incident.description = dto.description.trim();
    if (dto.extraCost !== undefined) incident.extraCost = dto.extraCost;
    if (dto.occurredAt !== undefined) incident.occurredAt = new Date(dto.occurredAt);

    await this.incidentRepo.save(incident);
    return this.getById(id);
  }

  // ===== nội bộ =====

  private async assertCanWrite(scheduleId: string, actor: AuthenticatedUser): Promise<void> {
    const schedule = await this.scheduleRepo.findOne({ where: { id: scheduleId } });
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch khởi hành');

    if (actor.permissions.includes('guide:assign')) return;

    const guideId = await this.guideAssignmentService.resolveGuideId(actor);
    if (!guideId) throw new ForbiddenException('Tài khoản của bạn chưa có hồ sơ hướng dẫn viên');

    const scheduleIds = await this.guideAssignmentService.scheduleIdsForGuide(guideId);
    if (!scheduleIds.includes(scheduleId)) {
      throw new ForbiddenException('Bạn không được phân công cho lịch khởi hành này');
    }
  }

  private toView(incident: Incident): IncidentView {
    const schedule = incident.schedule;
    const reporter = incident.reporter as User | undefined;
    return {
      id: incident.id,
      scheduleId: incident.scheduleId,
      scheduleTourName: schedule?.tour?.name ?? null,
      scheduleStartDate: schedule?.startDate ?? null,
      description: incident.description,
      extraCost: incident.extraCost,
      occurredAt: incident.occurredAt,
      reportedBy: incident.reportedBy ?? null,
      reporterName: reporter?.fullName ?? null,
      createdAt: incident.createdAt,
    };
  }
}
