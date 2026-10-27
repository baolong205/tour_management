import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity.js';
import { PromotionController } from './promotion.controller.js';
import { PromotionService } from './promotion.service.js';

/**
 * Mã khuyến mãi.
 *
 * Không import module nào khác – đây là module lá, `BookingModule` / `PaymentModule`
 * có thể import lại để dùng `PromotionService` (validate, reserve, release).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Promotion])],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule { }
