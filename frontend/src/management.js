const text = (name, label, required = true, extra = {}) => ({ name, label, required, ...extra });
const number = (name, label, min = 0, extra = {}) => text(name, label, true, { type: 'number', min, ...extra });
const select = (name, label, options) => text(name, label, true, { options });
const boolean = (name, label, defaultValue = 'true') => text(name, label, true, { type: 'boolean', options: [{ value: 'true', label: 'Có' }, { value: 'false', label: 'Không' }], defaultValue });

export const management = {
  categories: { title: 'Danh mục tour', path: '/catalog/categories', permission: 'category:write', columns: ['name', 'slug'], fields: [text('name', 'Tên danh mục', true, { minLength: 2, maxLength: 100 }), text('slug', 'Đường dẫn (slug)', true, { pattern: '[a-z0-9]+(-[a-z0-9]+)*' })] },
  destinations: { title: 'Địa điểm du lịch', path: '/catalog/destinations', permission: 'category:write', columns: ['name', 'slug', 'description'], fields: [text('name', 'Tên địa điểm', true, { minLength: 2, maxLength: 150 }), text('slug', 'Đường dẫn (slug)'), text('description', 'Giới thiệu', false, { type: 'textarea', maxLength: 2000 }), number('latitude', 'Vĩ độ', -90, { max: 90, required: false, step: 'any' }), number('longitude', 'Kinh độ', -180, { max: 180, required: false, step: 'any' })] },
  schedules: { title: 'Lịch khởi hành', path: '/schedules', permission: 'schedule:read', write: 'schedule:write', paginated: true, detail: true, columns: ['tourName', 'startDate', 'endDate', 'maxSeats', 'availableSeats', 'status'], fields: [text('tourId', 'Mã định danh tour', true, { help: 'ID tour đã công bố; lấy ở màn quản lý tour.' }), text('startDate', 'Ngày khởi hành', true, { type: 'date' }), text('endDate', 'Ngày kết thúc', true, { type: 'date' }), number('priceAdult', 'Giá người lớn'), number('priceChild', 'Giá trẻ em'), number('priceInfant', 'Giá em bé'), number('maxSeats', 'Số chỗ tối đa', 1, { max: 1000 }), select('status', 'Trạng thái', ['DRAFT', 'OPEN', 'FULL', 'CLOSED', 'ONGOING', 'COMPLETED', 'CANCELLED']), text('meetingPoint', 'Điểm tập trung', false, { maxLength: 255 })] },
  promotions: { title: 'Khuyến mãi', path: '/promotions', permission: 'promotion:manage', paginated: true, columns: ['code', 'type', 'value', 'validFrom', 'validTo', 'active'], fields: [text('code', 'Mã giảm giá', true, { minLength: 3, maxLength: 40 }), select('type', 'Loại giảm', ['PERCENT', 'FIXED']), number('value', 'Mức giảm'), number('minOrder', 'Đơn tối thiểu', 0, { defaultValue: 0 }), number('maxDiscount', 'Trần giảm', 0, { required: false }), number('usageLimit', 'Tổng lượt tối đa', 1, { required: false }), number('perUserLimit', 'Lượt mỗi khách', 1, { defaultValue: 1, max: 100 }), text('validFrom', 'Hiệu lực từ', true, { type: 'datetime-local' }), text('validTo', 'Hiệu lực đến', true, { type: 'datetime-local' }), boolean('active', 'Đang hoạt động')] },
  banners: { title: 'Banner trang chủ', path: '/banners', permission: 'system:setting', paginated: true, columns: ['title', 'imageUrl', 'active', 'sortOrder'], fields: [text('title', 'Tiêu đề', true, { maxLength: 200 }), text('imageUrl', 'URL ảnh', true), text('linkUrl', 'Đường dẫn khi bấm', false, { help: 'Dùng #/tours hoặc https://...' }), number('sortOrder', 'Thứ tự', 0, { defaultValue: 0 }), boolean('active', 'Hiển thị'), text('startAt', 'Bắt đầu', false, { type: 'datetime-local' }), text('endAt', 'Kết thúc', false, { type: 'datetime-local' })] },
  policies: { title: 'Chính sách hủy', path: '/catalog/cancel-policies', permission: 'tour:write', columns: ['name', 'description', 'isDefault'], fields: [text('name', 'Tên chính sách', true, { minLength: 3, maxLength: 150 }), text('description', 'Mô tả', false, { type: 'textarea' }), boolean('isDefault', 'Mặc định', 'false'), text('rules', 'Các mốc phí hủy (JSON)', true, { type: 'json', defaultValue: [{ daysBefore: 7, feePercent: 0 }, { daysBefore: 0, feePercent: 100 }], help: 'Mảng gồm daysBefore (số ngày trước chuyến đi), feePercent (0–100).' })] },
  settings: { title: 'Cấu hình hệ thống', path: '/system/settings', permission: 'system:setting', key: 'key', method: 'PUT', columns: ['key', 'value', 'description'], fields: [text('key', 'Khóa cấu hình', true, { maxLength: 100 }), text('value', 'Giá trị JSON', true, { type: 'json' }), text('description', 'Mô tả', false, { maxLength: 255 })] },
};

export const columnLabels = { name: 'Tên', slug: 'Slug', description: 'Mô tả', tourName: 'Tour', startDate: 'Khởi hành', endDate: 'Kết thúc', maxSeats: 'Tổng chỗ', availableSeats: 'Còn trống', status: 'Trạng thái', code: 'Mã', type: 'Loại', value: 'Giá trị', validFrom: 'Bắt đầu', validTo: 'Kết thúc', active: 'Hoạt động', title: 'Tiêu đề', imageUrl: 'Ảnh', sortOrder: 'Thứ tự', isDefault: 'Mặc định', key: 'Khóa' };

export function canEnterWorkspace(user) {
  return user?.roles?.some(role => role === 'ADMIN' || role === 'STAFF');
}

export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function reportCsv(items) {
  return '\uFEFF' + [['Kỳ', 'Tiền nhận', 'Tiền hoàn', 'Thu ròng', 'Giao dịch'], ...items.map(row => [row.period, row.received, row.refunded, row.net, row.transactions])].map(row => row.map(csvCell).join(',')).join('\r\n');
}