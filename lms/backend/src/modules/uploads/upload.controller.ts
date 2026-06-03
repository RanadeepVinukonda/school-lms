import * as uploadService from '../../services/upload.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { ValidationError } from '../../utils/errors';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const uploadFile = asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) throw new ValidationError('No file provided');
  const result = await uploadService.uploadFile(req.file, req.user!.id, req.body);
  sendCreated(res, 'File uploaded', result);
});

export const uploadMultiple = asyncHandler(async (req: AuthRequest, res) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    throw new ValidationError('No files provided');
  }
  const results = await Promise.all(
    (req.files as Express.Multer.File[]).map((file) =>
      uploadService.uploadFile(file, req.user!.id, req.body),
    ),
  );
  sendCreated(res, 'Files uploaded', { files: results });
});

export const getFileUrl = asyncHandler(async (req, res) => {
  const url = await uploadService.getFileUrl(req.params.id);
  sendSuccess(res, 'File URL retrieved', { url });
});

export const deleteFile = asyncHandler(async (req, res) => {
  await uploadService.deleteFile(req.params.id);
  sendSuccess(res, 'File deleted');
});

export const getAllowedMimeTypes = asyncHandler(async (req, res) => {
  const types = uploadService.getAllowedMimeTypes();
  sendSuccess(res, 'Allowed MIME types', { mimeTypes: types });
});
