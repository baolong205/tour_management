import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailTemplate } from './entities/email-template.entity.js';
import { EmailTemplateService } from './email-template.service.js';

/**
 * Unit test cho EmailTemplateService – mock repository, không cần DB.
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

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;
  let repo: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    repo = makeRepoMock();

    const moduleRef = await Test.createTestingModule({
      providers: [EmailTemplateService, { provide: getRepositoryToken(EmailTemplate), useValue: repo }],
    }).compile();

    service = moduleRef.get(EmailTemplateService);
  });

  describe('create', () => {
    it('chuẩn hóa code thành chữ HOA và lưu', async () => {
      repo.createQueryBuilder.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      });
      repo.save.mockResolvedValue({
        id: 't1',
        code: 'BOOKING_CONFIRMED',
        subject: 'Xác nhận',
        bodyHtml: '<h1>Hi</h1>',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const view = await service.create({
        code: 'booking_confirmed',
        subject: 'Xác nhận',
        bodyHtml: '<h1>Hi</h1>',
      });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'BOOKING_CONFIRMED' }));
      expect(view.code).toBe('BOOKING_CONFIRMED');
    });

    it('ném ConflictException khi mã đã tồn tại', async () => {
      repo.createQueryBuilder.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({ id: 'existing', code: 'BOOKING_CONFIRMED' }),
      });

      await expect(
        service.create({ code: 'BOOKING_CONFIRMED', subject: 'S', bodyHtml: '<p>x</p>' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('getActiveByCodeOrFail', () => {
    it('ném NotFoundException khi không có mẫu', async () => {
      repo.createQueryBuilder.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      });

      await expect(service.getActiveByCodeOrFail('MISSING')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ném NotFoundException khi mẫu đang tắt', async () => {
      repo.createQueryBuilder.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({ id: 't1', code: 'X', active: false }),
      });

      await expect(service.getActiveByCodeOrFail('X')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('trả mẫu khi đang bật', async () => {
      const entity = { id: 't1', code: 'X', active: true };
      repo.createQueryBuilder.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(entity),
      });

      await expect(service.getActiveByCodeOrFail('X')).resolves.toBe(entity);
    });
  });

  describe('update', () => {
    it('cho phép giữ nguyên code của chính nó (không báo trùng)', async () => {
      const entity = { id: 't1', code: 'X', subject: 'S', bodyHtml: '<p>x</p>', active: true };
      repo.findOne.mockResolvedValue(entity);
      repo.createQueryBuilder.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({ id: 't1', code: 'X' }),
      });
      repo.save.mockImplementation(async (e: unknown) => e);

      const view = await service.update('t1', { code: 'x', subject: 'Mới' });

      expect(view.subject).toBe('Mới');
    });
  });

  describe('remove', () => {
    it('ném NotFoundException khi không tìm thấy', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});