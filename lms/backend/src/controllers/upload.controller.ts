import { Request, Response } from 'express';
import * as uploadService from '../services/upload.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function uploadFile(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ success: false, error: { message: 'No file provided' } });
    return;
  }
  const folder = (req.body.folder as string) || 'documents';
  const result = await uploadService.uploadFileService(req.file, folder, req.user!.uid);
  sendCreated(res, result, 'File uploaded');
}

export async function getFileUrl(req: Request, res: Response) {
  const result = await uploadService.getFileUrlService(req.params.fileId);
  sendSuccess(res, result);
}

export async function deleteFile(req: Request, res: Response) {
  await uploadService.deleteFileService(req.params.fileId);
  sendSuccess(res, null, 'File deleted');
}

export async function getAllowedTypes(_req: Request, res: Response) {
  const result = uploadService.getAllowedMimeTypes();
  sendSuccess(res, result);
}
