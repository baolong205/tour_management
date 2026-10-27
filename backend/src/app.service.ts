import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'API Hệ thống quản lý tour du lịch đang hoạt động!';
  }
}
