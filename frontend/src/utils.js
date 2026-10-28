export function money(value) {
  return value == null ? 'Liên hệ' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value));
}
export function date(value) {
  return value ? new Intl.DateTimeFormat('vi-VN').format(new Date(value.length === 10 ? `${value}T00:00:00` : value)) : 'Chưa xác định';
}
export function queryString(values) {
  return new URLSearchParams(Object.entries(values).filter(([, value]) => value !== '' && value != null)).toString();
}
export function safeNext(value) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}
export const statusLabels = { DRAFT: 'Bản nháp', PUBLISHED: 'Đang mở bán', HIDDEN: 'Đã ẩn', PENDING: 'Chờ xử lý', PENDING_CONFIRMATION: 'Chờ xác nhận', PENDING_PAYMENT: 'Chờ thanh toán', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy', CANCEL_REQUESTED: 'Yêu cầu hủy', EXPIRED: 'Hết hạn', COMPLETED: 'Hoàn thành', REJECTED: 'Từ chối', OPEN: 'Mở bán' };