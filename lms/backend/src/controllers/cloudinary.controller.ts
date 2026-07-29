import { Request, Response } from 'express';
import cloudinary from 'cloudinary';
import { sendSuccess, sendError } from '../utils/response';
import { env } from '../config/env';

export async function getUploadSignature(req: Request, res: Response) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = (req.query.folder as string) || 'textbooks';

  const allowedFolders = ['textbooks', 'avatars', 'assignments', 'textbook-covers'];
  if (!allowedFolders.includes(folder)) {
    sendError(res, 'Invalid upload folder', 400);
    return;
  }

  const params: Record<string, string | number> = {
    timestamp,
    folder,
    access_mode: 'public',
  };

  const signature = cloudinary.v2.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET);

  sendSuccess(res, {
    signature,
    timestamp,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder,
  });
}
