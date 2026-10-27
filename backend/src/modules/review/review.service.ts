import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { BookingStatus, ReviewStatus } from '../../common/enums/index.js';
import {
  AuditEvent,
  DomainEvents,
  NotifyEvent,
  type DomainEventPayload,
} from '../../common/events/domain-events.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { Tour } from '../catalog/entities/tour.entity.js';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { User } from '../users/entities/user.entity.js';
import { QueryReviewsDto } from './dto/review.dto.js';
import type { CreateReviewDto, UpdateReviewDto } from './dto/review.dto.js';
import { Review } from './entities/review.entity.js';
import type { ReviewView, TourRatingSummary } from './types/review.types.js';

/**
 * Đánh giá tour.
 *
 * Quy tắc nghiệp vụ (kiểm ở service vì entity không tự validate):
 * - Chỉ tạo được cho booking ở trạng thái `COMPLETED` và thuộc về chính người viết.
 * - Mỗi booking chỉ có **một** đánh giá (ràng buộc `uq_reviews_booking`).
 * - `tour_id` denormalize từ booking (không nhận từ client).
 * - Sau mỗi thay đổi trạng thái review, tính lại `tours.avg_rating` / `tours.review_count`
 *   chỉ từ các review đang `VISIBLE`.
 */
@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Tour) private readonly tourRepo: Repository<Tour>,
    private readonly events: EventEmitter2,
  ) { }

  // ===== truy vấn =====

  /** Danh sách đánh giá (phân trang + lọc) – dùng cho màn kiểm duyệt. */
  async paginate(query: QueryReviewsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.tour', 'tour')
      .leftJoinAndSelect('review.user', 'user');

    if (query.tourId) qb.andWhere('review.tourId = :tourId', { tourId: query.tourId });
    if (query.userId) qb.andWhere('review.userId = :userId', { userId: query.userId });
    if (query.status) qb.andWhere('review.status = :status', { status: query.status });
    if (query.rating) qb.andWhere('review.rating = :rating', { rating: query.rating });

    qb.orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [reviews, total] = await qb.getManyAndCount();
    return { items: reviews.map((review) => this.toView(review)), total, page, limit };
  }

  /**
   * Đánh giá công khai của một tour – chỉ trả về review `VISIBLE`.
   * Dùng cho trang chi tiết tour (không cần đăng nhập).
   */
  async listByTour(tourId: string, query: QueryReviewsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.tourId = :tourId', { tourId })
      .andWhere('review.status = :status', { status: ReviewStatus.VISIBLE });

    if (query.rating) qb.andWhere('review.rating = :rating', { rating: query.rating });

    qb.orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [reviews, total] = await qb.getManyAndCount();
    return { items: reviews.map((review) => this.toView(review)), total, page, limit };
  }

  /** Đánh giá của chính người dùng đang đăng nhập. */
  async listMine(actor: AuthenticatedUser, query: QueryReviewsDto) {
    return this.paginate(Object.assign(new QueryReviewsDto(), query, { userId: actor.id }));
  }

  async getById(id: string): Promise<ReviewView> {
    return this.toView(await this.getOrFail(id));
  }

  async getOrFail(id: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: { tour: true, user: true },
    });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    return review;
  }

  /** Điểm đánh giá tổng hợp của tour (chỉ tính review VISIBLE). */
  async getTourSummary(tourId: string): Promise<TourRatingSummary> {
    const rows = await this.reviewRepo
      .createQueryBuilder('review')
      .select('review.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('review.tourId = :tourId', { tourId })
      .andWhere('review.status = :status', { status: ReviewStatus.VISIBLE })
      .groupBy('review.rating')
      .getRawMany<{ rating: number; count: string }>();

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let weighted = 0;
    for (const row of rows) {
      const rating = Number(row.rating);
      const count = Number(row.count);
      distribution[rating] = count;
      total += count;
      weighted += rating * count;
    }

    return {
      tourId,
      avgRating: total === 0 ? 0 : Math.round((weighted / total) * 10) / 10,
      reviewCount: total,
      distribution,
    };
  }

  // ===== ghi =====

  async create(dto: CreateReviewDto, actor: AuthenticatedUser): Promise<ReviewView> {
    const booking = await this.bookingRepo.findOne({ where: { id: dto.bookingId } });
    if (!booking) throw new NotFoundException('Không tìm thấy booking');

    if (booking.customerId !== actor.id) {
      throw new ForbiddenException('Bạn chỉ có thể đánh giá booking của chính mình');
    }
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Chỉ có thể đánh giá tour sau khi chuyến đi hoàn thành');
    }

    const existing = await this.reviewRepo.findOne({ where: { bookingId: dto.bookingId } });
    if (existing) throw new ConflictException('Booking này đã được đánh giá');

    const tourId = await this.resolveTourId(booking.scheduleId);

    const review = await this.reviewRepo.save(
      this.reviewRepo.create({
        bookingId: booking.id,
        tourId,
        userId: actor.id,
        rating: dto.rating,
        comment: dto.comment?.trim() ?? null,
        status: ReviewStatus.PENDING,
      }),
    );

    this.logger.log(`Đánh giá mới cho tour ${tourId} (booking ${booking.code}): ${dto.rating} sao`);
    return this.getById(review.id);
  }

  /** Người viết sửa đánh giá của mình – chỉ khi còn `PENDING` (chưa kiểm duyệt). */
  async update(id: string, dto: UpdateReviewDto, actor: AuthenticatedUser): Promise<ReviewView> {
    const review = await this.getOrFail(id);

    if (review.userId !== actor.id) {
      throw new ForbiddenException('Bạn chỉ có thể sửa đánh giá của chính mình');
    }
    if (review.status !== ReviewStatus.PENDING) {
      throw new ConflictException('Đánh giá đã được kiểm duyệt, không thể sửa');
    }

    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.comment !== undefined) review.comment = dto.comment?.trim() ?? null;

    await this.reviewRepo.save(review);
    return this.getById(id);
  }

  /**
   * Kiểm duyệt: `PENDING` → `VISIBLE` / `HIDDEN`.
   * Sau khi đổi trạng thái, tính lại điểm trung bình của tour trong cùng transaction.
   */
  async moderate(id: string, status: ReviewStatus, actor: AuthenticatedUser): Promise<ReviewView> {
    if (status === ReviewStatus.PENDING) {
      throw new BadRequestException('Trạng thái kiểm duyệt chỉ có thể là VISIBLE hoặc HIDDEN');
    }

    const before = await this.reviewRepo.manager.transaction(async (manager) => {
      const review = await manager.getRepository(Review).findOne({ where: { id } });
      if (!review) throw new NotFoundException('Không tìm thấy đánh giá');

      const previousStatus = review.status;
      review.status = status;
      review.moderatedBy = actor.id;
      await manager.getRepository(Review).save(review);

      await this.recalculateTourRating(manager, review.tourId);
      return { previousStatus, review };
    });

    this.logger.log(`Kiểm duyệt đánh giá ${id} → ${status}`);

    /**
     * Audit bắt buộc với thao tác quản trị: đây là hành động ẩn/hiện nội dung
     * công khai, có thể bị lạm dụng để dìm đánh giá tiêu cực. Không có vết log
     * thì không thể truy trách nhiệm sau này.
     */
    const payload: DomainEventPayload = {
      entityType: 'review',
      entityId: id,
      actorId: actor.id,
      before: { status: before.previousStatus },
      after: { status, tourId: before.review.tourId },
      // Người viết đánh giá cần biết kết quả kiểm duyệt.
      notifyUserIds: [before.review.userId],
      title:
        status === ReviewStatus.VISIBLE
          ? 'Đánh giá của bạn đã được hiển thị'
          : 'Đánh giá của bạn đã bị ẩn',
      body:
        status === ReviewStatus.VISIBLE
          ? 'Cảm ơn bạn đã chia sẻ trải nghiệm về tour.'
          : 'Đánh giá vi phạm tiêu chuẩn cộng đồng nên đã bị ẩn.',
      notificationType:
        status === ReviewStatus.VISIBLE ? 'REVIEW_APPROVED' : 'REVIEW_HIDDEN',
      payload: { reviewId: id, tourId: before.review.tourId, status },
    };

    await this.events.emitAsync('audit', new AuditEvent(DomainEvents.REVIEW_CREATED, payload));
    await this.events.emitAsync('notify', new NotifyEvent(DomainEvents.REVIEW_CREATED, payload));

    return this.getById(id);
  }

  /** Xóa đánh giá (ADMIN) – tính lại điểm trung bình của tour. */
  async remove(id: string): Promise<void> {
    await this.reviewRepo.manager.transaction(async (manager) => {
      const review = await manager.getRepository(Review).findOne({ where: { id } });
      if (!review) throw new NotFoundException('Không tìm thấy đánh giá');

      const tourId = review.tourId;
      await manager.getRepository(Review).remove(review);
      await this.recalculateTourRating(manager, tourId);
    });
    this.logger.log(`Xóa đánh giá ${id}`);
  }

  // ===== nội bộ =====

  /** Suy ra `tour_id` từ lịch khởi hành của booking. */
  private async resolveTourId(scheduleId: string): Promise<string> {
    const schedule = await this.bookingRepo.manager
      .getRepository(DepartureSchedule)
      .findOne({ where: { id: scheduleId }, select: { id: true, tourId: true } });

    if (!schedule) throw new NotFoundException('Không tìm thấy lịch khởi hành của booking');
    return schedule.tourId;
  }

  /**
   * Tính lại `avg_rating` / `review_count` của tour từ các review `VISIBLE`.
   * Gọi trong transaction để điểm trung bình luôn khớp với trạng thái review.
   */
  private async recalculateTourRating(manager: EntityManager, tourId: string): Promise<void> {
    const row = await manager
      .getRepository(Review)
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('review.tourId = :tourId', { tourId })
      .andWhere('review.status = :status', { status: ReviewStatus.VISIBLE })
      .getRawOne<{ avg: string | null; count: string }>();

    const count = Number(row?.count ?? 0);
    const avg = count === 0 ? 0 : Math.round(Number(row?.avg ?? 0) * 10) / 10;

    await manager
      .getRepository(Tour)
      .createQueryBuilder()
      .update(Tour)
      .set({ avgRating: avg, reviewCount: count })
      .where('id = :id', { id: tourId })
      .execute();
  }

  private toView(review: Review): ReviewView {
    const tour = review.tour as Tour | undefined;
    const user = review.user as User | undefined;
    return {
      id: review.id,
      bookingId: review.bookingId,
      tourId: review.tourId,
      tourName: tour?.name ?? null,
      userId: review.userId,
      userName: user?.fullName ?? null,
      rating: review.rating,
      comment: review.comment ?? null,
      status: review.status,
      moderatedBy: review.moderatedBy ?? null,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}