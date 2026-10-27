import type { PromotionType } from '../../../common/enums/index.js';

/** Bản hiển thị của mã khuyến mãi trả về cho client. */
export interface PromotionView {
  id: string;
  code: string;
  type: PromotionType;
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  usageLimit: number | null;
  usedCount: number;
  /** Số lượt còn lại, `null` khi không giới hạn. */
  remainingUses: number | null;
  perUserLimit: number;
  validFrom: Date;
  validTo: Date;
  active: boolean;
  /** Mã còn dùng được ở thời điểm hiện tại? (không xét `perUserLimit`). */
  usable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Kết quả áp thử mã: cho FE hiển thị đúng số tiền sẽ được giảm. */
export interface PromotionQuoteView {
  code: string;
  subtotal: number;
  discount: number;
  total: number;
  type: PromotionType;
  value: number;
}
