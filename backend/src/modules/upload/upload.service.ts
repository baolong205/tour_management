import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  UPLOAD_PUBLIC_PREFIX,
  UPLOAD_ROOT,
} from './upload.constants.js';

/**
 * Phần tối thiểu của tệp Multer mà service cần.
 *
 * `tsconfig.json` đặt `types: ["vitest/globals", "node"]` nên namespace toàn cục
 * `Express.Multer` **không** được nạp; khai báo kiểu riêng ở đây vừa tránh phụ
 * thuộc vào global đó, vừa giữ cho service dễ test (chỉ cần object có 4 trường).
 */
export interface MulterFileLike {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** Kết quả trả về cho client sau khi lưu tệp thành công. */
export interface UploadedFileView {
  /** Tên tệp đã sinh (đã đổi tên, không dùng tên gốc của client). */
  filename: string;
  /** Đường dẫn tương đối để ghép với domain khi hiển thị. */
  path: string;
  /** URL đầy đủ nếu truyền `PUBLIC_BASE_URL`, ngược lại bằng `path`. */
  url: string;
  mimetype: string;
  size: number;
}

/**
 * Lưu và kiểm tra tệp tải lên.
 *
 * Nguyên tắc an toàn:
 * - **Không tin tên tệp của client**: tên gốc có thể chứa `../`, byte NUL hoặc
 *   ký tự đặc biệt để ghi đè tệp ngoài thư mục cho phép. Tên lưu luôn do server
 *   sinh (`uuid` + đuôi suy ra từ MIME đã kiểm).
 * - **Kiểm tra chữ ký nhị phân**, không chỉ `mimetype` (client tự khai, dễ giả).
 * - Giới hạn dung lượng được Multer chặn trước, service kiểm tra lại để phòng
 *   trường hợp gọi trực tiếp.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  /** Thư mục gốc tuyệt đối, đã chuẩn hoá để so sánh an toàn. */
  private get rootDir(): string {
    return path.resolve(process.cwd(), UPLOAD_ROOT);
  }

  /** Tạo thư mục con nếu chưa có (idempotent, an toàn khi chạy song song). */
  async ensureFolder(folder: string): Promise<string> {
    const dir = path.join(this.rootDir, folder);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  /**
   * Kiểm tra & lưu một tệp vào thư mục con.
   *
   * @param file tệp Multer đã ghi tạm vào bộ nhớ (`memoryStorage`).
   * @param folder thư mục con, phải nằm trong danh sách trắng.
   */
  async save(file: MulterFileLike | undefined, folder: string): Promise<UploadedFileView> {
    if (!file) {
      throw new BadRequestException('Không tìm thấy tệp trong yêu cầu (field name: "file")');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `Tệp vượt quá dung lượng cho phép (${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB)`,
      );
    }

    const allowed = ALLOWED_MIME_TYPES[file.mimetype];
    if (!allowed) {
      throw new BadRequestException(
        `Định dạng tệp không được hỗ trợ. Chỉ chấp nhận: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`,
      );
    }

    const validSignature = await this.matchesMagicBytes(file.buffer, allowed.magic);
    if (!validSignature) {
      throw new BadRequestException(
        'Nội dung tệp không khớp với định dạng khai báo. Tệp có thể đã bị đổi phần mở rộng.',
      );
    }

    const filename = `${randomUUID()}${allowed.ext}`;
    const dir = await this.ensureFolder(folder);
    const absolute = path.join(dir, filename);

    // Chốt chặn cuối: đường dẫn tuyệt đối phải nằm trong thư mục gốc.
    if (!this.isInsideRoot(absolute)) {
      throw new BadRequestException('Đường dẫn tệp không hợp lệ');
    }

    await fs.writeFile(absolute, file.buffer, { mode: 0o644 });

    const relative = `${UPLOAD_PUBLIC_PREFIX}/${folder}/${filename}`;
    const baseUrl = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/+$/, '');

    this.logger.log(`Đã lưu tệp ${relative} (${file.size} bytes, ${file.mimetype})`);

    return {
      filename,
      path: relative,
      url: baseUrl ? `${baseUrl}${relative}` : relative,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  /** Lưu nhiều tệp, dừng ngay khi một tệp không hợp lệ. */
  async saveMany(files: MulterFileLike[] | undefined, folder: string): Promise<UploadedFileView[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không tìm thấy tệp trong yêu cầu (field name: "files")');
    }
    const saved: UploadedFileView[] = [];
    for (const file of files) {
      saved.push(await this.save(file, folder));
    }
    return saved;
  }

  /**
   * Xoá tệp theo URL công khai (dùng khi cập nhật ảnh mới hoặc xoá bản ghi).
   *
   * Chỉ xoá khi đường dẫn thực sự nằm trong thư mục upload; mọi input khác bị
   * bỏ qua thay vì ném lỗi, vì đây là thao tác dọn dẹp không nên chặn nghiệp vụ.
   */
  async removeByPublicPath(publicPath: string): Promise<boolean> {
    if (!publicPath.startsWith(`${UPLOAD_PUBLIC_PREFIX}/`)) return false;

    const relative = publicPath.slice(UPLOAD_PUBLIC_PREFIX.length + 1);
    const absolute = path.resolve(this.rootDir, relative);
    if (!this.isInsideRoot(absolute)) return false;

    try {
      await fs.unlink(absolute);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      this.logger.warn(`Không xoá được tệp ${publicPath}: ${(error as Error).message}`);
      return false;
    }
  }

  /** So khớp các byte đầu tệp với danh sách chữ ký cho phép. */
  private async matchesMagicBytes(buffer: Buffer, magic: number[][]): Promise<boolean> {
    if (!buffer || buffer.length < 8) return false;
    return magic.some((signature) =>
      signature.every((byte, index) => buffer[index] === byte),
    );
  }

  /** `true` nếu đường dẫn tuyệt đối nằm trong thư mục upload (chặn `../`). */
  private isInsideRoot(absolute: string): boolean {
    const root = this.rootDir;
    const normalized = path.resolve(absolute);
    return normalized === root || normalized.startsWith(root + path.sep);
  }

  /**
   * Đọc 8 byte đầu của một tệp trên đĩa – dùng cho job kiểm tra định kỳ nếu cần
   * xác thực lại tệp đã lưu (ví dụ sau khi khôi phục từ backup).
   */
  async readSignature(absolutePath: string): Promise<Buffer | null> {
    try {
      const handle = await open(absolutePath, 'r');
      try {
        const buffer = Buffer.alloc(8);
        await handle.read(buffer, 0, 8, 0);
        return buffer;
      } finally {
        await handle.close();
      }
    } catch {
      return null;
    }
  }
}