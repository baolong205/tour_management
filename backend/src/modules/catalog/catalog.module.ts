import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { CatalogController } from './catalog.controller.js';
import { CancelPolicyRule } from './entities/cancel-policy-rule.entity.js';
import { CancelPolicy } from './entities/cancel-policy.entity.js';
import { Category } from './entities/category.entity.js';
import { Destination } from './entities/destination.entity.js';
import { Favorite } from './entities/favorite.entity.js';
import { ItineraryDay } from './entities/itinerary-day.entity.js';
import { TourDestination } from './entities/tour-destination.entity.js';
import { TourImage } from './entities/tour-image.entity.js';
import { Tour } from './entities/tour.entity.js';
import { CancelPolicyService } from './services/cancel-policy.service.js';
import { CategoryService } from './services/category.service.js';
import { FavoriteService } from './services/favorite.service.js';
import { TourService } from './services/tour.service.js';
import { ToursController } from './tours.controller.js';

/**
 * Catalog – tour, danh mục, điểm đến, chính sách hủy, yêu thích.
 *
 * Export `TourService` / `CancelPolicyService` để module `schedule` (kiểm tra tour
 * đã công bố) và `booking` (tính phí hủy + chụp `policy_snapshot`) dùng lại thay vì
 * truy vấn thẳng entity.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tour,
      TourImage,
      TourDestination,
      ItineraryDay,
      Category,
      Destination,
      Favorite,
      CancelPolicy,
      CancelPolicyRule,
      // `TourService` cần đọc giá thấp nhất từ lịch khởi hành để hiển thị "từ ...đ".
      DepartureSchedule,
    ]),
  ],
  controllers: [ToursController, CatalogController],
  providers: [TourService, CategoryService, CancelPolicyService, FavoriteService],
  exports: [TourService, CategoryService, CancelPolicyService],
})
export class CatalogModule { }
