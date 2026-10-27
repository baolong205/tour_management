import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { In } from 'typeorm';
import { TourStatus } from '../../../common/enums/index.js';
import type { CreateTourDto, QueryToursDto, TourImageDto, TourDestinationDto, ItineraryDayDto, UpdateTourDto } from '../dto/tour.dto.js';
import { ItineraryDay } from '../entities/itinerary-day.entity.js';
import { TourDestination } from '../entities/tour-destination.entity.js';
import { TourImage } from '../entities/tour-image.entity.js';
import { Tour } from '../entities/tour.entity.js';
import { DepartureSchedule } from '../../schedule/entities/departure-schedule.entity.js';
import type {
  ItineraryDayView,
  TourDestinationView,
  TourDetailView,
  TourImageView,
  TourSummaryView,
} from '../types/catalog.types.js';
import { CancelPolicyService } from './cancel-policy.service.js';
import { CategoryService } from './category.service.js';

type TourListResult = {
  items: TourSummaryView[];
  total: number;
  page: number;
  limit: number;
};

@Injectable()
export class TourService {
  constructor(
    @InjectRepository(Tour) private readonly tourRepo: Repository<Tour>,
    @InjectRepository(TourImage) private readonly imageRepo: Repository<TourImage>,
    @InjectRepository(ItineraryDay) private readonly itineraryRepo: Repository<ItineraryDay>,
    @InjectRepository(TourDestination) private readonly tourDestinationRepo: Repository<TourDestination>,
    @InjectRepository(DepartureSchedule) private readonly scheduleRepo: Repository<DepartureSchedule>,
    private readonly cancelPolicyService: CancelPolicyService,
    private readonly categoryService: CategoryService,
  ) { }

  // ===== truy vấn =====

  /**
   * Danh sách tour có phân trang.
   *
   * `onlyPublished = true` (route công khai) ép `status = PUBLISHED` và bỏ qua tham số
   * `status` client gửi lên – nếu không, khách có thể xem tour DRAFT/HIDDEN.
   */
  async paginate(query: QueryToursDto, onlyPublished = false): Promise<TourListResult> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.tourRepo
      .createQueryBuilder('tour')
      .leftJoinAndSelect('tour.categories', 'category');

    // `Tour` kế thừa `SoftDeletableEntity`; TypeORM chỉ tự lọc `deletedAt` ở query gốc,
    // không lọc trên bảng join, nên phải nói rõ ở đây.
    qb.andWhere('tour.deletedAt IS NULL');

