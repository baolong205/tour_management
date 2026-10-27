import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Banner } from './entities/banner.entity.js';
import { BannerService } from './banner.service.js';

/**
 * Unit test cho BannerService – mock repository, không cần DB.
 */

function makeRepoMock() {
  return {
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((data: unknown) => data),
    remove: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
}

describe('BannerService', () => {
  let service: BannerService;
  let repo: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    repo = makeRepoMock();

    const moduleRef = await Test.createTestingModule({
      providers: [BannerService, { provide: getRepositoryToken(Banner), useValue: repo }],
    }).compile();

    service = moduleRef.get(BannerService);
  });

  describe('create', () => {
    it('ném BadRequestException khi endAt <= startAt', async () => {
      await expect(
        service.create({
          title: 'B',
          imageUrl: 'https://x/y.jpg',
          startAt: '2026-08-31T00:00:00.000Z',
          endAt: '2026-06-01T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('tạo banner với sortOrder mặc định = 0 và active = true', async () => {
      repo.save.mockResolvedValue({
        id: 'b1',
        title: 'Ưu đãi hè',
        imageUrl: 'https://x/y.jpg',
        linkUrl: null,
        sortOrder: 0,
        active: true,
        startAt: null,
        endAt: null,
        isVisible: () => true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const view = await service.create({ title: 'Ưu đãi hè', imageUrl: 'https://x/y.jpg' });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 0, active: true }));
      expect(view.visible).toBe(true);
    });
  });

  describe('getOrFail', () => {
    it('ném NotFoundException khi không tìm thấy', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getOrFail('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('ném BadRequestException khi khoảng thời gian mới không hợp lệ', async () => {
      repo.findOne.mockResolvedValue({
        id: 'b1',
        title: 'B',
        startAt: new Date('2026-06-01T00:00:00Z'),
        endAt: new Date('2026-08-31T00:00:00Z'),
      });

      await expect(
        service.update('b1', { endAt: '2026-05-01T00:00:00.000Z' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('setActive', () => {
    it('đổi trạng thái bật/tắt', async () => {
      const entity = { id: 'b1', title: 'B', active: true, isVisible: () => false };
      repo.findOne.mockResolvedValue(entity);
      repo.save.mockImplementation(async (e: unknown) => e);

      const view = await service.setActive('b1', false);

      expect(view.active).toBe(false);
    });
  });

  describe('remove', () => {
    it('xóa banner tồn tại', async () => {
      const entity = { id: 'b1', title: 'B' };
      repo.findOne.mockResolvedValue(entity);

      await service.remove('b1');

      expect(repo.remove).toHaveBeenCalledWith(entity);
    });
  });
});