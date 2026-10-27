import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationType } from '../../common/enums/index.js';
import { Notification } from './entities/notification.entity.js';
import { NotificationService } from './notification.service.js';

/**
 * Unit test cho NotificationService – mock repository, không cần DB.
 */

function makeRepoMock() {
  return {
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((data: unknown) => data),
    createQueryBuilder: vi.fn(),
  };
}

describe('NotificationService', () => {
  let service: NotificationService;
  let repo: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    repo = makeRepoMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(Notification), useValue: repo },
      ],
    }).compile();

    service = moduleRef.get(NotificationService);
  });

  describe('create', () => {
    it('lưu thông báo và trả view với isRead = false', async () => {
      repo.save.mockResolvedValue({
        id: 'n1',
        userId: 'u1',
        type: NotificationType.SYSTEM,
        title: 'Bảo trì',
        body: null,
        payload: null,
        readAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      const view = await service.create({ userId: 'u1', type: NotificationType.SYSTEM, title: 'Bảo trì' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', title: 'Bảo trì', body: null, payload: null }),
      );
      expect(view.isRead).toBe(false);
      expect(view.readAt).toBeNull();
    });
  });

  describe('createMany', () => {
    it('trả 0 và không gọi save khi danh sách rỗng', async () => {
      const count = await service.createMany([]);

      expect(count).toBe(0);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('trả số lượng đã lưu', async () => {
      repo.save.mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]);

      const count = await service.createMany([
        { userId: 'u1', type: NotificationType.SYSTEM, title: 'A' },
        { userId: 'u2', type: NotificationType.SYSTEM, title: 'B' },
      ]);

      expect(count).toBe(2);
    });
  });

  describe('markRead', () => {
    it('ném NotFoundException khi không tìm thấy thông báo', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.markRead('n1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ném NotFoundException khi thông báo thuộc người khác (không lộ sự tồn tại)', async () => {
      repo.findOne.mockResolvedValue({ id: 'n1', userId: 'other', readAt: null });

      await expect(service.markRead('n1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('đánh dấu đã đọc và trả isRead = true', async () => {
      const entity = { id: 'n1', userId: 'u1', readAt: null, markRead: vi.fn() };
      entity.markRead = vi.fn(function (this: { readAt: Date | null }) {
        this.readAt = new Date('2026-01-02T00:00:00Z');
      });
      repo.findOne.mockResolvedValue(entity);
      repo.save.mockImplementation(async (e: unknown) => e);

      const view = await service.markRead('n1', 'u1');

      expect(entity.markRead).toHaveBeenCalled();
      expect(view.isRead).toBe(true);
    });
  });

  describe('unreadCount', () => {
    it('trả số thông báo chưa đọc', async () => {
      repo.createQueryBuilder.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(3),
      });

      const result = await service.unreadCount('u1');

      expect(result).toEqual({ unread: 3 });
    });
  });

  describe('markAllRead', () => {
    it('cập nhật readAt cho toàn bộ chưa đọc rồi trả số còn lại', async () => {
      const execute = vi.fn().mockResolvedValue({ affected: 2 });
      repo.createQueryBuilder
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          andWhere: vi.fn().mockReturnThis(),
          execute,
        })
        .mockReturnValueOnce({
          where: vi.fn().mockReturnThis(),
          andWhere: vi.fn().mockReturnThis(),
          getCount: vi.fn().mockResolvedValue(0),
        });

      const result = await service.markAllRead('u1');

      expect(execute).toHaveBeenCalled();
      expect(result).toEqual({ unread: 0 });
    });
  });
});