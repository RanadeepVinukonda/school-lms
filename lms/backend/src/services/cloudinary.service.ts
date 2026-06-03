import cloudinary from 'cloudinary';
import { env } from '../config/env';

cloudinary.v2.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function deleteCloudinaryFile(publicId: string) {
  const result = await cloudinary.v2.uploader.destroy(publicId);
  return result;
}

export async function uploadFromUrl(url: string, folder = 'genesis') {
  const result = await cloudinary.v2.uploader.upload(url, { folder });
  return { url: result.secure_url, publicId: result.public_id };
}

export default cloudinary;
