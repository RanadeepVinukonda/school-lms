import { v4 as uuidv4 } from 'uuid';
import { uploadFile, deleteFile, getFileUrl } from '../firebase/storage';
import { collections } from '../firebase/firestore';
import { ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  archive: ['application/zip', 'application/x-rar-compressed', 'application/gzip'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Upload a file to Firebase Storage, validate type and size, and store a Firestore record. */
export async function uploadFileService(
  file: Express.Multer.File,
  folder: string,
  userId: string
) {
  validateFileType(file.mimetype, folder);
  validateFileSize(file.size);

  const uploadPath = `${folder}/${userId}`;
  const result = await uploadFile(file, uploadPath);

  const fileRecord = {
    id: uuidv4(),
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: result.url,
    path: result.path,
    folder,
    uploadedBy: userId,
    createdAt: new Date().toISOString(),
  };

  await collections.uploads().doc(fileRecord.id).set(fileRecord);

  logger.info('File uploaded', { fileId: fileRecord.id, folder, userId });

  return fileRecord;
}

/** Get a signed URL for a file by its Firestore record id. */
export async function getFileUrlService(fileId: string) {
  const doc = await collections.uploads().doc(fileId).get();
  if (!doc.exists) {
    throw new NotFoundError('File not found');
  }

  const data = doc.data()!;
  const signedUrl = await getFileUrl(data.path);

  return { ...data, signedUrl };
}

/** Delete a file from both Firebase Storage and its Firestore record. */
export async function deleteFileService(fileId: string) {
  const doc = await collections.uploads().doc(fileId).get();
  if (!doc.exists) {
    throw new NotFoundError('File not found');
  }

  const data = doc.data()!;
  await deleteFile(data.path);
  await collections.uploads().doc(fileId).delete();

  logger.info('File deleted', { fileId });
}

/** Validate that a file's MIME type is allowed for the given folder category. Throws ValidationError if not. */
export function validateFileType(mimeType: string, folder: string): boolean {
  const allowedTypes = ALLOWED_MIME_TYPES[folder] || ALLOWED_MIME_TYPES.document;
  if (!allowedTypes.includes(mimeType)) {
    throw new ValidationError(
      `Invalid file type '${mimeType}'. Allowed types: ${allowedTypes.join(', ')}`
    );
  }
  return true;
}

/** Validate that a file's size does not exceed the 50 MB limit. Throws ValidationError if it does. */
export function validateFileSize(size: number): boolean {
  if (size > MAX_FILE_SIZE) {
    throw new ValidationError(
      `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }
  return true;
}

/** Get the map of all allowed MIME types per folder category. */
export function getAllowedMimeTypes() {
  return ALLOWED_MIME_TYPES;
}
