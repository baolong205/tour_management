import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemSetting } from './entities/system-setting.entity.js';
import { SystemSettingService } from './system-setting.service.js';

/**
 * Unit test cho SystemSettingService – mock repository, không cần DB.
 *
 * Tập trung vào các helper có kiểu (getNumber/getBoolean/getString) và upsert.
 */

function makeRepoMock() {
  return {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((data: unknown) => data),
    remove: vi.fn(),
  };
}

describe('SystemSettingService', () => {
  let service: SystemSettingService;
  let repo: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    repo = makeRepoMock();

    const moduleRef = await Test.createTestingModule({
      providers: [SystemSettingService, { provide: getRepositoryToken(SystemSetting), useValue: repo }],
    }).compile();

    service = moduleRef.get(SystemSettingService);
  });

  describe('getNumber', () => {
    it('trả giá trị số khi value là number', async () => {
      repo.findOne.mockResolvedValue({ key: 'k', value: 15 });

      await expect(service.getNumber('k', 0)).resolves.toBe(15);
    });

    it('ép chuỗi số hợp lệ sang number', async () => {
      repo.findOne.mockResolvedValue({ key: 'k', value: '20' });

      await expect(service.getNumber('k', 0)).resolves.toBe(20);
    });

    it('trả fallback khi không có hoặc giá trị không hợp lệ', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.getNumber('k', 7)).resolves.toBe(7);

      repo.findOne.mockResolvedValue({ key: 'k', value: 'abc' });
      await expect(service.getNumber('k', 7)).resolves.toBe(7);
    });
  });

  describe('getBoolean', () => {
    it('trả boolean khi value là boolean', async () => {
      repo.findOne.mockResolvedValue({ key: 'k', value: false });

      await expect(service.getBoolean('k', true)).resolves.toBe(false);
    });

    it('hiểu chuỗi "true"/"false"', async () => {
      repo.findOne.mockResolvedValue({ key: 'k', value: 'true' });
      await expect(service.getBoolean('k', false)).resolves.toBe(true);

      repo.findOne.mockResolvedValue({ key: 'k', value: 'false' });
      await expect(service.getBoolean('k', true)).resolves.toBe(false);
    });

    it('trả fallback khi giá trị không xác định', async () => {
      repo.findOne.mockResolvedValue({ key: 'k', value: 123 });

      await expect(service.getBoolean('k', true)).resolves.toBe(true);
    });
  });

  describe('getString', () => {
    it('trả chuỗi khi value là string', async () => {
      repo.findOne.mockResolvedValue({ key: 'k', value: 'hello' });

      await expect(service.getString('k', 'x')).resolves.toBe('hello');
    });

    it('trả fallback khi value không phải string', async () => {
      repo.findOne.mockResolvedValue({ key: 'k', value: 5 });

      await expect(service.getString('k', 'x')).resolves.toBe('x');
    });
  });

  describe('upsert', () => {
    it('tạo mới khi key chưa tồn tại', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockResolvedValue({ key: 'booking.hold_minutes', value: 15, description: 'Số phút' });

      const view = await service.upsert({ key: 'booking.hold_minutes', value: 15, description: 'Số phút' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'booking.hold_minutes', value: 15 }),
      );
      expect(view.value).toBe(15);
    });

    it('cập nhật khi key đã tồn tại', async () => {
      const entity = { key: 'k', value: 10, description: null };
      repo.findOne.mockResolvedValue(entity);
      repo.save.mockImplementation(async (e: unknown) => e);

      const view = await service.upsert({ key: 'k', value: 99 });

      expect(view.value).toBe(99);
    });
  });

  describe('remove', () => {
    it('ném NotFoundException khi key không tồn tại', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('xóa cấu hình tồn tại', async () => {
      const entity = { key: 'k', value: 1 };
      repo.findOne.mockResolvedValue(entity);

      await service.remove('k');

      expect(repo.remove).toHaveBeenCalledWith(entity);
    });
  });
});