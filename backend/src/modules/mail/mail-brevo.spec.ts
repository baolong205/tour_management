import { ConfigService } from '@nestjs/config';
import { MailTransportService } from './mail-transport.service.js';
import { MailMessage } from './entities/mail-message.entity.js';

describe('Brevo HTTPS email transport', () => {
  const request = vi.fn();
  const config = (values = {}) => new ConfigService({
    MAIL_ENABLED: 'true', MAIL_PROVIDER: 'brevo', BREVO_API_KEY: 'private-test-key',
    MAIL_FROM: 'TourGo <billing@example.test>', ...values,
  });
  const message = Object.assign(new MailMessage(), {
    id: 'mail-id', recipient: 'customer@example.test', subject: 'Hóa đơn TourGo',
    html: '<p>Đã thanh toán</p>', text: 'Đã thanh toán', attachmentName: 'hoa-don.html',
  });
  beforeEach(() => { vi.stubGlobal('fetch', request); request.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it('sends to the stored customer address with the invoice encoded as base64', async () => {
    request.mockResolvedValue(new Response(JSON.stringify({ messageId: 'provider-id' }), { status: 201 }));
    const transport = new MailTransportService(config());
    expect(transport.enabled).toBe(true);
    await transport.send(message);
    const [url, options] = request.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options.headers['api-key']).toBe('private-test-key');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(options.body as string);
    expect(body.sender).toEqual({ email: 'billing@example.test', name: 'TourGo' });
    expect(body.to).toEqual([{ email: 'customer@example.test' }]);
    expect(Buffer.from(body.attachment[0].content, 'base64').toString('utf8')).toBe(message.html);
    expect(body.attachment[0].name).toBe('hoa-don.html');
    expect(options.body).not.toContain('private-test-key');
  });

  it('supports a plain sender and messages without attachments', async () => {
    request.mockResolvedValue(new Response(JSON.stringify({ messageId: 'provider-id' }), { status: 201 }));
    await new MailTransportService(config({ MAIL_FROM: 'billing@example.test' }))
      .send(Object.assign(new MailMessage(), message, { attachmentName: null }));
    const body = JSON.parse(request.mock.calls[0][1].body as string);
    expect(body.sender).toEqual({ email: 'billing@example.test' });
    expect(body.attachment).toBeUndefined();
  });

  it('keeps sending disabled without requiring credentials', async () => {
    const transport = new MailTransportService(config({ MAIL_ENABLED: 'false', BREVO_API_KEY: '' }));
    expect(transport.enabled).toBe(false);
    await expect(transport.send(message)).rejects.toThrow(/chưa được bật/);
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects invalid or missing configuration', () => {
    expect(() => new MailTransportService(config({ BREVO_API_KEY: '' }))).toThrow(/BREVO_API_KEY/);
    expect(() => new MailTransportService(config({ MAIL_FROM: 'not-an-email' }))).toThrow(/MAIL_FROM/);
    expect(() => new MailTransportService(config({ MAIL_FROM: 'TourGo\r\nBCC: other@example.test' }))).toThrow(/MAIL_FROM/);
    expect(() => new MailTransportService(config({ MAIL_PROVIDER: 'unknown' }))).toThrow(/MAIL_PROVIDER/);
  });

  it.each([400, 401, 429, 500])('leaves HTTP %s failures for the existing outbox retry policy', async status => {
    request.mockResolvedValue(new Response('sensitive provider response', { status }));
    await expect(new MailTransportService(config()).send(message)).rejects.toMatchObject({ code: `BREVO_HTTP_${status}` });
  });

  it('uses a safe error code for timeouts and connection failures', async () => {
    request.mockRejectedValue(new Error('private-test-key'));
    await expect(new MailTransportService(config()).send(message)).rejects.toMatchObject({ code: 'BREVO_NETWORK_ERROR' });
  });

  it.each(['{}', 'not-json'])('does not mark an unconfirmed API response as sent', async body => {
    request.mockResolvedValue(new Response(body, { status: 200 }));
    await expect(new MailTransportService(config()).send(message)).rejects.toMatchObject({ code: 'BREVO_INVALID_RESPONSE' });
  });
});