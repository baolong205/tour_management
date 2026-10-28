import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from './support.entity.js';
import { SupportController } from './support.controller.js';
import { SupportService } from './support.service.js';

@Module({ imports: [TypeOrmModule.forFeature([SupportTicket])], controllers: [SupportController], providers: [SupportService] })
export class SupportModule {}