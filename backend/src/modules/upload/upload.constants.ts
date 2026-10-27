/**
 * Cấu hình tải tệp.
 *
 * Trước đây hệ thống **không có endpoint tải tệp nào**: ảnh tour, ảnh đại diện,
 * biên lai chuyển khoản đều phải dán URL ngoài. Điều này khiến dữ liệu không
 * tự chủ (ảnh có thể biến mất) và mở đường cho người dùng dán link lạ vào hệ
 * thống. Module `upload` bổ sung đường tải tệp chuẩn, có kiểm tra loại tệp và
 * giới hạn dung lượng ngay tại tầng nhận request.
 */

/** Thư mục gốc lưu tệp, tính từ thư mục chạy tiến trình backend. */
export const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? 'uploads';

/** Tiền tố URL công khai, khớp với `useStaticAssets` trong `main.ts`. */
export const UPLOAD_PUBLIC_PREFIX = '/uploads';

/** Dung lượng tối đa cho một tệp: 5 MB. */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Số tệp tối đa trong một lần gửi nhiều tệp. */
export const MAX_FILES_PER_REQUEST = 5;

/**
 * Loại tệp được phép, ánh xạ MIME → đuôi tệp và chữ ký nhị phân đầu tệp.
 *
 * `magic` là các byte đầu tệp; kiểm tra chữ ký nhị phân quan trọng vì `mimetype`
 * do client tự khai và **rất dễ bị giả** (đổi `Content-Type` của một file `.exe`
 * thành `image/png`). Không kiểm tra thì kẻ tấn công có thể tải lên tệp thực thi
 * hoặc HTML có script rồi dụ người khác mở.
 */
export interface AllowedMime {
  /** Đuôi tệp dùng khi lưu. */
  ext: string;
  /** Danh sách chữ ký hợp lệ (mỗi phần tử là dãy byte đầu tệp). */
  magic: number[][];
}

export const ALLOWED_MIME_TYPES: Record<string, AllowedMime> = {
  'image/jpeg': { ext: '.jpg', magic: [[0xff, 0xd8, 0xff]] },
  'image/png': { ext: '.png', magic: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
  'image/webp': { ext: '.webp', magic: [[0x52, 0x49, 0x46, 0x46]] },
  'image/gif': { ext: '.gif', magic: [[0x47, 0x49, 0x46, 0x38]] },
  'application/pdf': { ext: '.pdf', magic: [[0x25, 0x50, 0x44, 0x46]] },
};

/** `accept` cho thẻ `<input type="file">` ở phía client. */
export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_MIME_TYPES).join(',');

/** Nhóm thư mục con được phép ghi, tránh việc client tự chọn đường dẫn. */
export const UPLOAD_FOLDERS = ['tours', 'avatars', 'receipts', 'documents'] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export function isUploadFolder(value: string): value is UploadFolder {
  return (UPLOAD_FOLDERS as readonly string[]).includes(value);
}