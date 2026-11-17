// Explicit staff-facing allowlist; permissions never grant an Admin screen here.
export const staffSections = [
  { key: 'bookings', label: 'Xử lý đơn đặt tour', permission: 'booking:read', icon: 'bag', description: 'Kiểm tra hành khách, xác nhận và xử lý yêu cầu hủy.' },
  { key: 'payments', label: 'Đối chiếu thanh toán', permission: 'payment:read', icon: 'wallet', description: 'Kiểm tra giao dịch và đối chiếu chứng từ chuyển khoản.' },
  { key: 'schedules', label: 'Lịch khởi hành', permission: 'schedule:read', icon: 'calendar', description: 'Tra cứu lịch đi, điểm tập trung và số chỗ.' },
  { key: 'customers', label: 'Tra cứu khách hàng', permission: 'user:read', icon: 'users', description: 'Tra cứu thông tin liên hệ để hỗ trợ khách.' },
  { key: 'support', label: 'Yêu cầu hỗ trợ', permission: 'support:manage', icon: 'headset', description: 'Tiếp nhận và phản hồi các yêu cầu CSKH.' },
  { key: 'notify', label: 'Gửi thông báo', permission: 'notification:manage', icon: 'bell', description: 'Gửi thông tin và nhắc lịch khởi hành cho khách.' },
];
export function permittedStaffSections(user) {
  if (!user?.roles?.includes('STAFF') || user.roles.includes('ADMIN')) return [];
  return staffSections.filter(section => user.permissions?.includes(section.permission));
}