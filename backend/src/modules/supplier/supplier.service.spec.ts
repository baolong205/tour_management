import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupplierType } from '../../common/enums/index.js';
import { ResourceAssignment } from './entities/resource-assignment.entity.js';
import { Supplier } from './entities/supplier.entity.js';
import { SupplierService } from './supplier.service.js';

/**
 * Unit test cho SupplierService – mock repository, không cần DB.
 */

function makeRepoMock() {
  return {
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((data: unknown) => data),
    count: vi.fn(),
    softRemove: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
}

describe('SupplierService', () => {
  let service: SupplierService;
  let supplierRepo: ReturnType<typeof makeRepoMock>;
  let assignmentRepo: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    supplierRepo = makeRepoMock();
    assignmentRepo = makeRepoMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SupplierService,
        { provide: getRepositoryToken(Supplier), useValue: supplierRepo },
        { provide: getRepositoryToken(ResourceAssignment), useValue: assignmentRepo },
      ],
    }).compile();

    service = moduleRef.get(SupplierService);
  });

  describe('create', () => {
    it('trim tên và mặc định active = true', async () => {
      supplierRepo.save.mockResolvedValue({
        id: 's1',
        type: SupplierType.HOTEL,
        name: 'KS Mường Thanh',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const view = await service.create({ type: SupplierType.HOTEL, name: '  KS Mường Thanh  ' });

      expect(supplierRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'KS Mường Thanh', active: true }),
      );
      expect(view.name).toBe('KS Mường Thanh');
    });
  });

  describe('getOrFail', () => {
    it('ném NotFoundException khi không tìm thấy', async () => {
      supplierRepo.findOne.mockResolvedValue(null);

      await expect(service.getOrFail('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('setActive', () => {
    it('đổi trạng thái hoạt động', async () => {
      const entity = { id: 's1', name: 'KS', active: true };
      supplierRepo.findOne.mockResolvedValue(entity);
      supplierRepo.save.mockImplementation(async (e: unknown) => e);

      const view = await service.setActive('s1', false);

      expect(view.active).toBe(false);
    });
  });

  describe('remove', () => {
    it('ném ConflictException khi nhà cung cấp còn phân bổ nguồn lực', async () => {
      supplierRepo.findOne.mockResolvedValue({ id: 's1', name: 'KS' });
      assignmentRepo.count.mockResolvedValue(2);

      await expect(service.remove('s1')).rejects.toBeInstanceOf(ConflictException);
      expect(supplierRepo.softRemove).not.toHaveBeenCalled();
    });

    it('xóa mềm khi không còn phân bổ', async () => {
      const entity = { id: 's1', name: 'KS' };
      supplierRepo.findOne.mockResolvedValue(entity);
      assignmentRepo.count.mockResolvedValue(0);

      await service.remove('s1');

      expect(supplierRepo.softRemove).toHaveBeenCalledWith(entity);
    });
  });
});