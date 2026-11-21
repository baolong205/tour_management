import 'reflect-metadata';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { isEmail } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { MailMessage } from '../src/modules/mail/entities/mail-message.entity.js';
import { MailTransportService } from '../src/modules/mail/mail-transport.service.js';

/** Sends one explicitly addressed test message; does not process the payment outbox. */
async function main(): Promise<void> {
  const { values } = parseArgs({ options: { to: { type: 'string' } }, strict: true });
  if (!values.to || !isEmail(values.to) || /[\r\n]/.test(values.to)) {
    throw new Error('Cách dùng: npm.cmd run mail:test -- --to your-email@example.com');
  }
  await ConfigModule.forRoot({ envFilePath: '.env' });
  // Enable only this transport. Leave the application's background outbox setting intact.
  const config = new ConfigService({ MAIL_ENABLED: 'true' });
  const provider = config.get<string>('MAIL_PROVIDER', 'smtp');
  const required = provider === 'brevo' ? ['BREVO_API_KEY', 'MAIL_FROM'] : ['SMTP_HOST', 'MAIL_FROM'];
  const missing = required.filter(key => {
    const value = config.get<string>(key, '').trim();
    return !value || /example\.(com|test)|your-domain|your-provider/i.test(value);
  });
  if (provider === 'smtp' && config.get<string>('SMTP_HOST', '').toLowerCase() === 'smtp.gmail.com') {
    for (const key of ['SMTP_USER', 'SMTP_PASSWORD']) {
      if (!config.get<string>(key, '').trim()) missing.push(key);
    }
  }
  if (missing.length) {
    throw new Error(`Chưa cấu hình ${missing.join(', ')} trong backend/.env. Điền trực tiếp vào file, không gửi API key/mật khẩu qua chat.`);
  }

  const transport = new MailTransportService(config);
  try {
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    await transport.send(Object.assign(new MailMessage(), {
      id: randomUUID(), recipient: values.to,
      subject: 'TourGo – Kiểm tra gửi email thật',
      text: `Xin chào,\n\nĐây là email kiểm tra chức năng gửi thư từ dự án quản lý tour TourGo.\nThời gian: ${now} (giờ Việt Nam).\nNếu bạn nhận được thư này, dịch vụ email đã gửi thư thành công.\n\nEmail thử nghiệm này không xác nhận một giao dịch thanh toán.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#173344;max-width:640px;margin:auto;padding:24px"><h1 style="color:#087f8c">TourGo</h1><h2>Kiểm tra gửi email thật</h2><p>Xin chào,</p><p>Đây là email kiểm tra chức năng gửi thư từ dự án quản lý tour TourGo.</p><p>Thời gian: <strong>${now}</strong> (giờ Việt Nam).</p><p>Nếu bạn nhận được thư này, cấu hình SMTP đã gửi thư thành công.</p><hr><p style="font-size:13px;color:#5c6f7b">Email thử nghiệm này không xác nhận một giao dịch thanh toán.</p></div>`,
      attachmentName: null,
    }));
    console.log(`Dịch vụ email đã chấp nhận thư thử nghiệm gửi tới ${values.to}. Kiểm tra Inbox và Spam / Thư rác.`);
  } finally {
    transport.onModuleDestroy();
  }
}

main().catch((error: unknown) => {
  const smtpError = error as { code?: string; responseCode?: number };
  if (smtpError.code) {
    const advice = smtpError.code === 'EAUTH'
      ? 'Kiểm tra SMTP_USER và mật khẩu ứng dụng trong backend/.env.'
      : 'Kiểm tra kết nối mạng, SMTP_HOST, SMTP_PORT và thiết lập TLS.';
    console.error(`Gửi email thất bại (${smtpError.code}${smtpError.responseCode ? ` / ${smtpError.responseCode}` : ''}). ${advice}`);
  } else {
    console.error(error instanceof Error ? error.message : 'Không gửi được email thử nghiệm.');
  }
  process.exitCode = 1;
});
