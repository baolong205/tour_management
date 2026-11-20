import { createHash } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';

/** Signed server-side REST upload; credentials never reach the web or APK. */
export async function uploadToCloudinary(buffer: Buffer, mimetype: string, publicId: string): Promise<string> {
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloud || !/^[a-zA-Z0-9_-]+$/.test(cloud) || !key || !secret) {
    throw new ServiceUnavailableException('Chưa cấu hình đầy đủ Cloudinary.');
  }
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${secret}`).digest('hex');
  const body = new FormData();
  body.set('file', new Blob([new Uint8Array(buffer)], { type: mimetype }), 'upload');
  body.set('public_id', publicId);
  body.set('timestamp', timestamp);
  body.set('api_key', key);
  body.set('signature', signature);
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, {
      method: 'POST', body, signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error('Upload rejected');
    const result = await response.json() as { secure_url?: string };
    if (!result.secure_url || new URL(result.secure_url).origin !== 'https://res.cloudinary.com') {
      throw new Error('Invalid upload response');
    }
    return result.secure_url;
  } catch {
    throw new ServiceUnavailableException('Không thể lưu tệp lên Cloudinary. Vui lòng thử lại.');
  }
}