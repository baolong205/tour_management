export const passengerLabels = { ADULT: 'Người lớn', CHILD: 'Trẻ em', INFANT: 'Em bé' };
export const paymentMethodLabels = { BANK_TRANSFER: 'Chuyển khoản ngân hàng', OFFICE: 'Thanh toán tại văn phòng', VNPAY: 'VNPay — giả lập', MOMO: 'MoMo — giả lập' };

export function passengerGroups(passengers = []) {
  const groups = new Map();
  for (const passenger of passengers) {
    const key = `${passenger.type}:${passenger.unitPrice}`;
    const group = groups.get(key) || { type: passenger.type, label: passengerLabels[passenger.type] || 'Hành khách', quantity: 0, unitPrice: Number(passenger.unitPrice), amount: 0 };
    group.quantity += 1;
    group.amount += Number(passenger.unitPrice);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function canRequestCancellation(booking) {
  return ['PENDING_CONFIRMATION', 'PENDING_PAYMENT', 'CONFIRMED'].includes(booking?.status);
}

export function bookingProgress(booking, payment) {
  const stopped = ['CANCELLED', 'CANCEL_REQUESTED', 'REJECTED', 'EXPIRED'].includes(booking.status);
  const paid = !!payment && Number(payment.paidTotal) > 0 && Number(payment.outstanding) <= 0;
  const confirmed = !!booking.confirmedAt || ['CONFIRMED', 'COMPLETED'].includes(booking.status);
  return [
    { label: 'Đặt tour', icon: 'check', done: true, date: booking.createdAt },
    { label: 'Thanh toán', icon: 'wallet', done: paid, date: null },
    { label: 'Xác nhận', icon: 'document', done: confirmed, date: booking.confirmedAt },
    { label: 'Khởi hành', icon: 'plane', done: booking.status === 'COMPLETED', date: booking.startDate },
    { label: 'Hoàn thành', icon: 'flag', done: booking.status === 'COMPLETED', date: null },
  ].map((step, index, steps) => ({ ...step, active: !stopped && !step.done && (index === 0 || steps[index - 1].done) }));
}

export function isAccountPath(path) {
  return ['/account', '/account/overview', '/account/security', '/bookings', '/favorites', '/reviews', '/notifications', '/support'].includes(path) || /^\/(bookings|payment)\/[^/]+$/.test(path);
}