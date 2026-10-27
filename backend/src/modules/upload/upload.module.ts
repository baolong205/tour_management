import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller.js';
import { UploadService } from './upload.service.js';

/**
 * Module tải tệp.
 *
 * Không phụ thuộc module nào khác: chỉ ghi/đọc trên đĩa và trả URL tương đối,
 * nên có thể dùng lại từ mọi module nghiệp vụ (tour, người dùng, thanh toán).
 */
@Module({
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule { }