import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { In, LessThanOrEqual, type EntityManager, type Repository } from 'typeorm';
import { uuidv4 } from '../../common/entities/base.entity.js';
import { MailMessage } from './entities/mail-message.entity.js';
import { MailTransportService } from './mail-transport.service.js';

export type EnqueueMail = Pick<MailMessage, 'deduplicationKey' | 'recipient' | 'subject' | 'html' | 'text' | 'attachmentName'>;
const MAX_ATTEMPTS = 8;

@Injectable()
export class MailOutboxService {
  private readonly logger = new Logger(MailOutboxService.name);

  constructor(
    @InjectRepository(MailMessage) private readonly messages: Repository<MailMessage>,
    private readonly transport: MailTransportService,
  ) { }

  async enqueue(manager: EntityManager, input: EnqueueMail): Promise<void> {
    // The payment row is locked by the caller; this unique key also prevents duplicate jobs.
    const repo = manager.getRepository(MailMessage);
    if (await repo.existsBy({ deduplicationKey: input.deduplicationKey })) return;
    await repo.save(repo.create({ ...input, status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), leaseToken: null, sentAt: null, lastError: null }));
  }

  async receiptStatus(paymentIds: string[]) {
    if (!paymentIds.length) return null;
    const message = await this.messages.findOne({
      where: { deduplicationKey: In(paymentIds.map(id => `payment-receipt:${id}`)) },
      select: { status: true, sentAt: true },
      order: { createdAt: 'DESC' },
    });
    return message ? { status: message.status, sentAt: message.sentAt } : null;
  }

  @Cron(CronExpression.EVERY_10_SECONDS, { name: 'send-mail-outbox', waitForCompletion: true })
  async processPending(): Promise<void> {
    if (!this.transport.enabled) return;
    // A bounded batch avoids monopolizing the worker. SMTP runs outside DB transactions.
    for (let index = 0; index < 10; index++) {
      try {
        const message = await this.claim();
        if (!message) break;
        await this.deliver(message);
      } catch (error) {
        this.logger.error(`Không xử lý được hàng đợi email: ${(error as Error).name}`);
        break;
      }
    }
  }

  private async claim(): Promise<MailMessage | null> {
    return this.messages.manager.transaction(async manager => {
      const now = new Date();
      const repo = manager.getRepository(MailMessage);
      const message = await repo.findOne({
        where: [
          { status: 'PENDING', nextAttemptAt: LessThanOrEqual(now) },
          { status: 'SENDING', nextAttemptAt: LessThanOrEqual(now) },
        ], order: { nextAttemptAt: 'ASC' }, lock: { mode: 'pessimistic_write' },
      });
      if (!message) return null;
      if (message.attempts >= MAX_ATTEMPTS) {
        message.status = 'FAILED'; message.leaseToken = null;
        await repo.save(message);
        this.logger.error(`Email ${message.id} (${message.deduplicationKey}) bỏ cuộc sau ${message.attempts} lần thử`);
        return null;
      }
      message.status = 'SENDING'; message.attempts += 1; message.leaseToken = uuidv4();
      message.nextAttemptAt = new Date(now.getTime() + 120_000);
      return repo.save(message);
    });
  }

  private async deliver(message: MailMessage): Promise<void> {
    const where = { id: message.id, leaseToken: message.leaseToken!, status: 'SENDING' as const };
    try {
      await this.transport.send(message);
    } catch (error) {
      // Store the code, not provider responses which can contain credentials or recipient data.
      const code = (error as { code?: string }).code ?? 'SMTP_SEND_FAILED';
      await this.messages.update(where, {
        status: message.attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
        leaseToken: null, lastError: code.slice(0, 500),
        nextAttemptAt: new Date(Date.now() + Math.min(3_600_000, 30_000 * 2 ** (message.attempts - 1))),
      });
      this.logger.warn(`Gửi email ${message.id} thất bại ở lần ${message.attempts}: ${code}`);
      return;
    }
    // If acknowledgement fails, the lease allows recovery after a restart.
    await this.messages.update(where, { status: 'SENT', sentAt: new Date(), leaseToken: null, lastError: null });
    // Log sau khi đã ghi nhận SENT: log thành công là dấu hiệu duy nhất cho thấy
    // thư thực sự rời khỏi hàng đợi (trước đây chỉ có log lỗi nên tưởng như không gửi).
    this.logger.log(
      `Đã gửi email ${message.id} "${message.deduplicationKey}" tới ${message.recipient} (lần ${message.attempts})`,
    );
  }
}
