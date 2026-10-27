import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'node:path';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/http/all-exceptions.filter.js';
import { TransformInterceptor } from './common/http/transform.interceptor.js';
import { UPLOAD_PUBLIC_PREFIX, UPLOAD_ROOT } from './modules/upload/upload.constants.js';

async function bootstrap() {
  // Kiểu `NestExpressApplication` cần thiết để dùng `useStaticAssets` (phục vụ tệp upload).
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const port = config.get<number>('PORT') ?? 3000;
  const apiPrefix = config.get<string>('API_PREFIX') ?? 'api';
  const corsOrigin = config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173';

  app.setGlobalPrefix(apiPrefix);

  // Bảo mật header HTTP; tắt CSP để Swagger UI hiển thị bình thường.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());

  /**
   * Phục vụ tệp đã tải lên.
   *
   * `UploadModule` ghi tệp vào `UPLOAD_ROOT` và trả URL dạng `/uploads/<folder>/<tên>`.
   * Đặt static handler **trước** global prefix để URL không bị chèn `/api`:
   * ảnh phải mở được trực tiếp bằng `<img src="/uploads/...">` từ trình duyệt.
   *
   * `index: false` và `dotfiles: 'ignore'` để không liệt kê thư mục và không lộ
   * tệp ẩn; `maxAge` cache 7 ngày vì tên tệp là UUID (bất biến theo nội dung).
   */
  app.useStaticAssets(join(process.cwd(), UPLOAD_ROOT), {
    prefix: `${UPLOAD_PUBLIC_PREFIX}/`,
    index: false,
    dotfiles: 'ignore',
    maxAge: '7d',
    immutable: true,
  });

  app.enableCors({
    origin: corsOrigin.split(',').map((item) => item.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Tự động validate DTO + loại bỏ field không khai báo.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Mọi lỗi ra ngoài đều cùng một shape + header `x-request-id` để tra log.
  app.useGlobalFilters(new AllExceptionsFilter());
  // Bọc response thành công (mặc định tắt, bật bằng RESPONSE_ENVELOPE=true).
  app.useGlobalInterceptors(new TransformInterceptor(config));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API Hệ thống quản lý tour du lịch')
    .setDescription('Tài liệu RESTful API cho hệ thống quản lý tour du lịch')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(`${apiPrefix}/docs`, app, SwaggerModule.createDocument(app, swaggerConfig));

  // Báo lỗi rõ ràng thay vì stack trace EADDRINUSE khó đọc. Trên Windows, port 3000
  // thường bị `com.docker.backend` chiếm; khi đó chỉ cần đổi PORT trong `.env`
  // (ví dụ 3001) hoặc tắt container đang dùng port này.
  app.enableShutdownHooks();
  try {
    await app.listen(port);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      Logger.error(
        `Port ${port} đang được tiến trình khác dùng. Đổi PORT trong backend/.env hoặc giải phóng port rồi chạy lại.`,
        undefined,
        'Bootstrap',
      );
      await app.close();
      process.exit(1);
    }
    throw error;
  }

  Logger.log(`API: http://localhost:${port}/${apiPrefix}`, 'Bootstrap');
  Logger.log(`Swagger: http://localhost:${port}/${apiPrefix}/docs`, 'Bootstrap');
}

await bootstrap();
