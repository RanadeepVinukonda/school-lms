import { Request, Response } from 'express';
import { deleteCloudinaryFile } from '../services/cloudinary.service';
import { getSupabaseAdmin } from '../services/supabase';
import { validateFileType, validateFileSize } from '../services/upload.service';
import { sendSuccess, sendError } from '../utils/response';

export async function deleteUpload(req: Request, res: Response) {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return sendError(res, 'publicId is required', 400);
    }
    const result = await deleteCloudinaryFile(publicId);
    return sendSuccess(res, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete file';
    return sendError(res, message);
  }
}

/**
 * Upload a profile photo into the public 'avatars' storage bucket using the
 * service-role client, which bypasses the anon RLS policy that blocks direct
 * browser uploads. Returns the public URL for saving on the user's profile.
 */
export async function uploadAvatar(req: Request, res: Response) {
  if (!req.file) {
    return sendError(res, 'No file uploaded', 400);
  }
  try {
    validateFileType(req.file.mimetype, 'image');
    validateFileSize(req.file.size);
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Invalid file', 400);
  }

  const userId = req.user?.uid || 'anon';
  const ext = (req.file.originalname.split('.').pop() || 'png').toLowerCase();
  const filePath = `${userId}_${Date.now()}.${ext}`;

  const supabase = getSupabaseAdmin();
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    return sendError(res, `Upload failed: ${uploadError.message}`, 500);
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return sendSuccess(res, { url: data.publicUrl });
}
