import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { CancelPolicyRule } from '../entities/cancel-policy-rule.entity.js';
import { CancelPolicy } from '../entities/cancel-policy.entity.js';
import { Tour } from '../entities/tour.entity.js';
import type { CancellationFeeQuote } from '../types/catalog.types.js';
import type { CancelPolicyRuleDto, CreateCancelPolicyDto, UpdateCancelPolicyDto } from '../dto/cancel-policy.dto.js';

@Injectable()
export class CancelPolicyService {
  constructor(
    @InjectRepository(CancelPolicy) private readonly policyRepo: Repository<CancelPolicy>,
    @InjectRepository(CancelPolicyRule) private readonly ruleRepo: Repository<CancelPolicyRule>,
    @InjectRepository(Tour) private readonly tourRepo: Repository<Tour>,
  ) { }

  list() {
    return this.policyRepo.find({ order: { isDefault: 'DESC', name: 'ASC' } });
  }

  async getOrFail(id: string): Promise<CancelPolicy> {
    const policy = await this.policyRepo.findOne({ where: { id } });
    if (!policy) throw new NotFoundException('Không tìm thấy chính sách hủy');
    return policy;
  }

  /**
   * Chính sách dùng khi admin không chỉ định: ưu tiên `is_default`, nếu chưa có
   * thì lấy chính sách cũ nhất để không chặn việc tạo tour.
   */
  async findDefaultOrFail(): Promise<CancelPolicy> {
    const policy =
      (await this.policyRepo.findOne({ where: { isDefault: true }, order: { createdAt: 'ASC' } })) ??
      (await this.policyRepo.findOne({ order: { createdAt: 'ASC' } }));
    if (!policy) {
      throw new BadRequestException('Chưa có chính sách hủy nào – hãy tạo chính sách trước khi tạo tour');
    }
    return policy;
  }

  async create(dto: CreateCancelPolicyDto): Promise<CancelPolicy> {
    this.assertRules(dto.rules);
    return this.policyRepo.manager.transaction(async (manager) => {
      if (dto.isDefault) await this.clearOtherDefaults(manager, null);
      return this.persist(manager, dto, null);
    });
  }

  async update(id: string, dto: UpdateCancelPolicyDto): Promise<CancelPolicy> {
    const policy = await this.getOrFail(id);
    if (dto.rules !== undefined) this.assertRules(dto.rules);

    return this.policyRepo.manager.transaction(async (manager) => {
      if (dto.isDefault) await this.clearOtherDefaults(manager, id);
      return this.persist(manager, dto, policy);
    });
  }

  /**
   * Xóa chính sách hủy.
   *
   * `tours.cancel_policy_id` là FK `RESTRICT` nên phải chặn trước khi xóa; nếu không
   * MySQL trả lỗi 1451 khó hiểu. Tương tự, không cho xóa chính sách mặc định khi
   * vẫn còn tour dùng nó (chính là trường hợp trên, nhưng báo lỗi rõ nghĩa hơn).
   */
  async remove(id: string): Promise<void> {
    await this.getOrFail(id);
    const usedBy = await this.tourRepo.count({ where: { cancelPolicyId: id } });
    if (usedBy > 0) {
      throw new ConflictException(
        `Chính sách đang được ${usedBy} tour sử dụng – hãy đổi chính sách cho các tour đó trước`,
      );
    }
    const remaining = await this.policyRepo.count();
    if (remaining <= 1) {
      throw new ConflictException('Phải giữ lại ít nhất một chính sách hủy');
    }
    await this.policyRepo.delete({ id });
  }

  /**
   * Trích xuất `calculateFee` của entity ra thành API của service để module booking
   * chỉ phụ thuộc service, không phải tự nạp quan hệ rồi gọi entity.
   */
  async quoteFee(
    cancelPolicyId: string,
    total: number,
    startDate: string,
    requestedAt: Date = new Date(),
  ): Promise<CancellationFeeQuote> {
    const policy = await this.getOrFail(cancelPolicyId);
    const result = policy.calculateFee(total, startDate, requestedAt);
    return {
      ...result,
      policyId: policy.id,
      policyName: policy.name,
      rules: (policy.rules ?? []).map((rule) => ({ daysBefore: rule.daysBefore, feePercent: rule.feePercent })),
      startDate: startDate.slice(0, 10),
    };
  }

  // ===== nội bộ =====

  private async persist(
    manager: EntityManager,
    dto: CreateCancelPolicyDto | UpdateCancelPolicyDto,
    existing: CancelPolicy | null,
  ): Promise<CancelPolicy> {
    const policy = existing ?? manager.create(CancelPolicy, { name: '', isDefault: false });

    if (dto.name !== undefined) policy.name = dto.name.trim();
    if (dto.description !== undefined) policy.description = dto.description?.trim() || null;
    if (dto.isDefault !== undefined) policy.isDefault = dto.isDefault;

    const saved = await manager.save(policy);

    if (dto.rules !== undefined) {
      // Thay thế toàn bộ: xóa rule cũ rồi tạo lại theo danh sách mới.
      await manager.delete(CancelPolicyRule, { policyId: saved.id });
      const rules = dto.rules.map((rule) =>
        manager.create(CancelPolicyRule, {
          policyId: saved.id,
          daysBefore: rule.daysBefore,
          feePercent: rule.feePercent,
        }),
      );
      await manager.save(rules);
    }

    return this.getOrFail(saved.id);
  }

  /** `is_default` là cờ duy nhất: bật cho một chính sách thì tắt ở tất cả chính sách khác. */
  private async clearOtherDefaults(manager: EntityManager, exceptId: string | null): Promise<void> {
    const qb = manager
      .createQueryBuilder()
      .update(CancelPolicy)
      .set({ isDefault: false })
      .where('is_default = :flag', { flag: true });
    if (exceptId) qb.andWhere('id <> :exceptId', { exceptId });
    await qb.execute();
  }

  /** `UQ(policy_id, days_before)` – kiểm tra ở service để trả 400 thay vì lỗi 1062. */
  private assertRules(rules: CancelPolicyRuleDto[]): void {
    const seen = new Set<number>();
    for (const rule of rules) {
      if (seen.has(rule.daysBefore)) {
        throw new BadRequestException(`Mốc ${rule.daysBefore} ngày bị lặp – mỗi mốc chỉ một mức phí`);
      }
      seen.add(rule.daysBefore);
    }
  }
}
