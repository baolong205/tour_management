import { statusLabels } from './utils.js';

export const bookingStatuses = ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED', 'REJECTED', 'COMPLETED', 'EXPIRED'];
export const scheduleLabels = { DRAFT: 'Bản nháp', OPEN: 'Đang mở bán', FULL: 'Đã đủ chỗ', CLOSED: 'Đóng bán', ONGOING: 'Đang khởi hành', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy' };
export function operationLabel(status) { return scheduleLabels[status] || statusLabels[status] || status || 'Chưa xác định'; }
export function bookingActions(status, can) {
  return {
    confirm: status === 'PENDING_CONFIRMATION' && can('booking:confirm'),
    process: status === 'CANCEL_REQUESTED' && can('booking:cancel'),
    cancel: ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED'].includes(status) && can('booking:cancel'),
  };
}
export function cancellationBody(approve, reason = '') {
  if (typeof approve !== 'boolean') throw new Error('Vui lòng chọn kết quả xử lý hủy.');
  if (!approve && !reason.trim()) throw new Error('Vui lòng nhập lý do từ chối yêu cầu hủy.');
  if (!approve && reason.trim().length > 500) throw new Error('Lý do từ chối tối đa 500 ký tự.');
  return approve ? { approve: true } : { approve: false, rejectReason: reason.trim() };
}
export function validateDateRange(fromDate, toDate) {
  if (fromDate && toDate && fromDate > toDate) throw new Error('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
}