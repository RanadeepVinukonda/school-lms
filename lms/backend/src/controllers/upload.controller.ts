import { Request, Response } from 'express';
import { deleteCloudinaryFile } from '../services/cloudinary.service';
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
    return sendError(res, 'Failed to delete file');
  }
}
