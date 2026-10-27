import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type {
  CreateEmailTemplateDto,
  QueryEmailTemplatesDto,
  UpdateEmailTemplateDto,
} from './dto/system.dto.js';
import { EmailTemplate } from './entities/email-template.entity.js';
import type { EmailTemplateView } from './types/system.types.js';

/**
 * Mẫu email (Handlebars).
 *
 * `code` là duy nhất (không phân biệt hoa/thường) – dùng để tra cứu khi gửi mail.
 * Các module khác gọi `getByCode()` để lấy mẫu đang bật.
 */
@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(
    @InjectRepository(EmailTemplate) private readonly templateRepo: Repository<EmailTemplate>,
  ) { }

  // ===== truy vấn =====

  async paginate(query: QueryEmailTemplatesDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.templateRepo.createQueryBuilder('template');
    if (query.search) qb.andWhere('template.code LIKE :search', { search: `%${query.search}%` });
    if (query.active !== undefined) qb.andWhere('template.active = :active', { active: query.active });

    qb.orderBy('template.code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [templates, total] = await qb.getManyAndCount();
    return { items: templates.map((template) => this.toView(template)), total, page, limit };
  }

  async getById(id: string): Promise<EmailTemplateView> {
    return this.toView(await this.getOrFail(id));
  }

  async getOrFail(id: string): Promise<EmailTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Không tìm thấy mẫu email');
    return template;
  }

  /** Lấy mẫu theo mã (không phân biệt hoa/thường). Trả `null` nếu không có. */
  async findByCode(code: string): Promise<EmailTemplate | null> {
    return this.templateRepo
      .createQueryBuilder('template')
      .where('LOWER(template.code) = LOWER(:code)', { code })
      .getOne();
  }

  /** Lấy mẫu đang bật theo mã; ném lỗi nếu không có hoặc đã tắt. */
  async getActiveByCodeOrFail(code: string): Promise<EmailTemplate> {
    const template = await this.findByCode(code);
    if (!template) throw new NotFoundException(`Không tìm thấy mẫu email "${code}"`);
    if (!template.active) throw new NotFoundException(`Mẫu email "${code}" đang tắt`);
    return template;
  }

  // ===== ghi =====

  async create(dto: CreateEmailTemplateDto): Promise<EmailTemplateView> {
    const code = dto.code.trim().toUpperCase();
    await this.assertCodeAvailable(code);

    const template = await this.templateRepo.save(
      this.templateRepo.create({
        code,
        subject: dto.subject.trim(),
        bodyHtml: dto.bodyHtml,
        active: dto.active ?? true,
      }),
    );

    this.logger.log(`Tạo mẫu email ${template.code}`);
    return this.toView(template);
  }

  async update(id: string, dto: UpdateEmailTemplateDto): Promise<EmailTemplateView> {
    const template = await this.getOrFail(id);

    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase();
      await this.assertCodeAvailable(code, id);
      template.code = code;
    }
    if (dto.subject !== undefined) template.subject = dto.subject.trim();
    if (dto.bodyHtml !== undefined) template.bodyHtml = dto.bodyHtml;
    if (dto.active !== undefined) template.active = dto.active;

    return this.toView(await this.templateRepo.save(template));
  }

  async setActive(id: string, active: boolean): Promise<EmailTemplateView> {
    const template = await this.getOrFail(id);
    template.active = active;
    return this.toView(await this.templateRepo.save(template));
  }

  async remove(id: string): Promise<void> {
    const template = await this.getOrFail(id);
    await this.templateRepo.remove(template);
    this.logger.log(`Xóa mẫu email ${template.code}`);
  }

  // ===== nội bộ =====

  private async assertCodeAvailable(code: string, exceptId?: string): Promise<void> {
    const existing = await this.findByCode(code);
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Mã mẫu email "${code}" đã tồn tại`);
    }
  }

  private toView(template: EmailTemplate): EmailTemplateView {
    return {
      id: template.id,
      code: template.code,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      active: template.active,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}