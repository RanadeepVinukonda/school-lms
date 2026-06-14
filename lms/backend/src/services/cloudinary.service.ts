import cloudinary from 'cloudinary';
import { env } from '../config/env';

cloudinary.v2.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/** Delete a file from Cloudinary by its public id. */
export async function deleteCloudinaryFile(publicId: string) {
  const result = await cloudinary.v2.uploader.destroy(publicId, { resource_type: 'raw' });
  return result;
}

/** Upload a file from a URL to Cloudinary under the given folder. */
export async function uploadFromUrl(url: string, folder = 'genesis') {
  const result = await cloudinary.v2.uploader.upload(url, { folder });
  return { url: result.secure_url, publicId: result.public_id };
}

/** Upload a file buffer to Cloudinary under the given folder. */
export async function uploadBufferToCloudinary(buffer: Buffer, folder = 'genesis') {
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream({ folder, resource_type: 'raw' }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve({ url: result!.secure_url, publicId: result!.public_id });
      }
    });
    stream.end(buffer);
  });
}


export default cloudinary;
