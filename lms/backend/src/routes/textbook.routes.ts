import { Router } from 'express';
import multer from 'multer';
import * as textbookController from '../controllers/textbook.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authenticate, requireRole('teacher'), upload.single('file'), asyncHandler(textbookController.createTextbook));
router.get('/by-class/:classId/subject/:subjectId', authenticate, asyncHandler(textbookController.getTextbooksByClassAndSubject));
router.get('/', authenticate, asyncHandler(textbookController.listTextbooks));
router.get('/:textbookId/chapters', authenticate, asyncHandler(textbookController.listChapters));
router.get('/:textbookId/chapters/:chapterId/concepts', authenticate, asyncHandler(textbookController.listConcepts));
router.get('/:textbookId', authenticate, asyncHandler(textbookController.getTextbook));
router.delete('/:textbookId', authenticate, requireRole('teacher', 'admin'), asyncHandler(textbookController.deleteTextbook));
router.post('/:textbookId/reprocess', authenticate, requireRole('teacher'), asyncHandler(textbookController.reprocessTextbook));

export default router;
