import cloudinary from 'cloudinary';
import { env } from '../config/env';
import { cloudinaryCircuitBreaker } from '../utils/circuit-breaker';

cloudinary.v2.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/** Delete a file from Cloudinary by its public id. */
export async function deleteCloudinaryFile(publicId: string) {
  return cloudinaryCircuitBreaker.execute(async () => {
    let result = await cloudinary.v2.uploader.destroy(publicId, { resource_type: 'image' });
    if (result.result === 'not found') {
      result = await cloudinary.v2.uploader.destroy(publicId, { resource_type: 'raw' });
    }
    return result;
  });
}

/** Upload a file from a URL to Cloudinary under the given folder. */
export async function uploadFromUrl(url: string, folder = 'genesis') {
  return cloudinaryCircuitBreaker.execute(async () => {
    const result = await cloudinary.v2.uploader.upload(url, { folder });
    return { url: result.secure_url, publicId: result.public_id };
  });
}

/** Upload a file buffer to Cloudinary under the given folder. */
export async function uploadBufferToCloudinary(buffer: Buffer, folder = 'genesis') {
  return cloudinaryCircuitBreaker.execute(() =>
    new Promise<{ url: string; publicId: string }>((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream({ folder, resource_type: 'auto', access_mode: 'public' }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          if (!result) { reject(new Error('Upload returned no result')); return; }
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      });
      stream.end(buffer);
    })
  );
}

export async function getCloudinaryDownloadUrl(publicId: string): Promise<string> {
  return cloudinaryCircuitBreaker.execute(async () => {
    const resource = await cloudinary.v2.api.resource(publicId, { resource_type: 'image' })
      .catch(() => cloudinary.v2.api.resource(publicId, { resource_type: 'raw' }));
    return cloudinary.v2.utils.private_download_url(publicId, resource.format, {
      type: resource.type,
      resource_type: resource.resource_type,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      attachment: false,
    });
  });
}

export default cloudinary;
