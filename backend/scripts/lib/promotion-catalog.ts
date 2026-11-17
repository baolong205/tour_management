import type { EntityManager } from 'typeorm';
import { PromotionStatus, PromotionType } from '../../src/common/enums/index.js';
import { Promotion } from '../../src/modules/promotion/entities/promotion.entity.js';

export const PROMOTION_CATALOG = [
  { code: 'TOURGO5', type: PromotionType.PERCENT, value: 5, minOrder: 1_000_000, maxDiscount: 150_000, usageLimit: 500, perUserLimit: 1 },
  { code: 'DICHILL8', type: PromotionType.PERCENT, value: 8, minOrder: 1_500_000, maxDiscount: 250_000, usageLimit: 300, perUserLimit: 2 },
  { code: 'TOURGO10', type: PromotionType.PERCENT, value: 10, minOrder: 2_000_000, maxDiscount: 400_000, usageLimit: 300, perUserLimit: 2 },
  { code: 'KHAMPHA12', type: PromotionType.PERCENT, value: 12, minOrder: 3_000_000, maxDiscount: 600_000, usageLimit: 200, perUserLimit: 1 },
  { code: 'DIXA15', type: PromotionType.PERCENT, value: 15, minOrder: 4_000_000, maxDiscount: 800_000, usageLimit: 150, perUserLimit: 1 },
  { code: 'TIETKIEM100', type: PromotionType.FIXED, value: 100_000, minOrder: 1_000_000, maxDiscount: null, usageLimit: 500, perUserLimit: 2 },
  { code: 'VIETNAM200', type: PromotionType.FIXED, value: 200_000, minOrder: 2_000_000, maxDiscount: null, usageLimit: 300, perUserLimit: 2 },
  { code: 'HANHTRINH300', type: PromotionType.FIXED, value: 300_000, minOrder: 3_000_000, maxDiscount: null, usageLimit: 200, perUserLimit: 1 },
  { code: 'VIVU500', type: PromotionType.FIXED, value: 500_000, minOrder: 5_000_000, maxDiscount: null, usageLimit: 150, perUserLimit: 1 },
  { code: 'TRONVEN1TR', type: PromotionType.FIXED, value: 1_000_000, minOrder: 10_000_000, maxDiscount: null, usageLimit: 100, perUserLimit: 1 },
] as const;

/** Call inside a transaction. Existing campaign settings and usage stay intact. */
export async function seedPromotionCatalog(manager: EntityManager, now = new Date()) {
  const repo = manager.getRepository(Promotion);
  const validFrom = new Date(now.getTime() - 60_000);
  const validTo = new Date(now.getTime() + 365 * 86_400_000);
  let created = 0;
  for (const campaign of PROMOTION_CATALOG) {
    if (await repo.existsBy({ code: campaign.code })) continue;
    await repo.save(repo.create({ ...campaign, usedCount: 0, active: true, status: PromotionStatus.ACTIVE, validFrom, validTo }));
    created++;
  }
  return { created, skipped: PROMOTION_CATALOG.length - created };
}
