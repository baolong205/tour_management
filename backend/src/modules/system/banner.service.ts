import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { CreateBannerDto, QueryBannersDto, UpdateBannerDto } from './dto/system.dto.js';
import { Banner } from './entities/banner.entity.js';
import type { BannerView } from './types/system.types.js';

/**
 * Banner trang chủ.
 *
 * Có lịch chạy (`start_at`/`end_at`); endpoint công khai chỉ trả banner đang hiển thị
 * (active + trong khoảng thời gian) theo `sort_order`.
 */
@Injectable()
export class BannerService {
  private readonly logger = new Logger(BannerService.name);

  constructor(@InjectRepository(Banner) private readonly bannerRepo: Repository<Banner>) { }

  // ===== truy vấn =====

  async paginate(query: QueryBannersDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.bannerRepo.createQueryBuilder('banner');
    if (query.active !== undefined) qb.andWhere('banner.active = :active', { active: query.active });

    qb.orderBy('banner.sortOrder', 'ASC')
      .addOrderBy('banner.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [banners, total] = await qb.getManyAndCount();
    return { items: banners.map((banner) => this.toView(banner)), total, page, limit };
  }

  /** Banner đang hiển thị (công khai) – lọc theo thời gian ở tầng service. */
  async listVisible(): Promise<BannerView[]> {
    const now = new Date();
    const banners = await this.bannerRepo
      .createQueryBuilder('banner')
      .where('banner.active = :active', { active: true })
      .andWhere('(banner.startAt IS NULL OR banner.startAt <= :now)', { now })
      .andWhere('(banner.endAt IS NULL OR banner.endAt >= :now)', { now })
      .orderBy('banner.sortOrder', 'ASC')
      .getMany();

    return banners.map((banner) => this.toView(banner, now));
  }

  async getById(id: string): Promise<BannerView> {
    return this.toView(await this.getOrFail(id));
  }

  async getOrFail(id: string): Promise<Banner> {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('Không tìm thấy banner');
    return banner;
  }

  // ===== ghi =====

  async create(dto: CreateBannerDto): Promise<BannerView> {
    this.assertPeriod(dto.startAt, dto.endAt);

    const banner = await this.bannerRepo.save(
      this.bannerRepo.create({
        title: dto.title.trim(),
        imageUrl: dto.imageUrl.trim(),
        linkUrl: dto.linkUrl?.trim() ?? null,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
      }),
    );

    this.logger.log(`Tạo banner ${banner.title}`);
    return this.toView(banner);
  }

  async update(id: string, dto: UpdateBannerDto): Promise<BannerView> {
    const banner = await this.getOrFail(id);

    const startAt = dto.startAt !== undefined ? dto.startAt : banner.startAt?.toISOString();
    const endAt = dto.endAt !== undefined ? dto.endAt : banner.endAt?.toISOString();
    this.assertPeriod(startAt, endAt);

    if (dto.title !== undefined) banner.title = dto.title.trim();
    if (dto.imageUrl !== undefined) banner.imageUrl = dto.imageUrl.trim();
    if (dto.linkUrl !== undefined) banner.linkUrl = dto.linkUrl?.trim() ?? null;
    if (dto.sortOrder !== undefined) banner.sortOrder = dto.sortOrder;
    if (dto.active !== undefined) banner.active = dto.active;
    if (dto.startAt !== undefined) banner.startAt = dto.startAt ? new Date(dto.startAt) : null;
    if (dto.endAt !== undefined) banner.endAt = dto.endAt ? new Date(dto.endAt) : null;

    return this.toView(await this.bannerRepo.save(banner));
  }

  async setActive(id: string, active: boolean): Promise<BannerView> {
    const banner = await this.getOrFail(id);
    banner.active = active;
    return this.toView(await this.bannerRepo.save(banner));
  }

  async remove(id: string): Promise<void> {
    const banner = await this.getOrFail(id);
    await this.bannerRepo.remove(banner);
    this.logger.log(`Xóa banner ${banner.title}`);
  }

  // ===== nội bộ =====

  private assertPeriod(startAt?: string | null, endAt?: string | null): void {
    if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
  }

  private toView(banner: Banner, now: Date = new Date()): BannerView {
    return {
      id: banner.id,
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl ?? null,
      sortOrder: banner.sortOrder,
      active: banner.active,
      startAt: banner.startAt ?? null,
      endAt: banner.endAt ?? null,
      visible: banner.isVisible(now),
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt,
    };
  }
}