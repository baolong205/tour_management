import { RoleName } from '../enums/index.js';

/**
 * Bộ mã quyền mặc định của hệ thống (dạng `resource:action`).
 * Nguồn duy nhất cho cả seed DB lẫn tài liệu – thêm quyền mới chỉ cần bổ sung ở đây
 * rồi chạy lại `npm run db:seed`.
 */
export const PERMISSION_DEFINITIONS: { code: string; description: string }[] = [
  { code: 'support:manage', description: 'Tiếp nhận và trả lời yêu cầu CSKH' },
  // người dùng & phân quyền
  { code: 'user:read', description: 'Xem danh sách và hồ sơ người dùng' },
  { code: 'user:manage', description: 'Cập nhật, khóa, xóa người dùng' },
  { code: 'role:manage', description: 'Xem vai trò và gán quyền' },
  // tour & danh mục
  { code: 'tour:read', description: 'Xem tour' },
  { code: 'tour:write', description: 'Tạo, sửa, ẩn/hiện tour' },
  { code: 'tour:delete', description: 'Xóa tour' },
  { code: 'category:write', description: 'Quản lý danh mục và điểm đến' },
  // lịch khởi hành
  { code: 'schedule:read', description: 'Xem lịch khởi hành' },
  { code: 'schedule:write', description: 'Tạo và điều chỉnh lịch khởi hành' },
  // booking & thanh toán
  { code: 'booking:read', description: 'Xem đơn đặt tour' },
  { code: 'booking:create', description: 'Tạo đơn đặt tour' },
  { code: 'booking:confirm', description: 'Xác nhận / từ chối đơn' },
  { code: 'booking:cancel', description: 'Xử lý yêu cầu hủy' },
  { code: 'payment:read', description: 'Xem giao dịch thanh toán' },
  { code: 'payment:refund', description: 'Hoàn tiền' },
  // vận hành
  { code: 'guide:assign', description: 'Phân công hướng dẫn viên' },
  { code: 'guide:attend', description: 'Điểm danh khách' },
  { code: 'incident:manage', description: 'Xử lý sự cố' },
  { code: 'supplier:manage', description: 'Quản lý nhà cung cấp và phân bổ nguồn lực' },
  // hệ thống
  { code: 'promotion:manage', description: 'Quản lý khuyến mãi' },
  { code: 'review:moderate', description: 'Kiểm duyệt đánh giá' },
  { code: 'notification:manage', description: 'Gửi thông báo cho người dùng' },
  { code: 'report:read', description: 'Xem báo cáo thống kê' },
  { code: 'system:setting', description: 'Thay đổi cấu hình hệ thống' },
  { code: 'file:upload', description: 'Tải tệp lên hệ thống (ảnh tour, biên lai, tài liệu)' },
];

const CUSTOMER_PERMISSIONS = ['tour:read', 'booking:create'];

const GUIDE_PERMISSIONS = ['tour:read', 'schedule:read', 'booking:read', 'guide:attend', 'incident:manage'];

const STAFF_PERMISSIONS = [
  'user:read',
  'tour:read',
  'schedule:read',
  'booking:read',
  'booking:create',
  'booking:confirm',
  'booking:cancel',
  'payment:read',
  'notification:manage',
  'support:manage',
  'file:upload',
];

/** Admin = đủ quyền của Staff + nhóm quyền hệ thống (không lưu quan hệ kế thừa trong DB). */
const ADMIN_PERMISSIONS = PERMISSION_DEFINITIONS.map(permission => permission.code);

export const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  [RoleName.CUSTOMER]: CUSTOMER_PERMISSIONS,
  [RoleName.GUIDE]: GUIDE_PERMISSIONS,
  [RoleName.STAFF]: STAFF_PERMISSIONS,
  [RoleName.ADMIN]: ADMIN_PERMISSIONS,
};

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  [RoleName.CUSTOMER]: 'Khách hàng – đặt tour và quản lý đơn của mình',
  [RoleName.GUIDE]: 'Hướng dẫn viên – nhận lịch và điểm danh khách',
  [RoleName.STAFF]: 'Nhân viên – vận hành tour, đơn đặt và thanh toán',
  [RoleName.ADMIN]: 'Quản trị viên – toàn quyền hệ thống',
};
