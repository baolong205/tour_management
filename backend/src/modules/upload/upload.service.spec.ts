import { UploadService } from './upload.service.js';
import { uploadToCloudinary } from './cloudinary-storage.js';

vi.mock('./cloudinary-storage.js', () => ({ uploadToCloudinary: vi.fn() }));

describe('cloud upload integration', () => {
  const service = new UploadService();
  const file = { fieldname: 'file', originalname: 'photo.png', mimetype: 'image/png', size: 8, buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) };
  beforeEach(() => { vi.stubEnv('UPLOAD_PROVIDER', 'cloudinary'); vi.clearAllMocks(); });
  afterEach(() => vi.unstubAllEnvs());

  it('returns an absolute path compatible with existing web and mobile clients', async () => {
    vi.mocked(uploadToCloudinary).mockResolvedValue('https://res.cloudinary.com/test/image/upload/photo.png');
    const result = await service.save(file, 'receipts');
    expect(result.path).toBe(result.url);
    expect(result.path).toMatch(/^https:/);
    expect(uploadToCloudinary).toHaveBeenCalledWith(file.buffer, 'image/png', expect.stringMatching(/^tourgo\/receipts\//));
  });

  it('validates signatures before contacting cloud storage', async () => {
    await expect(service.save({ ...file, buffer: Buffer.alloc(8) }, 'tours')).rejects.toThrow(/Nội dung/);
    expect(uploadToCloudinary).not.toHaveBeenCalled();
  });

  it('rejects directory traversal before writing a file', async () => {
    await expect(service.save(file, '../outside')).rejects.toThrow(/Thư mục/);
    expect(uploadToCloudinary).not.toHaveBeenCalled();
  });
});