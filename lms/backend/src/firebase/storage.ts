import { getAdminStorage } from './admin';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

const bucket = getAdminStorage().bucket(env.FIREBASE_PROJECT_ID + '.appspot.com');

export async function uploadFile(
  file: Express.Multer.File,
  path: string
): Promise<{ url: string; path: string; name: string }> {
  const fileName = `${path}/${uuidv4()}-${file.originalname}`;
  const blob = bucket.file(fileName);
  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
      },
    },
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (error) => {
      reject(error);
    });

    blobStream.on('finish', async () => {
      await blob.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve({
        url: publicUrl,
        path: blob.name,
        name: file.originalname,
      });
    });

    blobStream.end(file.buffer);
  });
}

export async function deleteFile(filePath: string): Promise<void> {
  const file = bucket.file(filePath);
  const [exists] = await file.exists();
  if (exists) {
    await file.delete();
  }
}

export async function getFileUrl(filePath: string): Promise<string> {
  const file = bucket.file(filePath);
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error('File not found');
  }
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return url;
}

export function getBucket() {
  return bucket;
}
