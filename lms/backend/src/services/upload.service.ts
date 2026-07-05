import { v4 as uuidv4 } from 'uuid';
import { uploadBufferToCloudinary, deleteCloudinaryFile } from './cloudinary.service';
import { getSupabaseAdmin } from './supabase';
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

export async function uploadFileService(
  file: Express.Multer.File,
  folder: string,
  userId: string
) {
  validateFileType(file.mimetype, folder);
  validateFileSize(file.size);

  const result = await uploadBufferToCloudinary(file.buffer, `${folder}/${userId}`);

  const fileRecord = {
    id: uuidv4(),
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: result.url,
    path: result.publicId,
    folder,
    uploadedBy: userId,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseAdmin()!;
  await supabase.from('nosql_docs').insert({
    collection: 'uploads', doc_id: fileRecord.id, data: fileRecord,
    updated_at: new Date().toISOString(),
  });

  logger.info('File uploaded to Cloudinary', { fileId: fileRecord.id, folder, userId });

  return fileRecord;
}

export async function getFileUrlService(fileId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data } = await supabase.from('nosql_docs').select('data')
    .eq('collection', 'uploads').eq('doc_id', fileId).maybeSingle();
  if (!data) {
    throw new NotFoundError('File not found');
  }
  return data.data as Record<string, unknown>;
}

export async function deleteFileService(fileId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data } = await supabase.from('nosql_docs').select('data')
    .eq('collection', 'uploads').eq('doc_id', fileId).maybeSingle();
  if (!data) {
    throw new NotFoundError('File not found');
  }

  const fileData = data.data as Record<string, unknown>;
  if (fileData.path) {
    await deleteCloudinaryFile(fileData.path as string);
  }
  await supabase.from('nosql_docs').delete()
    .eq('collection', 'uploads').eq('doc_id', fileId);

  logger.info('File deleted from Cloudinary', { fileId });
}

export function validateFileType(mimeType: string, folder: string): boolean {
  const allowedTypes = ALLOWED_MIME_TYPES[folder] || ALLOWED_MIME_TYPES.document;
  if (!allowedTypes.includes(mimeType)) {
    throw new ValidationError(
      `Invalid file type '${mimeType}'. Allowed types: ${allowedTypes.join(', ')}`
    );
  }
  return true;
}

export function validateFileSize(size: number): boolean {
  if (size > MAX_FILE_SIZE) {
    throw new ValidationError(
      `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }
  return true;
}

export function getAllowedMimeTypes() {
  return ALLOWED_MIME_TYPES;
}
