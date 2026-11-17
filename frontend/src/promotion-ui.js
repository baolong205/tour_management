import { money } from './lib/utils.js';

const percent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

/**
 * Nhãn mô tả mức giảm của một mã (PERCENT hoặc FIXED).
 * Dùng chung cho thẻ ưu đãi ở trang chủ và trang "Ưu đãi của tôi".
 */
export function promotionHeadline(promotion) {
  if (!promotion) return '';
  if (promotion.type === 'PERCENT') return `Giảm ${percent.format(promotion.value)}%`;
  return `Giảm ${money(promotion.value)}`;
}

/**
 * Điều kiện áp dụng dạng câu ngắn: đơn tối thiểu + trần giảm.
 * Trả chuỗi rỗng khi mã không có điều kiện nào để tránh dòng trống trên thẻ.
 */
export function promotionCondition(promotion) {
  if (!promotion) return '';
  const parts = [];
  if (promotion.minOrder > 0) parts.push(`Đơn từ ${money(promotion.minOrder)}`);
  if (promotion.maxDiscount != null) parts.push(`giảm tối đa ${money(promotion.maxDiscount)}`);
  return parts.join(' · ');
}

/** Bốn loại phạm vi áp dụng backend hỗ trợ (`PromotionScopeType`). */
export const scopeTypes = [
  { value: 'TOUR', label: 'Tour' },
  { value: 'CATEGORY', label: 'Danh mục' },
  { value: 'DESTINATION', label: 'Điểm đến' },
  { value: 'SCHEDULE', label: 'Lịch khởi hành' },
];

/**
 * Tách danh sách ID khách hàng người dùng dán vào (cách nhau bởi dấu phẩy,
 * chấm phẩy, khoảng trắng hoặc xuống dòng) và loại bỏ trùng lặp.
 */
export function parseCustomerIds(text) {
  return [...new Set(String(text ?? '').split(/[\s,;]+/).map(value => value.trim()).filter(Boolean))];
}

/**
 * Câu mô tả phạm vi áp dụng: mảng rỗng nghĩa là mã áp toàn hệ thống.
 */
export function scopeSummary(scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0) return 'Áp dụng toàn hệ thống';
  return `${scopes.length} phạm vi áp dụng`;
}

/**
 * Nhãn tiếng Việt cho một dòng phạm vi.
 */
export function scopeLabel(scope) {
  const type = scopeTypes.find(item => item.value === scope?.scopeType);
  return `${type?.label ?? scope?.scopeType ?? 'Phạm vi'} · ${scope?.scopeId ?? ''}`;
}
