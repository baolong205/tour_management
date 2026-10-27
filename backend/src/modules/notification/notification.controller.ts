import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { CreateNotificationDto, QueryNotificationsDto } from './dto/notification.dto.js';
import { NotificationService } from './notification.service.js';

/**
 * Thông báo in-app.
 *
 * - `GET /notifications` + `PATCH .../read` : người dùng tự xem/đánh dấu thông báo của mình.
 * - `POST /notifications` : `notification:manage` (ADMIN phát thông báo hệ thống).
 */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Get()
  @ApiOperation({ summary: 'Thông báo của tôi (phân trang, lọc chưa đọc / theo loại)' })
  listMine(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryNotificationsDto) {
    return this.notificationService.listMine(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Số thông báo chưa đọc của tôi' })
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.unreadCount(user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo của tôi là đã đọc' })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.markAllRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một thông báo là đã đọc' })
  markRead(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.markRead(id, user.id);
  }

  @Post()
  @RequirePermissions('notification:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Phát thông báo cho một người dùng (ADMIN)' })
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationService.createFromDto(dto);
  }
}