import { PaymentService } from './payment.service.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { Payment } from './entities/payment.entity.js';
import { BookingStatus, PaymentMethod, PaymentStatus, WebhookResult } from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { PaymentReceiptService } from './services/payment-receipt.service.js';

function fixture() {
  const booking = Object.assign(new Booking(), { id: 'booking', code: 'BK260001', customerId: 'customer', status: BookingStatus.PENDING_PAYMENT, total: 900_000 });
  const payment = Object.assign(new Payment(), { id: 'payment', bookingId: 'booking', method: PaymentMethod.VNPAY, gateway: 'VNPAY', gatewayTxnRef: 'REF001', amount: 900_000, status: PaymentStatus.PENDING, refundedAmount: 0 });
  const paymentRepository = { findOne: vi.fn().mockImplementation(async () => payment), existsBy: vi.fn().mockResolvedValue(false) };
  const bookingRepository = { findOne: vi.fn().mockImplementation(async () => booking) };
  const eventRepository = { findOne: vi.fn().mockResolvedValue(null), create: (value: any) => value, save: vi.fn(async value => value) };
  const manager: any = {
    getRepository: (entity: any) => entity === Booking ? bookingRepository : entity === Payment ? paymentRepository : eventRepository,
    save: vi.fn(async (_: any, value: any) => value), create: (_: any, value: any) => value,
    transaction: async (work: any) => work(manager),
  };
  const invoice = { number: 'INV2026-TEST', issuedAt: new Date(), snapshot: { customerName: 'Customer', customerEmail: 'customer@example.test', customerPhone: '0901234567', tourName: 'Tour', startDate: '2026-12-01', subtotal: 1_000_000, discount: 100_000, total: 900_000, lines: [] } };
  const invoices = { issue: vi.fn().mockResolvedValue(invoice) };
  const mail = { enqueue: vi.fn().mockResolvedValue(undefined) };
  const repo: any = { ...paymentRepository, manager };
  const promotions = { confirmRedemption: vi.fn().mockResolvedValue(1) };
  const receipts = new PaymentReceiptService(invoices as any, mail as any, promotions as any);
  const service = new PaymentService(repo, {} as any, eventRepository as any, { getOrFail: vi.fn().mockResolvedValue(booking) } as any, {} as any, receipts, {} as any);
  const webhook = { txnRef: 'REF001', gateway: 'VNPAY', gatewayTxnNo: 'GATE001', amount: 900_000, success: true };
  return { service, booking, payment, manager, invoices, mail, promotions, webhook, paymentRepository };
}

describe('Payment receipt workflow', () => {
  it('records a payment, invoice and queued email together; repeated webhook has no second receipt', async () => {
    const { service, webhook, booking, invoices, mail, manager, promotions } = fixture();
    expect(await service.handleWebhook(webhook, { trusted: true })).toMatchObject({ result: WebhookResult.PROCESSED });
    expect(booking.status).toBe(BookingStatus.PENDING_CONFIRMATION);
    expect(promotions.confirmRedemption).toHaveBeenCalledWith('booking', manager);
    expect(invoices.issue).toHaveBeenCalledWith('booking', manager);
    expect(mail.enqueue).toHaveBeenCalledWith(manager, expect.objectContaining({ deduplicationKey: 'payment-receipt:payment', recipient: 'customer@example.test', attachmentName: 'hoa-don-INV2026-TEST.html' }));
    expect(await service.handleWebhook(webhook, { trusted: true })).toMatchObject({ result: WebhookResult.IGNORED });
    expect(invoices.issue).toHaveBeenCalledTimes(1); expect(mail.enqueue).toHaveBeenCalledTimes(1);
    expect(promotions.confirmRedemption).toHaveBeenCalledTimes(1);
  });

  it.each([{ success: false }, { amount: 1 }])('does not issue receipts for failed or mismatched payments: %j', async override => {
    const { service, webhook, invoices, mail } = fixture();
    await service.handleWebhook({ ...webhook, ...override }, { trusted: true });
    expect(invoices.issue).not.toHaveBeenCalled(); expect(mail.enqueue).not.toHaveBeenCalled();
  });

  it('queues the same receipt when staff approves a submitted bank proof', async () => {
    const { service, payment, invoices, mail } = fixture();
    payment.method = PaymentMethod.BANK_TRANSFER; payment.status = PaymentStatus.PROOF_SUBMITTED;
    await service.approveProof('payment', { id: 'staff', email: 'staff@example.test' } as AuthenticatedUser);
    expect(payment.status).toBe(PaymentStatus.SUCCESS);
    expect(invoices.issue).toHaveBeenCalledTimes(1); expect(mail.enqueue).toHaveBeenCalledTimes(1);
  });

  it('creates a refund instead of sending a misleading receipt for late or duplicate payments', async () => {
    const { service, booking, webhook, invoices, mail } = fixture();
    booking.status = BookingStatus.EXPIRED;
    expect(await service.handleWebhook(webhook, { trusted: true })).toMatchObject({ result: WebhookResult.LATE });
    expect(invoices.issue).not.toHaveBeenCalled(); expect(mail.enqueue).not.toHaveBeenCalled();
  });

  it('prevents a second bank approval from issuing another invoice', async () => {
    const { service, payment, paymentRepository, mail } = fixture();
    payment.method = PaymentMethod.BANK_TRANSFER; payment.status = PaymentStatus.PROOF_SUBMITTED;
    paymentRepository.existsBy.mockResolvedValue(true);
    await expect(service.approveProof('payment', { id: 'staff' } as AuthenticatedUser)).rejects.toThrow(/thanh toán/);
    expect(mail.enqueue).not.toHaveBeenCalled();
  });
});