    this.applyFilters(qb, query, onlyPublished);

    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = (query.sortOrder ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`tour.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit).take(limit);

    const [tours, total] = await qb.getManyAndCount();
    const summaries = await this.toSummaries(tours);

    return { items: summaries, total, page, limit };
  }

  async getDetail(id: string, onlyPublished = false): Promise<TourDetailView> {
    const tour = await this.loadFull(id, onlyPublished);
    const [summary] = await this.toSummaries([tour]);
    return {
      ...summary,
      description: tour.description ?? null,
      cancelPolicy: tour.cancelPolicy
        ? {
          id: tour.cancelPolicy.id,
          name: tour.cancelPolicy.name,
          description: tour.cancelPolicy.description ?? null,
          isDefault: tour.cancelPolicy.isDefault,
          rules: (tour.cancelPolicy.rules ?? []).map((rule) => ({
            daysBefore: rule.daysBefore,
            feePercent: rule.feePercent,
          })),
        }
        : null,
      images: (tour.images ?? []).map((image) => this.toImageView(image)),
      destinations: (tour.destinations ?? []).map((link) => this.toDestinationView(link)),
      itinerary: (tour.itinerary ?? []).map((day) => this.toItineraryView(day)),
      createdAt: tour.createdAt,
      updatedAt: tour.updatedAt,
    };
  }

  /** Chi tiết tour theo slug (URL công khai) – ném 404 nếu không có hoặc chưa công bố. */
  async getDetailBySlug(slug: string, onlyPublished = false): Promise<TourDetailView> {
    const qb = this.tourRepo
      .createQueryBuilder('tour')
      .select('tour.id', 'id')
      .where('tour.slug = :slug', { slug: slug.trim() })
      .andWhere('tour.deletedAt IS NULL');

    if (onlyPublished) {
      qb.andWhere('tour.status = :published', { published: TourStatus.PUBLISHED });
    }

    const row = await qb.getRawOne<{ id: string }>();
    if (!row) throw new NotFoundException('Không tìm thấy tour');
    return this.getDetail(row.id, onlyPublished);
  }

  /** Dùng nội bộ (module schedule/booking) – trả entity đã nạp quan hệ cần thiết. */
  async findById(id: string): Promise<Tour | null> {
    return this.tourRepo.findOne({ where: { id }, relations: { cancelPolicy: true } });
  }

  async getOrFail(id: string): Promise<Tour> {
    const tour = await this.tourRepo.findOne({ where: { id } });
    if (!tour) throw new NotFoundException('Không tìm thấy tour');
    return tour;
  }

  /** Tour phải ở trạng thái PUBLISHED mới được mở bán lịch khởi hành. */
  async getPublishedOrFail(id: string): Promise<Tour> {
    const tour = await this.getOrFail(id);
    if (tour.status !== TourStatus.PUBLISHED) {
      throw new ConflictException('Tour chưa được công bố – không thể mở bán lịch khởi hành');
    }
    return tour;
  }

  // ===== ghi =====

  async create(dto: CreateTourDto): Promise<TourDetailView> {
    this.assertItineraryDaysUnique(dto.itinerary);
    this.assertSingleCover(dto.images);

    await this.assertSlugFree(dto.slug, null);
    if (dto.code) await this.assertCodeFree(dto.code, null);

    const policy = dto.cancelPolicyId
      ? await this.cancelPolicyService.getOrFail(dto.cancelPolicyId)
      : await this.cancelPolicyService.findDefaultOrFail();

    const categories = dto.categoryIds ? await this.categoryService.findCategoriesByIds(dto.categoryIds) : [];
    const destinations = dto.destinations
      ? await this.categoryService.findDestinationsByIds(dto.destinations.map((item) => item.destinationId))
      : [];
    void destinations; // chỉ cần kiểm tra tồn tại; liên kết tạo qua `tour_destinations`

    const id = await this.tourRepo.manager.transaction(async (manager) => {
      const tour = manager.create(Tour, {
        code: (dto.code ?? (await this.nextTourCode(manager))).trim(),
        slug: dto.slug.trim(),
        name: dto.name.trim(),
        summary: dto.summary?.trim() || null,
        description: dto.description?.trim() || null,
        durationDays: dto.durationDays,
        durationNights: dto.durationNights ?? 0,
        departureCity: dto.departureCity?.trim() || null,
        status: dto.status ?? TourStatus.DRAFT,
        cancelPolicyId: policy.id,
        categories,
      });

      const saved = await manager.save(tour);
      await this.syncImages(manager, saved.id, dto.images);
      await this.syncDestinations(manager, saved.id, dto.destinations);
      await this.syncItinerary(manager, saved.id, dto.itinerary);
      return saved.id;
    });

    return this.getDetail(id);
  }

  /**
   * Cập nhật tour. Các mảng con (`images`, `destinations`, `itinerary`, `categoryIds`)
   * nếu có trong payload sẽ thay thế toàn bộ danh sách cũ.
   */
  async update(id: string, dto: UpdateTourDto): Promise<TourDetailView> {
    const tour = await this.getOrFail(id);

    if (dto.itinerary !== undefined) this.assertItineraryDaysUnique(dto.itinerary);
    if (dto.images !== undefined) this.assertSingleCover(dto.images);
    if (dto.slug !== undefined) await this.assertSlugFree(dto.slug, id);
    if (dto.code !== undefined) await this.assertCodeFree(dto.code, id);

    const categories =
      dto.categoryIds !== undefined ? await this.categoryService.findCategoriesByIds(dto.categoryIds) : undefined;
    if (dto.cancelPolicyId !== undefined) await this.cancelPolicyService.getOrFail(dto.cancelPolicyId);
    if (dto.destinations !== undefined) {
      await this.categoryService.findDestinationsByIds(dto.destinations.map((item) => item.destinationId));
    }

    await this.tourRepo.manager.transaction(async (manager) => {
      if (dto.code !== undefined) tour.code = dto.code.trim();
      if (dto.slug !== undefined) tour.slug = dto.slug.trim();
      if (dto.name !== undefined) tour.name = dto.name.trim();
      if (dto.summary !== undefined) tour.summary = dto.summary?.trim() || null;
      if (dto.description !== undefined) tour.description = dto.description?.trim() || null;
      if (dto.durationDays !== undefined) tour.durationDays = dto.durationDays;
      if (dto.durationNights !== undefined) tour.durationNights = dto.durationNights;
      if (dto.departureCity !== undefined) tour.departureCity = dto.departureCity?.trim() || null;
      if (dto.status !== undefined) tour.status = dto.status;
      if (dto.cancelPolicyId !== undefined) tour.cancelPolicyId = dto.cancelPolicyId;
      if (categories !== undefined) tour.categories = categories;

      await manager.save(tour);

      if (dto.images !== undefined) await this.syncImages(manager, id, dto.images);
      if (dto.destinations !== undefined) await this.syncDestinations(manager, id, dto.destinations);
      if (dto.itinerary !== undefined) await this.syncItinerary(manager, id, dto.itinerary);
    });

    return this.getDetail(id);
  }

  async updateStatus(id: string, status: TourStatus): Promise<TourDetailView> {
    const tour = await this.getOrFail(id);
    tour.status = status;
    await this.tourRepo.save(tour);
    return this.getDetail(id);
  }

  /**
   * Xóa mềm tour.
   *
   * Chặn khi còn lịch khởi hành chưa kết thúc: xóa mềm tour chỉ ẩn khỏi danh sách,
   * nhưng lịch vẫn mở bán và khách vẫn đặt được – dẫn tới đơn treo.
   */
  async remove(id: string): Promise<void> {
    await this.getOrFail(id);
    const activeSchedules = await this.scheduleRepo
      .createQueryBuilder('schedule')
      .where('schedule.tourId = :id', { id })
      .andWhere('schedule.status NOT IN (:...finalStates)', {
        finalStates: ['COMPLETED', 'CANCELLED'],
      })
      .getCount();

    if (activeSchedules > 0) {
      throw new ConflictException(
        `Tour còn ${activeSchedules} lịch khởi hành chưa kết thúc – hãy đóng/hủy các lịch đó trước khi xóa`,
      );
    }

    const result = await this.tourRepo.softDelete({ id });
    if (!result.affected) throw new NotFoundException('Không tìm thấy tour');
  }

  // ===== nội bộ: truy vấn =====

  private applyFilters(qb: SelectQueryBuilder<Tour>, query: QueryToursDto, onlyPublished: boolean): void {
    if (onlyPublished) {
      qb.andWhere('tour.status = :published', { published: TourStatus.PUBLISHED });
    } else if (query.status) {
      qb.andWhere('tour.status = :status', { status: query.status });
    }

    if (query.search) {
      const keyword = `%${query.search.trim()}%`;
      qb.andWhere('(tour.name LIKE :keyword OR tour.code LIKE :keyword OR tour.summary LIKE :keyword)', { keyword });
    }

    if (query.departureCity) {
      qb.andWhere('tour.departureCity = :departureCity', { departureCity: query.departureCity.trim() });
    }

    if (query.categoryId) {
      // Subquery để không loại bỏ các danh mục khác của tour khỏi kết quả join.
      qb.andWhere(
        'EXISTS (SELECT 1 FROM tour_categories tc WHERE tc.tour_id = tour.id AND tc.category_id = :categoryId)',
        { categoryId: query.categoryId },
      );
    }
  }

  private async loadFull(id: string, onlyPublished: boolean): Promise<Tour> {
    const qb = this.tourRepo
      .createQueryBuilder('tour')
      .leftJoinAndSelect('tour.categories', 'category')
      .leftJoinAndSelect('tour.cancelPolicy', 'policy')
      .leftJoinAndSelect('policy.rules', 'policyRule')
      .leftJoinAndSelect('tour.images', 'image')
      .leftJoinAndSelect('tour.destinations', 'tourDestination')
      .leftJoinAndSelect('tourDestination.destination', 'destination')
      .leftJoinAndSelect('tour.itinerary', 'itineraryDay')
      .where('tour.id = :id', { id })
      .andWhere('tour.deletedAt IS NULL');

    if (onlyPublished) {
      qb.andWhere('tour.status = :published', { published: TourStatus.PUBLISHED });
    }

    const tour = await qb.getOne();
    if (!tour) throw new NotFoundException('Không tìm thấy tour');

    tour.images = [...(tour.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    tour.destinations = [...(tour.destinations ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    tour.itinerary = [...(tour.itinerary ?? [])].sort((a, b) => a.dayNo - b.dayNo);
    return tour;
  }

  /**
   * Chuyển entity → view rút gọn, kèm ảnh bìa và giá thấp nhất.
   *
   * Giá thấp nhất lấy từ `departure_schedules` đang `OPEN` và có ngày khởi hành
   * trong tương lai. Không join vào query chính vì sẽ nhân bản dòng tour; thay vào đó
   * gom một truy vấn `GROUP BY tour_id` cho cả trang.
   *
   * Public để `FavoriteService` dùng lại – tránh lặp logic ảnh bìa / giá thấp nhất.
   */
  toSummariesPublic(tours: Tour[]): Promise<TourSummaryView[]> {
    return this.toSummaries(tours);
  }

  private async toSummaries(tours: Tour[]): Promise<TourSummaryView[]> {
    if (tours.length === 0) return [];

    const tourIds = tours.map((tour) => tour.id);

    const [covers, prices] = await Promise.all([
      this.imageRepo.find({
        where: { tourId: In(tourIds), isCover: true },
        order: { sortOrder: 'ASC' },
      }),
      this.scheduleRepo
        .createQueryBuilder('schedule')
        .select('schedule.tourId', 'tourId')
        .addSelect('MIN(schedule.priceAdult)', 'minPrice')
        .where('schedule.tourId IN (:...tourIds)', { tourIds })
        .andWhere('schedule.status = :open', { open: 'OPEN' })
        .andWhere('schedule.startDate >= :today', { today: this.todayInVietnam() })
        .groupBy('schedule.tourId')
        .getRawMany<{ tourId: string; minPrice: string }>(),
    ]);

    const coverByTour = new Map(covers.map((image) => [image.tourId, image.url]));
    const priceByTour = new Map(prices.map((row) => [row.tourId, Number(row.minPrice)]));

    return tours.map((tour) => ({
      id: tour.id,
      code: tour.code,
      slug: tour.slug,
      name: tour.name,
      summary: tour.summary ?? null,
      durationDays: tour.durationDays,
      durationNights: tour.durationNights,
      departureCity: tour.departureCity ?? null,
      status: tour.status,
      avgRating: Number(tour.avgRating ?? 0),
      reviewCount: tour.reviewCount,
      coverImageUrl: coverByTour.get(tour.id) ?? null,
      fromPrice: priceByTour.get(tour.id) ?? null,
      categories: (tour.categories ?? []).map((category) => this.categoryService.toView(category)),
    }));
  }

  private toImageView(image: TourImage): TourImageView {
    return {
      id: image.id,
      url: image.url,
      publicId: image.publicId ?? null,
      isCover: image.isCover,
      sortOrder: image.sortOrder,
    };
  }

  private toDestinationView(link: TourDestination): TourDestinationView {
    const destination = link.destination;
    return {
      destinationId: link.destinationId,
      name: destination?.name ?? '',
      slug: destination?.slug ?? '',
      latitude: destination?.latitude ?? null,
      longitude: destination?.longitude ?? null,
      sortOrder: link.sortOrder,
    };
  }

  private toItineraryView(day: ItineraryDay): ItineraryDayView {
    return {
      id: day.id,
      dayNo: day.dayNo,
      title: day.title,
      content: day.content ?? null,
      meals: day.meals ?? null,
    };
  }

  /** `YYYY-MM-DD` theo giờ VN – dùng so sánh với cột `date` của `departure_schedules`. */
  private todayInVietnam(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  // ===== nội bộ: đồng bộ bảng con =====

  private async syncImages(manager: EntityManager, tourId: string, images?: TourImageDto[]): Promise<void> {
    if (images === undefined) return;
    await manager.delete(TourImage, { tourId });
    if (images.length === 0) return;

    const rows = images.map((image, index) =>
      manager.create(TourImage, {
        tourId,
        url: image.url.trim(),
        publicId: image.publicId?.trim() || null,
        // Ảnh đầu tiên mặc định là ảnh bìa nếu client không chỉ định ảnh nào.
        isCover: image.isCover ?? index === 0,
        sortOrder: image.sortOrder ?? index,
      }),
    );
    await manager.save(rows);
  }

  private async syncDestinations(
    manager: EntityManager,
    tourId: string,
    destinations?: TourDestinationDto[],
  ): Promise<void> {
    if (destinations === undefined) return;
    await manager.delete(TourDestination, { tourId });
    if (destinations.length === 0) return;

    const rows = destinations.map((item, index) =>
      manager.create(TourDestination, {
        tourId,
        destinationId: item.destinationId,
        sortOrder: item.sortOrder ?? index,
      }),
    );
    await manager.save(rows);
  }

  private async syncItinerary(manager: EntityManager, tourId: string, itinerary?: ItineraryDayDto[]): Promise<void> {
    if (itinerary === undefined) return;
    await manager.delete(ItineraryDay, { tourId });
    if (itinerary.length === 0) return;

    const rows = itinerary.map((day) =>
      manager.create(ItineraryDay, {
        tourId,
        dayNo: day.dayNo,
        title: day.title.trim(),
        content: day.content?.trim() || null,
        meals: day.meals?.trim() || null,
      }),
    );
    await manager.save(rows);
  }

  // ===== nội bộ: kiểm tra dữ liệu =====

  private async assertSlugFree(slug: string, exceptId: string | null): Promise<void> {
    const existing = await this.tourRepo.findOne({ where: { slug: slug.trim() } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Slug "${slug}" đã được dùng cho tour khác`);
    }
  }

  private async assertCodeFree(code: string, exceptId: string | null): Promise<void> {
    const existing = await this.tourRepo.findOne({ where: { code: code.trim() } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Mã tour "${code}" đã tồn tại`);
    }
  }

  private assertItineraryDaysUnique(itinerary?: ItineraryDayDto[]): void {
    if (!itinerary || itinerary.length === 0) return;
    const seen = new Set<number>();
    for (const day of itinerary) {
      if (seen.has(day.dayNo)) {
        throw new BadRequestException(`Ngày thứ ${day.dayNo} bị lặp trong lịch trình`);
      }
      seen.add(day.dayNo);
    }
  }

  /**
   * `tour_images` không có partial unique trên MySQL. Chặn sớm ở tầng service để
   * client nhận 400 thay vì vi phạm index unique của generated column (nếu đã tạo).
   */
  private assertSingleCover(images?: TourImageDto[]): void {
    if (!images) return;
    const covers = images.filter((image) => image.isCover === true);
    if (covers.length > 1) {
      throw new BadRequestException('Mỗi tour chỉ được có một ảnh bìa (isCover = true)');
    }
  }

  /**
   * Sinh mã tour kế tiếp theo mẫu `TOUR-0001`.
   *
   * MySQL không có sequence. Cách làm: đọc mã lớn nhất đang có, +1, và để ràng buộc
   * `uq_tours_code` làm chốt chặn cuối – nếu hai request đồng thời sinh cùng mã,
   * một request sẽ nhận lỗi 1062 và client gọi lại (hiếm vì thao tác tạo tour là
   * thao tác quản trị).
   */
  private async nextTourCode(manager: EntityManager): Promise<string> {
    const row = await manager
      .createQueryBuilder(Tour, 'tour')
      .select('MAX(tour.code)', 'maxCode')
      .withDeleted()
      .getRawOne<{ maxCode: string | null }>();

    const current = row?.maxCode ? Number(String(row.maxCode).replace(/\D/g, '')) : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    return `TOUR-${String(next).padStart(4, '0')}`;
  }
}
