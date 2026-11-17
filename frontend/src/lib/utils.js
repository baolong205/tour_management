export function money(value) {
  return value == null ? 'Liên hệ' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value));
}
export function date(value) {
  return value ? new Intl.DateTimeFormat('vi-VN').format(new Date(value.length === 10 ? `${value}T00:00:00` : value)) : 'Chưa xác định';
}
export function queryString(values) {
  return new URLSearchParams(Object.entries(values).filter(([, value]) => value !== '' && value != null)).toString();
}

/**
 * Đường dẫn lấy danh sách mã ưu đãi kèm ngữ cảnh giỏ hàng.
 *
 * Gửi `subtotal` + `scheduleId` để backend chạy `DiscountEngine` và trả
 * `estimatedDiscount` / `rejectedReason` thật, thay vì FE tự đoán.
 */
export function promotionAvailablePath(subtotal, scheduleId) {
  const query = queryString({
    subtotal: Number.isFinite(subtotal) && subtotal >= 0 ? subtotal : '',
    scheduleId: scheduleId || '',
  });
  return query ? `/promotions/available?${query}` : '/promotions/available';
}

/**
 * Sắp xếp voucher: mã dùng được lên trước, trong cùng nhóm thì mã giảm nhiều
 * tiền hơn đứng trước. Không sửa mảng đầu vào.
 */
export function sortVouchers(items) {
  return [...(items ?? [])].sort((a, b) => {
    const usableA = a.rejectedReason ? 0 : 1;
    const usableB = b.rejectedReason ? 0 : 1;
    if (usableA !== usableB) return usableB - usableA;
    return (b.estimatedDiscount ?? 0) - (a.estimatedDiscount ?? 0);
  });
}
/**
 * Chỉ gọi `POST /promotions/best-for-cart` khi có đủ ngữ cảnh giỏ hàng:
 * backend yêu cầu `subtotal` là số nguyên >= 0 và `scheduleId` là UUID.
 */
export function canRequestBestOffer(subtotal, scheduleId) {
  return Number.isInteger(subtotal) && subtotal >= 0 && typeof scheduleId === 'string' && scheduleId.length > 0;
}

/**
 * Chọn mã có mức giảm cao nhất trong `applied` của BestOfferView.
 * Trả `null` khi không có mã nào dùng được.
 */
export function bestOfferCode(offer) {
  if (!offer || !Array.isArray(offer.applied) || offer.applied.length === 0) return null;
  return offer.applied.reduce((best, item) => (item.discount > best.discount ? item : best), offer.applied[0]);
}
export function safeNext(value) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}
export const statusLabels = { DRAFT: 'Bản nháp', PUBLISHED: 'Đang mở bán', HIDDEN: 'Đã ẩn', PENDING: 'Chờ xử lý', PENDING_CONFIRMATION: 'Chờ xác nhận', PENDING_PAYMENT: 'Chờ thanh toán', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy', CANCEL_REQUESTED: 'Yêu cầu hủy', EXPIRED: 'Hết hạn', COMPLETED: 'Hoàn thành', REJECTED: 'Từ chối', OPEN: 'Mở bán' };