import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { PromotionType } from '../../common/enums/index.js';
import type {
  CreatePromotionDto,
  QueryPromotionsDto,
  UpdatePromotionDto,
  ValidatePromotionDto,
} from './dto/promotion.dto.js';
import { Promotion } from './entities/promotion.entity.js';
import type { PromotionQuoteView, PromotionView } from './types/promotion.types.js';

/**
 * Quản lý mã khuyến mãi.
 *
 * Service này là nơi **duy nhất** kiểm tra ràng buộc nghiệp vụ của promotion
 * (entity chỉ có `isUsable` / `calculateDiscount` để dùng chung, không tự validate).
 *
 * `BookingService` hiện đọc thẳng repository `Promotion`; ở đây cung cấp thêm
 * `reserveForBooking` / `releaseForBooking` để luồng đặt tour đếm lượt dùng
 * `perUserLimit` một cách nhất quán.
 */
@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(@InjectRepository(Promotion) private readonly promotionRepo: Repository<Promotion>) { }

  // ===== truy vấn =====

  async paginate(query: QueryPromotionsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const now = new Date();

    const qb = this.promotionRepo.createQueryBuilder('promotion');

    if (query.search) {
      qb.andWhere('promotion.code LIKE :kw', { kw: `%${query.search.trim().toUpperCase()}%` });
    }
    if (query.active !== undefined) qb.andWhere('promotion.active = :active', { active: query.active });
    if (query.type) qb.andWhere('promotion.type = :type', { type: query.type });
    if (query.usableOnly) {
      qb.andWhere('promotion.active = :active', { active: true })
        .andWhere('promotion.validFrom <= :now', { now })
        .andWhere('promotion.validTo >= :now', { now })
        .andWhere('(promotion.usageLimit IS NULL OR promotion.usedCount < promotion.usageLimit)');
    }

    qb.orderBy('promotion.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [promotions, total] = await qb.getManyAndCount();
    return { items: promotions.map((promotion) => this.toView(promotion, now)), total, page, limit };
  }

  async getById(id: string): Promise<PromotionView> {
    return this.toView(await this.getOrFail(id));
  }

  async getOrFail(id: string): Promise<Promotion> {
    const promotion = await this.promotionRepo.findOne({ where: { id } });
    if (!promotion) throw new NotFoundException('Không tìm thấy mã khuyến mãi');
    return promotion;
  }

  async getByCode(code: string): Promise<PromotionView> {
    const normalized = this.normalizeCode(code);
    const promotion = await this.promotionRepo.findOne({ where: { code: normalized } });
    if (!promotion) throw new NotFoundException(`Không tìm thấy mã khuyến mãi ${normalized}`);
    return this.toView(promotion);
  }

  /**
   * Áp thử mã cho một tạm tính – dùng cho nút "Áp dụng" ở trang thanh toán.
   * Không đụng tới `usedCount`, chỉ tính toán.
   */
  async validate(dto: ValidatePromotionDto): Promise<PromotionQuoteView> {
    const promotion = await this.findUsableOrFail(dto.code, dto.subtotal);
    const discount = promotion.calculateDiscount(dto.subtotal);
    return {
      code: promotion.code,
      subtotal: dto.subtotal,
      discount,
      total: dto.subtotal - discount,
      type: promotion.type,
      value: promotion.value,
    };
  }

  // ===== ghi =====

  async create(dto: CreatePromotionDto): Promise<PromotionView> {
    const code = this.normalizeCode(dto.code);
    await this.assertCodeAvailable(code);

    this.assertBusinessRules({
      type: dto.type,
      value: dto.value,
      validFrom: dto.validFrom,
      validTo: dto.validTo,
      usageLimit: dto.usageLimit ?? null,
      perUserLimit: dto.perUserLimit ?? 1,
      maxDiscount: dto.maxDiscount ?? null,
    });

    const promotion = await this.promotionRepo.save(
      this.promotionRepo.create({
        code,
        type: dto.type,
        value: dto.value,
        maxDiscount: dto.maxDiscount ?? null,
        minOrder: dto.minOrder ?? 0,
        usageLimit: dto.usageLimit ?? null,
        usedCount: 0,
        perUserLimit: dto.perUserLimit ?? 1,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
        active: dto.active ?? true,
      }),
    );

    this.logger.log(`Tạo mã khuyến mãi ${promotion.code}`);
    return this.toView(promotion);
  }

  async update(id: string, dto: UpdatePromotionDto): Promise<PromotionView> {
    const promotion = await this.getOrFail(id);

    if (dto.code !== undefined) {
      const code = this.normalizeCode(dto.code);
      if (code !== promotion.code) {
        await this.assertCodeAvailable(code, id);
        promotion.code = code;
      }
    }

    this.assertBusinessRules({
      type: dto.type ?? promotion.type,
      value: dto.value ?? promotion.value,
      validFrom: dto.validFrom ?? promotion.validFrom.toISOString(),
      validTo: dto.validTo ?? promotion.validTo.toISOString(),
      usageLimit: dto.usageLimit === undefined ? (promotion.usageLimit ?? null) : dto.usageLimit,
      perUserLimit: dto.perUserLimit ?? promotion.perUserLimit,
      maxDiscount: dto.maxDiscount === undefined ? (promotion.maxDiscount ?? null) : dto.maxDiscount,
    });

    if (dto.type !== undefined) promotion.type = dto.type;
    if (dto.value !== undefined) promotion.value = dto.value;
    if (dto.maxDiscount !== undefined) promotion.maxDiscount = dto.maxDiscount;
    if (dto.minOrder !== undefined) promotion.minOrder = dto.minOrder;
    if (dto.usageLimit !== undefined) promotion.usageLimit = dto.usageLimit;
    if (dto.perUserLimit !== undefined) promotion.perUserLimit = dto.perUserLimit;
    if (dto.validFrom !== undefined) promotion.validFrom = new Date(dto.validFrom);
    if (dto.validTo !== undefined) promotion.validTo = new Date(dto.validTo);
    if (dto.active !== undefined) promotion.active = dto.active;

    return this.toView(await this.promotionRepo.save(promotion));
  }

  /** Bật/tắt nhanh – không cần gửi cả body. */
  async setActive(id: string, active: boolean): Promise<PromotionView> {
    const promotion = await this.getOrFail(id);
    promotion.active = active;
    return this.toView(await this.promotionRepo.save(promotion));
  }

  /**
   * Xóa mã. Chỉ cho xóa khi chưa ai dùng (`usedCount = 0`) để không làm hỏng
   * liên kết `bookings.promotion_id` với dữ liệu lịch sử; mã đã dùng thì tắt `active`.
   */
  async remove(id: string): Promise<void> {
    const promotion = await this.getOrFail(id);
    if (promotion.usedCount > 0) {
      throw new ConflictException(
        `Mã ${promotion.code} đã được dùng ${promotion.usedCount} lượt – hãy tắt (active = false) thay vì xóa`,
      );
    }
    await this.promotionRepo.remove(promotion);
    this.logger.log(`Xóa mã khuyến mãi ${promotion.code}`);
  }

  // ===== dùng cho module booking =====

  /**
   * Lấy mã còn hợp lệ với `subtotal`; ném 400 kèm lý do cụ thể để FE hiển thị.
   * Đọc trong transaction truyền vào (nếu có) để giữ khóa đọc nhất quán.
   */
  async findUsableOrFail(code: string, subtotal: number, manager?: EntityManager): Promise<Promotion> {
    const repo = manager ? manager.getRepository(Promotion) : this.promotionRepo;
    const normalized = this.normalizeCode(code);
    const promotion = await repo.findOne({ where: { code: normalized } });

    if (!promotion) throw new BadRequestException(`Mã khuyến mãi ${normalized} không tồn tại`);
    if (!promotion.active) throw new BadRequestException(`Mã khuyến mãi ${normalized} đang bị tắt`);
    if (promotion.usedCount >= (promotion.usageLimit ?? Number.MAX_SAFE_INTEGER)) {
      throw new BadRequestException(`Mã khuyến mãi ${normalized} đã hết lượt sử dụng`);
    }

    const now = new Date();
    if (now < promotion.validFrom) throw new BadRequestException(`Mã khuyến mãi ${normalized} chưa có hiệu lực`);
    if (now > promotion.validTo) throw new BadRequestException(`Mã khuyến mãi ${normalized} đã hết hạn`);
    if (subtotal < promotion.minOrder) {
      throw new BadRequestException(
        `Mã khuyến mãi ${normalized} yêu cầu đơn tối thiểu ${promotion.minOrder.toLocaleString('vi-VN')}đ`,
      );
    }

    return promotion;
  }

  /**
   * Tăng `usedCount` khi booking được tạo thành công.
   * Gọi **trong** transaction tạo booking.
   */
  async reserveForBooking(promotionId: string, manager: EntityManager): Promise<void> {
    const result = await manager
      .createQueryBuilder()
      .update(Promotion)
      .set({ usedCount: () => 'used_count + 1' })
      .where('id = :id', { id: promotionId })
      .andWhere('(usage_limit IS NULL OR used_count < usage_limit)')
      .execute();

    // `affected = 0` nghĩa là vừa hết lượt do request khác dùng trước → chặn luôn.
    if (!result.affected) {
      throw new ConflictException('Mã khuyến mãi vừa hết lượt sử dụng – vui lòng bỏ mã và đặt lại');
    }
  }

  /** Giảm `usedCount` khi booking bị hủy / hết hạn / từ chối. */
  async releaseForBooking(promotionId: string, manager: EntityManager): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(Promotion)
      .set({ usedCount: () => 'GREATEST(used_count - 1, 0)' })
      .where('id = :id', { id: promotionId })
      .execute();
  }

  // ===== nội bộ =====

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private async assertCodeAvailable(code: string, exceptId?: string): Promise<void> {
    const existing = await this.promotionRepo.findOne({ where: { code } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Mã khuyến mãi ${code} đã tồn tại`);
    }
  }

  /** Ràng buộc mà MySQL không sinh được bằng CHECK (xem comment trong `Promotion`). */
  private assertBusinessRules(input: {
    type: PromotionType;
    value: number;
    validFrom: string;
    validTo: string;
    usageLimit: number | null;
    perUserLimit: number;
    maxDiscount: number | null;
  }): void {
    if (input.type === PromotionType.PERCENT && input.value > 100) {
      throw new BadRequestException('Mã giảm giá theo phần trăm không được vượt quá 100%');
    }
    if (input.type === PromotionType.FIXED && input.value <= 0) {
      throw new BadRequestException('Mã giảm giá theo số tiền phải có giá trị lớn hơn 0');
    }
    if (new Date(input.validTo).getTime() <= new Date(input.validFrom).getTime()) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    if (input.usageLimit !== null && input.usageLimit < 1) {
      throw new BadRequestException('Giới hạn lượt dùng phải từ 1 trở lên (hoặc bỏ trống = không giới hạn)');
    }
    if (input.perUserLimit < 1) {
      throw new BadRequestException('Giới hạn lượt dùng mỗi người phải từ 1 trở lên');
    }
    if (input.maxDiscount !== null && input.maxDiscount < 0) {
      throw new BadRequestException('Trần giảm giá không được âm');
    }
  }

  private toView(promotion: Promotion, now: Date = new Date()): PromotionView {
    const remainingUses =
      promotion.usageLimit === null || promotion.usageLimit === undefined
        ? null
        : Math.max(promotion.usageLimit - promotion.usedCount, 0);

    const usable =
      promotion.active &&
      (remainingUses === null || remainingUses > 0) &&
      now >= promotion.validFrom &&
      now <= promotion.validTo;

    return {
      id: promotion.id,
      code: promotion.code,
      type: promotion.type,
      value: promotion.value,
      maxDiscount: promotion.maxDiscount ?? null,
      minOrder: promotion.minOrder,
      usageLimit: promotion.usageLimit ?? null,
      usedCount: promotion.usedCount,
      remainingUses,
      perUserLimit: promotion.perUserLimit,
      validFrom: promotion.validFrom,
      validTo: promotion.validTo,
      active: promotion.active,
      usable,
      createdAt: promotion.createdAt,
      updatedAt: promotion.updatedAt,
    };
  }
}
