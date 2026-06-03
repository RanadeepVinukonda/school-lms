import { Router } from 'express';
import multer from 'multer';
import * as uploadController from '../controllers/upload.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadRateLimit } from '../middlewares/rateLimit.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = Router();

router.post('/', authenticate, uploadRateLimit, upload.single('file'), asyncHandler(uploadController.uploadFile));
router.get('/types', authenticate, asyncHandler(uploadController.getAllowedTypes));
router.get('/:fileId', authenticate, asyncHandler(uploadController.getFileUrl));
router.delete('/:fileId', authenticate, asyncHandler(uploadController.deleteFile));

export default router;
