import { createHash } from 'node:crypto';
import { uploadToCloudinary } from './cloudinary-storage.js';

describe('Cloudinary storage', () => {
  const request = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', request);
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'tourgo-test');
    vi.stubEnv('CLOUDINARY_API_KEY', 'test-key');
    vi.stubEnv('CLOUDINARY_API_SECRET', 'test-secret');
    request.mockReset();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('signs parameters on the server and returns HTTPS delivery URL', async () => {
    request.mockResolvedValue({ ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/tourgo-test/image/upload/photo.jpg' }) });
    await expect(uploadToCloudinary(Buffer.from('image'), 'image/jpeg', 'tourgo/tours/photo'))
      .resolves.toBe('https://res.cloudinary.com/tourgo-test/image/upload/photo.jpg');
    const [url, options] = request.mock.calls[0];
    expect(url).toBe('https://api.cloudinary.com/v1_1/tourgo-test/auto/upload');
    const form = options.body as FormData;
    const timestamp = form.get('timestamp');
    if (typeof timestamp !== 'string') throw new Error('Missing timestamp');
    const expected = createHash('sha1').update(`public_id=tourgo/tours/photo&timestamp=${timestamp}test-secret`).digest('hex');
    expect(form.get('signature')).toBe(expected);
    expect(form.get('api_secret')).toBeNull();
  });

  it('rejects missing credentials without sending a request', async () => {
    vi.stubEnv('CLOUDINARY_API_SECRET', '');
    await expect(uploadToCloudinary(Buffer.from('image'), 'image/jpeg', 'photo')).rejects.toThrow(/cấu hình/);
    expect(request).not.toHaveBeenCalled();
  });

  it('does not expose provider errors or credentials', async () => {
    request.mockResolvedValue({ ok: false });
    await expect(uploadToCloudinary(Buffer.from('image'), 'image/jpeg', 'photo')).rejects.toThrow(/Không thể lưu/);
  });

  it('rejects unexpected delivery origins', async () => {
    request.mockResolvedValue({ ok: true, json: async () => ({ secure_url: 'https://example.test/file' }) });
    await expect(uploadToCloudinary(Buffer.from('image'), 'image/jpeg', 'photo')).rejects.toThrow(/Không thể lưu/);
  });
});