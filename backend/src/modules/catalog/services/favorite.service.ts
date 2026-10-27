import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Favorite } from '../entities/favorite.entity.js';
import { Tour } from '../entities/tour.entity.js';
import type { TourSummaryView } from '../types/catalog.types.js';
import { TourService } from './tour.service.js';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite) private readonly favoriteRepo: Repository<Favorite>,
    @InjectRepository(Tour) private readonly tourRepo: Repository<Tour>,
    private readonly tourService: TourService,
  ) { }

  /**
   * Danh sách tour yêu thích của một khách.
   *
   * Dùng lại `TourService.paginate` không tiện vì cần sắp theo thời điểm thêm yêu thích,
   * nên lấy id trước (bảng `favorites` rất nhỏ) rồi nạp tour theo đúng thứ tự đó.
   */
  async list(userId: string, onlyPublished = true): Promise<TourSummaryView[]> {
    const favorites = await this.favoriteRepo.find({
      where: { userId },
      order: { tourId: 'ASC' },
    });
    if (favorites.length === 0) return [];

    const tours = await this.tourRepo.find({
      where: favorites.map((favorite) => ({ id: favorite.tourId })),
      relations: { categories: true },
      order: { createdAt: 'DESC' },
    });

    const visible = onlyPublished ? tours.filter((tour) => tour.status === 'PUBLISHED') : tours;
    return this.tourService.toSummariesPublic(visible);
  }

  async add(userId: string, tourId: string): Promise<{ favorited: true }> {
    const tour = await this.tourRepo.findOne({ where: { id: tourId } });
    if (!tour) throw new NotFoundException('Không tìm thấy tour');

    // Khóa chính kép chống trùng; `insert` + bỏ qua lỗi trùng để thao tác lặp lại
    // (bấm tim hai lần) vẫn trả kết quả thành công thay vì 500.
    const existing = await this.favoriteRepo.findOne({ where: { userId, tourId } });
    if (!existing) await this.favoriteRepo.insert({ userId, tourId });
    return { favorited: true };
  }

  async remove(userId: string, tourId: string): Promise<{ favorited: false }> {
    await this.favoriteRepo.delete({ userId, tourId });
    return { favorited: false };
  }

  async isFavorited(userId: string, tourId: string): Promise<{ favorited: boolean }> {
    const favorited = await this.favoriteRepo.exists({ where: { userId, tourId } });
    return { favorited };
  }
}
