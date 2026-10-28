import { NotFoundException } from '@nestjs/common';
import { SupportService, canManageSupport } from './support.service.js';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';

describe('Support ownership and replies', () => {
  const customer = { id: 'customer', fullName: 'Khách', permissions: [] } as unknown as AuthenticatedUser;
  const staff = { id: 'staff', fullName: 'CSKH', permissions: ['support:manage'] } as unknown as AuthenticatedUser;
  const ticket = { id: 'ticket', customerId: 'customer', replies: [], status: 'OPEN' };
  let repo: any;
  let service: SupportService;
  beforeEach(() => {
    repo = { findOne: vi.fn().mockResolvedValue({ ...ticket, replies: [] }), save: vi.fn(value => Promise.resolve(value)), findAndCount: vi.fn().mockResolvedValue([[], 0]), create: vi.fn(value => value) };
    service = new SupportService(repo, { transaction: (callback: any) => callback({ getRepository: () => repo }) } as any);
  });
  it('customer list always scoped to own ID', async () => {
    await service.list(customer, {}, true);
    expect(repo.findAndCount.mock.calls[0][0].where).toEqual({ customerId: 'customer' });
    expect(canManageSupport(customer)).toBe(false);
    expect(canManageSupport(staff)).toBe(true);
  });
  it('denies another customer and never writes replies', async () => {
    await expect(service.update('ticket', { ...customer, id: 'other' }, 'Hello')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('staff replies use row lock and update status', async () => {
    const result = await service.update('ticket', staff, ' Đã tiếp nhận ');
    expect(repo.findOne.mock.calls[0][0].lock.mode).toBe('pessimistic_write');
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.replies[0].message).toBe('Đã tiếp nhận');
  });
  it('customer reply reopens ticket', async () => {
    expect((await service.update('ticket', customer, 'Cần hỗ trợ thêm')).status).toBe('OPEN');
  });
});