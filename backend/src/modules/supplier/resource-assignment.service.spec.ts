import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResourceType } from '../../common/enums/index.js';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { ResourceAssignment } from './entities/resource-assignment.entity.js';
import { Supplier } from './entities/supplier.entity.js';
import { ResourceAssignmentService } from './resource-assignment.service.js';

/**
 * Unit test cho ResourceAssignmentService – mock repository, không cần DB.
 */

function makeRepoMock() {
  return {
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((data: unknown) => data),
    remove: vi.fn(),
    exists: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
}

describe('ResourceAssignmentService', () => {
  let service: ResourceAssignmentService;
  let assignmentRepo: ReturnType<typeof makeRepoMock>;
  let supplierRepo: ReturnType<typeof makeRepoMock>;
  let scheduleRepo: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    assignmentRepo = makeRepoMock();
    supplierRepo = makeRepoMock();
    scheduleRepo = makeRepoMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ResourceAssignmentService,
        { provide: getRepositoryToken(ResourceAssignment), useValue: assignmentRepo },
        { provide: getRepositoryToken(Supplier), useValue: supplierRepo },
        { provide: getRepositoryToken(DepartureSchedule), useValue: scheduleRepo },
      ],
    }).compile();

    service = moduleRef.get(ResourceAssignmentService);
  });

  describe('create', () => {
    it('ném NotFoundException khi lịch khởi hành không tồn tại', async () => {
      scheduleRepo.exists.mockResolvedValue(false);

      await expect(
        service.create({ scheduleId: 's1', supplierId: 'sup1', type: ResourceType.HOTEL }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ném NotFoundException khi nhà cung cấp không tồn tại', async () => {
      scheduleRepo.exists.mockResolvedValue(true);
      supplierRepo.exists.mockResolvedValue(false);

      await expect(
        service.create({ scheduleId: 's1', supplierId: 'sup1', type: ResourceType.HOTEL }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('tạo phân bổ với quantity mặc định = 1', async () => {
      scheduleRepo.exists.mockResolvedValue(true);
      supplierRepo.exists.mockResolvedValue(true);
      assignmentRepo.save.mockResolvedValue({ id: 'a1' });
      assignmentRepo.findOne.mockResolvedValue({
        id: 'a1',
        scheduleId: 's1',
        supplierId: 'sup1',
        type: ResourceType.HOTEL,
        quantity: 1,
        cost: null,
        note: null,
        supplier: { name: 'KS', type: 'HOTEL' },
      });

      const view = await service.create({ scheduleId: 's1', supplierId: 'sup1', type: ResourceType.HOTEL });

      expect(assignmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 1, cost: null }),
      );
      expect(view.quantity).toBe(1);
    });
  });

  describe('listBySchedule', () => {
    it('cộng dồn totalCost từ các phân bổ', async () => {
      assignmentRepo.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([
          { id: 'a1', scheduleId: 's1', supplierId: 'sup1', type: ResourceType.HOTEL, quantity: 1, cost: 2000000, note: null, supplier: { name: 'KS', type: 'HOTEL' } },
          { id: 'a2', scheduleId: 's1', supplierId: 'sup2', type: ResourceType.BUS, quantity: 2, cost: 500000, note: null, supplier: { name: 'Xe', type: 'TRANSPORT' } },
        ]),
      });

      const summary = await service.listBySchedule('s1');

      expect(summary.items).toHaveLength(2);
      expect(summary.totalCost).toBe(2500000);
    });

    it('trả totalCost = 0 khi không có phân bổ', async () => {
      assignmentRepo.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      });

      const summary = await service.listBySchedule('s1');

      expect(summary.totalCost).toBe(0);
    });
  });

  describe('remove', () => {
    it('ném NotFoundException khi không tìm thấy phân bổ', async () => {
      assignmentRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});