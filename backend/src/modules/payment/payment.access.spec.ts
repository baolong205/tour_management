import { ForbiddenException } from '@nestjs/common';
import { PaymentService } from './payment.service.js';
import { PaymentMethod } from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';

describe('Cash collection access', () => {
  it('customer cannot mark their own booking paid with OFFICE', async () => {
    const bookingService = { getOrFail: vi.fn().mockResolvedValue({ id: 'booking', customerId: 'customer' }) };
    const service = new PaymentService({} as any, {} as any, {} as any, bookingService as any, {} as any);
    const actor = { id: 'customer', permissions: ['booking:create'] } as AuthenticatedUser;
    await expect(service.create({ bookingId: 'booking', method: PaymentMethod.OFFICE }, actor)).rejects.toBeInstanceOf(ForbiddenException);
  });
});