import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditLogService } from './audit-log.service.js';

/**
 * Unit test cho AuditLogService – mock repository, không cần DB.
 *
 * Điểm quan trọng: `write()` phải "nuốt" lỗi để không chặn luồng nghiệp vụ.
 */

function makeRepoMock() {
  return {
    save: vi.fn(),
    create: vi.fn((data: unknown) => data),
    createQueryBuilder: vi.fn(),
  };
}

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repo: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    repo = makeRepoMock();

    const moduleRef = await Test.createTestingModule({
      providers: [AuditLogService, { provide: getRepositoryToken(AuditLog), useValue: repo }],
    }).compile();

    service = moduleRef.get(AuditLogService);
  });

  describe('write', () => {
    it('lưu bản ghi với các trường mặc định null', async () => {
      repo.save.mockResolvedValue({});

      await service.write({ action: 'booking.confirm', entityType: 'booking', entityId: 'b1' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: null,
          action: 'booking.confirm',
          entityType: 'booking',
          entityId: 'b1',
          before: null,
          after: null,
          ip: null,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('không ném lỗi khi ghi thất bại (không chặn nghiệp vụ)', async () => {
      repo.save.mockRejectedValue(new Error('DB down'));

      await expect(
        service.write({ action: 'x', entityType: 'y', entityId: 'z' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('paginate', () => {
    it('trả danh sách kèm tên người thao tác', async () => {
      repo.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([
          [
            {
              id: '1',
              actorId: 'u1',
              actor: { fullName: 'Nguyễn Văn A' },
              action: 'booking.confirm',
              entityType: 'booking',
              entityId: 'b1',
              before: null,
              after: { status: 'CONFIRMED' },
              ip: '127.0.0.1',
              createdAt: new Date('2026-01-01T00:00:00Z'),
            },
          ],
          1,
        ]),
      });

      const result = await service.paginate({ page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.items[0].actorName).toBe('Nguyễn Văn A');
      expect(result.items[0].action).toBe('booking.confirm');
    });
  });
});