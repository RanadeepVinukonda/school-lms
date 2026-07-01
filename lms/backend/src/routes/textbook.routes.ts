import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import { z } from 'zod';
import * as textbookController from '../controllers/textbook.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 100 * 1024 * 1024 } });

const reprocessSchema = z.object({
  pages: z.array(z.number().positive()).optional(),
}).passthrough();

router.post('/', authenticate, requireRole('teacher', 'admin'), upload.single('file'), asyncHandler(textbookController.createTextbook));
router.get('/by-class/:classId/subject/:subjectId', authenticate, asyncHandler(textbookController.getTextbooksByClassAndSubject));
router.get('/', authenticate, requireRole('admin', 'teacher'), asyncHandler(textbookController.listTextbooks));
router.get('/:textbookId/chapters', authenticate, asyncHandler(textbookController.listChapters));
router.get('/:textbookId/chapters/:chapterId/concepts', authenticate, asyncHandler(textbookController.listConcepts));
router.get('/:textbookId', authenticate, asyncHandler(textbookController.getTextbook));
router.delete('/:textbookId', authenticate, requireRole('teacher', 'admin'), asyncHandler(textbookController.deleteTextbook));
router.post('/:textbookId/reprocess', authenticate, requireRole('teacher', 'admin'), validate(reprocessSchema), asyncHandler(textbookController.reprocessTextbook));

export default router;
