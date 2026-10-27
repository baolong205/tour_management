import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { map, type Observable } from 'rxjs';

/** Body thành công khi bật envelope. */
export interface ApiSuccessBody<T> {
  success: true;
  statusCode: number;
  data: T;
  requestId: string;
  path: string;
  timestamp: string;
}

/**
 * Chuẩn hoá response thành công.
 *
 * Đối xứng với `AllExceptionsFilter` (`success: false`), nhờ đó client chỉ cần
 * một nhánh xử lý: đọc `success`, rồi `data` hoặc `message`.
 *
 * **Mặc định TẮT** (`RESPONSE_ENVELOPE=false`) để không phá vỡ frontend hiện
 * đang đọc payload trực tiếp. Bật bằng biến môi trường khi client đã sẵn sàng.
 *
 * Khi bật, các trường hợp sau **không** bọc để tránh hỏng:
 * - Swagger UI, file tĩnh, response không phải JSON.
 * - `204 No Content`, body rỗng.
 * - Payload đã có hình dạng envelope (tránh bọc hai lần).
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, T | ApiSuccessBody<T>> {
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.enabled = (this.config.get<string>('RESPONSE_ENVELOPE') ?? 'false').toLowerCase() === 'true';
  }

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<T | ApiSuccessBody<T>> {
    if (!this.enabled) return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const path = request.originalUrl ?? request.url ?? '';
    const requestId = String(
      response.getHeader('x-request-id') ?? request.headers['x-request-id'] ?? '',
    );

    return next.handle().pipe(
      map((payload) => {
        if (!this.shouldWrap(payload, response, path)) return payload;
        return {
          success: true as const,
          statusCode: response.statusCode,
          data: payload,
          requestId,
          path,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }

  private shouldWrap(payload: unknown, response: Response, path: string): boolean {
    if (response.statusCode === 204 || payload === undefined || payload === null) return false;
    if (Buffer.isBuffer(payload)) return false;
    if (typeof payload !== 'object') return false;
    if (path.includes('/docs')) return false;

    const record = payload as Record<string, unknown>;
    // Đã là envelope (hoặc đã bị bọc trước đó) thì bỏ qua.
    if (record.success === true || record.success === false) return false;
    return true;
  }
}