import {
  BadRequestException,
  Controller,
  Delete,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_REQUEST,
  UPLOAD_FOLDERS,
  isUploadFolder,
} from './upload.constants.js';
import { UploadService, type MulterFileLike } from './upload.service.js';

/**
 * Endpoint tải tệp.
 *
 * Dùng `memoryStorage` để tệp nằm trong RAM cho tới khi service kiểm tra xong
 * chữ ký nhị phân; chỉ tệp hợp lệ mới được ghi xuống đĩa. Nếu dùng
 * `diskStorage` trực tiếp, tệp độc hại sẽ **đã** nằm trên đĩa trước khi bị phát
 * hiện, và mọi lỗi validate đều để lại rác.
 *
 * Giới hạn dung lượng đặt ở Multer (chặn sớm, không đọc hết body vào RAM) và
 * kiểm tra lại trong service.
 */
@ApiTags('Upload')
@ApiBearerAuth()
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Post()
  @RequirePermissions('file:upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'folder',
    required: false,
    enum: UPLOAD_FOLDERS,
    description: 'Nhóm thư mục lưu tệp (mặc định `documents`).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary: 'Tải lên một tệp',
    description:
      `Tối đa ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB. ` +
      `Định dạng: ${ACCEPT_ATTRIBUTE}. Nội dung tệp được kiểm tra chữ ký nhị phân, ` +
      'không chỉ dựa vào Content-Type do client khai.',
  })
  uploadOne(
    @UploadedFile() file: MulterFileLike | undefined,
    @Query('folder') folder?: string,
  ) {
    return this.uploadService.save(file, this.resolveFolder(folder));
  }

  @Post('multiple')
  @RequirePermissions('file:upload')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_REQUEST, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_FILES_PER_REQUEST },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'folder', required: false, enum: UPLOAD_FOLDERS })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiOperation({
    summary: 'Tải lên nhiều tệp',
    description: `Tối đa ${MAX_FILES_PER_REQUEST} tệp, mỗi tệp tối đa ${Math.round(
      MAX_FILE_SIZE_BYTES / 1024 / 1024,
    )} MB.`,
  })
  uploadMany(
    @UploadedFiles() files: MulterFileLike[] | undefined,
    @Query('folder') folder?: string,
  ) {
    return this.uploadService.saveMany(files, this.resolveFolder(folder));
  }

  @Delete()
  @RequirePermissions('file:upload')
  @ApiQuery({ name: 'path', required: true, example: '/uploads/tours/abc.jpg' })
  @ApiOperation({ summary: 'Xoá một tệp theo đường dẫn công khai' })
  async remove(@Query('path') publicPath: string) {
    if (!publicPath) throw new BadRequestException('Thiếu tham số `path`');
    const removed = await this.uploadService.removeByPublicPath(publicPath);
    return { removed };
  }

  /** Chỉ nhận thư mục trong danh sách trắng, tránh client tự đặt đường dẫn. */
  private resolveFolder(folder?: string): string {
    if (!folder) return 'documents';
    if (!isUploadFolder(folder)) {
      throw new BadRequestException(
        `Thư mục không hợp lệ. Chỉ chấp nhận: ${UPLOAD_FOLDERS.join(', ')}`,
      );
    }
    return folder;
  }
}