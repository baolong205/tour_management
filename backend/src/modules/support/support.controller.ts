import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { CreateSupportDto, QuerySupportDto, ReplySupportDto, SupportStatusDto } from './support.dto.js';
import { SupportService } from './support.service.js';

@Controller('support')
export class SupportController {
  constructor(private readonly service: SupportService) {}
  @Get('me')
  mine(@CurrentUser() user: AuthenticatedUser, @Query() query: QuerySupportDto) { return this.service.list(user, query); }
  @Get()
  @RequirePermissions('support:manage')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: QuerySupportDto) { return this.service.list(user, query, true); }
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSupportDto) { return this.service.create(user, dto); }
  @Post(':id/replies')
  reply(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: ReplySupportDto) { return this.service.update(id, user, dto.message); }
  @Patch(':id/status')
  @RequirePermissions('support:manage')
  status(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: SupportStatusDto) { return this.service.update(id, user, undefined, dto.status); }
}