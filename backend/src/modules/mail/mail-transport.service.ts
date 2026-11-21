import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { MailMessage } from './entities/mail-message.entity.js';
import { isEmail } from 'class-validator';

@Injectable()
export class MailTransportService implements OnModuleDestroy {
  private readonly logger = new Logger(MailTransportService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly provider: string;
  private readonly apiKey: string;
  private readonly sender: { email: string; name?: string } | null;

  constructor(config: ConfigService) {
    const enabled = config.get<string>('MAIL_ENABLED', 'false') === 'true';
    const host = config.get<string>('SMTP_HOST', '');
    this.from = config.get<string>('MAIL_FROM', '');
    this.provider = config.get<string>('MAIL_PROVIDER', 'smtp');
    this.apiKey = config.get<string>('BREVO_API_KEY', '');
    this.sender = null;
    this.transporter = null;
    if (!enabled) {
      this.logger.warn('Gửi email đang tắt; thư được giữ trong hàng đợi đến khi MAIL_ENABLED=true.');
      return;
    }
    if (this.provider === 'brevo') {
      if (!this.apiKey.trim() || /[\r\n]/.test(this.apiKey)) throw new Error('MAIL_PROVIDER=brevo yêu cầu BREVO_API_KEY hợp lệ');
      const match = this.from.trim().match(/^(.*?)\s*<([^<>]+)>$/);
      const email = (match ? match[2] : this.from).trim();
      if (!isEmail(email) || /[\r\n]/.test(this.from)) throw new Error('MAIL_PROVIDER=brevo yêu cầu MAIL_FROM hợp lệ');
      const name = match?.[1].trim().replace(/^"|"$/g, '');
      this.sender = { email, ...(name ? { name } : {}) };
      return;
    }
    if (this.provider !== 'smtp') throw new Error('MAIL_PROVIDER phải là smtp hoặc brevo');
    if (!host || !this.from || /[\r\n]/.test(this.from)) {
      throw new Error('MAIL_ENABLED=true yêu cầu SMTP_HOST và MAIL_FROM hợp lệ');
    }
    const port = Number(config.get<string>('SMTP_PORT', '587'));
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT không hợp lệ');
    const user = config.get<string>('SMTP_USER', '');
    const pass = config.get<string>('SMTP_PASSWORD', '');
    if (!!user !== !!pass) throw new Error('Cần cấu hình cả SMTP_USER và SMTP_PASSWORD');
    this.transporter = nodemailer.createTransport({
      host, port, secure: config.get<string>('SMTP_SECURE', String(port === 465)) === 'true',
      requireTLS: config.get<string>('SMTP_REQUIRE_TLS', 'true') === 'true',
      ...(user ? { auth: { user, pass } } : {}),
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
      disableFileAccess: true, disableUrlAccess: true,
    });
  }

  get enabled(): boolean { return this.transporter !== null || this.sender !== null; }

  async send(message: MailMessage): Promise<void> {
    if (this.sender) {
      await this.sendViaBrevo(message);
      return;
    }
    if (!this.transporter) throw new Error('Gửi email chưa được bật');
    const result = await this.transporter.sendMail({
      from: this.from, to: { address: message.recipient, name: '' },
      // Stable Message-ID helps mail servers recognize retried submissions.
      messageId: `<${message.id}@tour-management.mail>`, subject: message.subject,
      text: message.text, html: message.html,
      ...(message.attachmentName ? { attachments: [{ filename: message.attachmentName, content: message.html, contentType: 'text/html; charset=utf-8' }] } : {}),
    });
    if (!result.accepted?.length) throw new Error('SMTP không chấp nhận người nhận');
  }

  private async sendViaBrevo(message: MailMessage): Promise<void> {
    let response: Response;
    try {
      response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': this.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          sender: this.sender,
          to: [{ email: message.recipient }],
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
          ...(message.attachmentName ? {
            attachment: [{ name: message.attachmentName, content: Buffer.from(message.html, 'utf8').toString('base64') }],
          } : {}),
        }),
      });
    } catch {
      throw Object.assign(new Error('Không kết nối được dịch vụ email Brevo'), { code: 'BREVO_NETWORK_ERROR' });
    }
    // Do not expose response bodies: they may contain recipient data or provider details.
    if (!response.ok) {
      await response.body?.cancel();
      throw Object.assign(new Error(`Brevo từ chối gửi email (HTTP ${response.status})`), { code: `BREVO_HTTP_${response.status}` });
    }
    let result: { messageId?: unknown };
    try {
      result = await response.json() as { messageId?: unknown };
    } catch {
      throw Object.assign(new Error('Phản hồi Brevo không hợp lệ'), { code: 'BREVO_INVALID_RESPONSE' });
    }
    if (!result || typeof result.messageId !== 'string' || !result.messageId) {
      throw Object.assign(new Error('Brevo chưa xác nhận chấp nhận email'), { code: 'BREVO_INVALID_RESPONSE' });
    }
  }

  onModuleDestroy(): void { this.transporter?.close(); }
}
