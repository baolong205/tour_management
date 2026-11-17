import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { BookingStatus } from '../../../common/enums/index.js';
import { Booking } from '../../booking/entities/booking.entity.js';
import { InvoiceService } from '../../booking/services/invoice.service.js';
import { renderInvoice } from '../../booking/templates/invoice.template.js';
import { PromotionService } from '../../promotion/promotion.service.js';
import { MailOutboxService } from '../../mail/mail-outbox.service.js';
import type { Payment } from '../entities/payment.entity.js';

/** Payment state, invoice and queued receipt are committed in the payment transaction. */
@Injectable()
export class PaymentReceiptService {
  constructor(
    private readonly invoices: InvoiceService,
    private readonly mail: MailOutboxService,
    private readonly promotions: PromotionService,
  ) {}
  status(paymentIds: string[]) {
    return this.mail.receiptStatus(paymentIds);
  }
  /**
   * Side-effect khi payment SUCCESS: booking chờ thanh toán → chờ xác nhận.
   *
   * Cố ý **không** gọi thẳng `BookingService.confirm` (mở transaction riêng, đã bị
   * khóa bởi transaction này). Việc chuyển CONFIRMED vẫn do nhân viên thực hiện ở
   * `PATCH /bookings/:id/confirm` với `booking:confirm` – giữ đúng mô hình:
   * tiền về ⇒ chờ duyệt ⇒ xác nhận ⇒ tăng `sold_seats`.
   */
  async record(
    manager: EntityManager,
    booking: Booking,
    payment: Payment,
  ): Promise<void> {
    if (booking.status === BookingStatus.PENDING_PAYMENT) {
      const closed = await manager.getRepository(Booking).findOne({
        where: { id: booking.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (closed && closed.status === BookingStatus.PENDING_PAYMENT) {
        closed.transitionTo(BookingStatus.PENDING_CONFIRMATION);
        closed.expiresAt = null;
        await manager.save(Booking, closed);
      }
    }
    await this.promotions.confirmRedemption(booking.id, manager);
    const invoice = await this.invoices.issue(booking.id, manager);
    await this.mail.enqueue(manager, {
      deduplicationKey: `payment-receipt:${payment.id}`,
      recipient: invoice.snapshot.customerEmail,
      subject: `Xác nhận thanh toán đơn ${booking.code} – ${invoice.number}`,
      html: renderInvoice(invoice),
      text: `Xin chào ${invoice.snapshot.customerName},\nĐã nhận thanh toán ${payment.amount.toLocaleString('vi-VN')} VND cho đơn ${booking.code}.\nTour: ${invoice.snapshot.tourName}\nHóa đơn: ${invoice.number}\nVui lòng mở tệp hóa đơn đính kèm để xem và in. Trạng thái xác nhận chuyến đi được cập nhật trong tài khoản của bạn.`,
      attachmentName: `hoa-don-${invoice.number}.html`,
    });
  }
}
