import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingStatus, ReviewStatus } from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { Tour } from '../catalog/entities/tour.entity.js';
import { Review } from './entities/review.entity.js';
import { ReviewService } from './review.service.js';

/**
 * Unit test cho ReviewService – mock repository, không cần DB.
 *
 * Tập trung vào các quy tắc nghiệp vụ: quyền sở hữu, trạng thái booking,
 * ràng buộc 1-1, và trạng thái kiểm duyệt.
 */

const actor = (id = 'user-1'): AuthenticatedUser =>
  ({ id, email: 'a@b.c', roles: [], permissions: [] }) as unknown as AuthenticatedUser;

/** Repository giả tối thiểu cho các nhánh được test. */
function makeRepoMock() {
  return {
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((data: unknown) => data),
    remove: vi.fn(),
    count: vi.fn(),
    createQueryBuilder: vi.fn(),
    manager: {
      transaction: vi.fn(),
      getRepository: vi.fn(),
    },
  };
}

describe('ReviewService', () => {
  let service: ReviewService;
  let reviewRepo: ReturnType<typeof makeRepoMock>;
  let bookingRepo: ReturnType<typeof makeRepoMock>;
  let tourRepo: ReturnType<typeof makeRepoMock>;
  let events: { emitAsync: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    reviewRepo = makeRepoMock();
    bookingRepo = makeRepoMock();
    tourRepo = makeRepoMock();
    // Bus sự kiện giả: chỉ cần ghi nhận lời gọi, không chạy listener thật.
    events = { emitAsync: vi.fn().mockResolvedValue([]) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: getRepositoryToken(Review), useValue: reviewRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: getRepositoryToken(Tour), useValue: tourRepo },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();

    service = moduleRef.get(ReviewService);
  });

  describe('create', () => {
    it('ném NotFoundException khi booking không tồn tại', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(service.create({ bookingId: 'b1', rating: 5 }, actor())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('ném ForbiddenException khi booking không thuộc người đang đăng nhập', async () => {
      bookingRepo.findOne.mockResolvedValue({ id: 'b1', customerId: 'other', status: BookingStatus.COMPLETED });

      await expect(service.create({ bookingId: 'b1', rating: 5 }, actor('user-1'))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('ném BadRequestException khi booking chưa COMPLETED', async () => {
      bookingRepo.findOne.mockResolvedValue({ id: 'b1', customerId: 'user-1', status: BookingStatus.CONFIRMED });

      await expect(service.create({ bookingId: 'b1', rating: 5 }, actor())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('ném ConflictException khi booking đã được đánh giá', async () => {
      bookingRepo.findOne.mockResolvedValue({ id: 'b1', customerId: 'user-1', status: BookingStatus.COMPLETED });
      reviewRepo.findOne.mockResolvedValue({ id: 'r-existing' });

      await expect(service.create({ bookingId: 'b1', rating: 5 }, actor())).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('tạo review PENDING và denormalize tourId từ lịch khởi hành', async () => {
      bookingRepo.findOne.mockResolvedValue({
        id: 'b1',
        code: 'BK001',
        customerId: 'user-1',
        scheduleId: 's1',
        status: BookingStatus.COMPLETED,
      });
      reviewRepo.findOne.mockResolvedValueOnce(null); // chưa có review
      bookingRepo.manager.getRepository.mockReturnValue({
        findOne: vi.fn().mockResolvedValue({ id: 's1', tourId: 'tour-9' }),
      });
      reviewRepo.save.mockResolvedValue({ id: 'r1' });
      // getById sau khi tạo
      reviewRepo.findOne.mockResolvedValueOnce({
        id: 'r1',
        bookingId: 'b1',
        tourId: 'tour-9',
        userId: 'user-1',
        rating: 5,
        comment: 'Tuyệt',
        status: ReviewStatus.PENDING,
      });

      const result = await service.create({ bookingId: 'b1', rating: 5, comment: '  Tuyệt  ' }, actor());

      expect(reviewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tourId: 'tour-9', userId: 'user-1', rating: 5, comment: 'Tuyệt', status: ReviewStatus.PENDING }),
      );
      expect(result.tourId).toBe('tour-9');
      expect(result.status).toBe(ReviewStatus.PENDING);
    });
  });

  describe('update', () => {
    it('ném ForbiddenException khi sửa review của người khác', async () => {
      reviewRepo.findOne.mockResolvedValue({ id: 'r1', userId: 'other', status: ReviewStatus.PENDING });

      await expect(service.update('r1', { rating: 4 }, actor('user-1'))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('ném ConflictException khi review đã được kiểm duyệt', async () => {
      reviewRepo.findOne.mockResolvedValue({ id: 'r1', userId: 'user-1', status: ReviewStatus.VISIBLE });

      await expect(service.update('r1', { rating: 4 }, actor())).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('moderate', () => {
    it('ném BadRequestException khi cố đặt lại PENDING', async () => {
      await expect(service.moderate('r1', ReviewStatus.PENDING, actor())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('đổi trạng thái và tính lại điểm tour trong transaction', async () => {
      const reviewEntity = { id: 'r1', tourId: 'tour-9', status: ReviewStatus.PENDING, moderatedBy: null };
      const reviewRepoInTx = {
        findOne: vi.fn().mockResolvedValue(reviewEntity),
        save: vi.fn().mockResolvedValue(reviewEntity),
        createQueryBuilder: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          addSelect: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          andWhere: vi.fn().mockReturnThis(),
          getRawOne: vi.fn().mockResolvedValue({ avg: '4.5', count: '2' }),
        }),
      };
      const tourRepoInTx = {
        createQueryBuilder: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          execute: vi.fn().mockResolvedValue({ affected: 1 }),
        }),
      };
      reviewRepo.manager.transaction.mockImplementation(async (cb: (m: unknown) => unknown) =>
        cb({
          getRepository: (entity: unknown) =>
            entity === Review ? reviewRepoInTx : tourRepoInTx,
        }),
      );
      // getById sau moderate
      reviewRepo.findOne.mockResolvedValue({
        id: 'r1',
        tourId: 'tour-9',
        status: ReviewStatus.VISIBLE,
        moderatedBy: 'user-1',
      });

      const result = await service.moderate('r1', ReviewStatus.VISIBLE, actor());

      expect(reviewRepoInTx.save).toHaveBeenCalled();
      expect(tourRepoInTx.createQueryBuilder).toHaveBeenCalled();
      expect(result.status).toBe(ReviewStatus.VISIBLE);
    });
  });

  describe('getTourSummary', () => {
    it('tính avgRating và phân bố từ các review VISIBLE', async () => {
      reviewRepo.createQueryBuilder.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([
          { rating: 5, count: '3' },
          { rating: 4, count: '1' },
        ]),
      });

      const summary = await service.getTourSummary('tour-9');

      expect(summary.reviewCount).toBe(4);
      expect(summary.avgRating).toBe(4.8); // (5*3 + 4*1)/4 = 4.75 → 4.8
      expect(summary.distribution[5]).toBe(3);
      expect(summary.distribution[4]).toBe(1);
    });

    it('trả avgRating = 0 khi chưa có review', async () => {
      reviewRepo.createQueryBuilder.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([]),
      });

      const summary = await service.getTourSummary('tour-9');

      expect(summary.avgRating).toBe(0);
      expect(summary.reviewCount).toBe(0);
    });
  });
});