import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { deleteUpload, uploadAvatar } from '../controllers/upload.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const deleteUploadSchema = z.object({
  url: z.string().url().min(1),
}).passthrough();

router.use(authenticate);
router.post('/avatar', avatarUpload.single('file'), asyncHandler(uploadAvatar));
router.post('/delete', requireRole('teacher', 'admin'), validate(deleteUploadSchema), asyncHandler(deleteUpload));

export default router;
