import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

/** Một lỗi field-level do `ValidationPipe` sinh ra (shape của class-validator). */
interface ValidationDetail {
  field: string;
  message: string;
}

/** Body lỗi thống nhất cho toàn bộ API. */
export interface ApiErrorBody {
  success: false;
  statusCode: number;
  /** Mã lỗi ngắn gọn để client switch-case, ví dụ `VALIDATION_ERROR`. */
  code: string;
  message: string;
  /** Chi tiết từng field khi lỗi validate; rỗng với lỗi khác. */
  details: ValidationDetail[];
  /** Id truy vết, cũng được trả về qua header `x-request-id`. */
  requestId: string;
  path: string;
  timestamp: string;
}

/**
 * Bộ lọc lỗi toàn cục.
 *
 * Trước đây mỗi chỗ `throw` cho ra một shape khác nhau khiến client phải dò
 * `message` dạng chuỗi/chuỗi-mảng và không có cách nào ghép log server với
 * response người dùng thấy. Filter này:
 *
 * - Chuẩn hoá mọi lỗi về cùng một JSON (`success: false`, `code`, `message`,
 *   `details`, `requestId`).
 * - Gắn `x-request-id` vào response (dùng lại header nếu reverse-proxy đã set)
 *   để tra log theo đúng một request.
 * - Không rò rỉ stack/SQL ra ngoài: lỗi `5xx` chỉ trả message chung, chi tiết
 *   ghi vào log kèm `requestId`.
 * - Vẫn giữ nguyên status code và `message` gốc của `HttpException` để frontend
 *   hiện tại không bị ảnh hưởng.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = this.resolveRequestId(request);
    const path = request.originalUrl ?? request.url ?? '';
    const timestamp = new Date().toISOString();

    const { status, code, message, details } = this.describe(exception);

    response.setHeader('x-request-id', requestId);

    const body: ApiErrorBody = {
      success: false,
      statusCode: status,
      code,
      message,
      details,
      requestId,
      path,
      timestamp,
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${requestId}] ${request.method} ${path} → ${status} ${code}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status === HttpStatus.TOO_MANY_REQUESTS) {
      this.logger.warn(`[${requestId}] ${request.method} ${path} → 429 bị chặn bởi rate limit`);
    } else {
      this.logger.debug(`[${requestId}] ${request.method} ${path} → ${status} ${code}`);
    }

    // Đã gửi header (streaming) thì không ghi body được nữa.
    if (response.headersSent) return;
    response.status(status).json(body);
  }

  private resolveRequestId(request: Request): string {
    const incoming = request.headers['x-request-id'];
    const value = Array.isArray(incoming) ? incoming[0] : incoming;
    return value && value.trim().length > 0 ? value.trim() : randomUUID();
  }

  private describe(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details: ValidationDetail[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { status, code: this.codeForStatus(status), message: payload, details: [] };
      }

      const record = payload as Record<string, unknown>;
      const rawMessage = record.message;

      // `ValidationPipe` trả mảng chuỗi "field ..." ⇒ tách thành `details`.
      if (Array.isArray(rawMessage)) {
        const details = rawMessage.map((item) => this.parseValidationMessage(String(item)));
        return {
          status,
          code: status === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : this.codeForStatus(status),
          message: status === HttpStatus.BAD_REQUEST ? 'Dữ liệu gửi lên không hợp lệ' : 'Yêu cầu không hợp lệ',
          details,
        };
      }

      const code = typeof record.code === 'string' ? record.code : this.codeForStatus(status);
      const message = typeof rawMessage === 'string' ? rawMessage : exception.message;
      return { status, code, message, details: [] };
    }

    // Lỗi TypeORM: mã `23505` = unique, `23503` = khoá ngoại, `23502` = not null.
    const dbCode = (exception as { code?: string } | null)?.code;
    if (dbCode === '23505') {
      return {
        status: HttpStatus.CONFLICT,
        code: 'DUPLICATE_ENTRY',
        message: 'Dữ liệu đã tồn tại, vui lòng kiểm tra lại',
        details: [],
      };
    }
    if (dbCode === '23503') {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'INVALID_REFERENCE',
        message: 'Dữ liệu tham chiếu không tồn tại hoặc đang được sử dụng',
        details: [],
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Hệ thống gặp sự cố, vui lòng thử lại sau',
      details: [],
    };
  }

  /** `"email must be an email"` → `{ field: 'email', message: 'must be an email' }`. */
  private parseValidationMessage(raw: string): ValidationDetail {
    const index = raw.indexOf(' ');
    if (index === -1) return { field: '', message: raw };
    return { field: raw.slice(0, index), message: raw.slice(index + 1) };
  }

  private codeForStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] ?? `HTTP_${status}`;
  }
}