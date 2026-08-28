import { Router } from 'express';
import { z } from 'zod';
import { deleteUpload } from '../controllers/upload.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const deleteUploadSchema = z.object({
  url: z.string().url().min(1),
}).passthrough();

router.use(authenticate);
router.post('/delete', requireRole('teacher', 'admin'), validate(deleteUploadSchema), asyncHandler(deleteUpload));

export default router;
