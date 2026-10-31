import { management } from './management.js';

export const workspaceSections = [
  { key: 'overview', label: 'Tổng quan', permission: 'report:read', group: 'TỔNG QUAN', icon: 'globe' },
  { key: 'tours', label: 'Tour & lịch trình', permission: 'tour:write', group: 'SẢN PHẨM', icon: 'pin' },
  ...Object.entries(management).map(([key, config]) => ({ key, label: config.title, permission: config.permission, group: ['settings', 'banners', 'policies'].includes(key) ? 'HỆ THỐNG' : 'SẢN PHẨM', icon: key === 'schedules' ? 'calendar' : 'globe' })),
  { key: 'bookings', label: 'Đơn đặt tour', permission: 'booking:read', group: 'NGHIỆP VỤ', icon: 'calendar' },
  { key: 'payments', label: 'Thanh toán', permission: 'payment:read', group: 'NGHIỆP VỤ', icon: 'shield' },
  { key: 'refunds', label: 'Hoàn tiền', permission: 'payment:refund', group: 'NGHIỆP VỤ', icon: 'shield' },
  { key: 'customers', label: 'Khách hàng', permission: 'user:read', group: 'NGHIỆP VỤ', icon: 'users' },
  { key: 'reviews', label: 'Kiểm duyệt đánh giá', permission: 'review:moderate', group: 'NGHIỆP VỤ', icon: 'heart' },
  { key: 'support', label: 'Hỗ trợ CSKH', permission: 'support:manage', group: 'NGHIỆP VỤ', icon: 'users' },
  { key: 'notify', label: 'Gửi thông báo', permission: 'notification:manage', group: 'NGHIỆP VỤ', icon: 'arrow' },
  { key: 'staff', label: 'Nhân viên & vai trò', permission: 'role:manage', group: 'HỆ THỐNG', icon: 'users' },
  { key: 'reports', label: 'Thống kê doanh thu', permission: 'report:read', group: 'BÁO CÁO', icon: 'grid' },
];

export function permittedSections(user) {
  if (!user?.roles?.includes('ADMIN')) return [];
  return workspaceSections.filter(section => user.permissions?.includes(section.permission));
}

export function activeWorkspaceSection(user, params) {
  const sections = permittedSections(user);
  return params.get('tab') || sections[0]?.key;
}