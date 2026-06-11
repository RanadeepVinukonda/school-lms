import { Router } from 'express';
import * as textbookController from '../controllers/textbook.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/', authenticate, requireRole('teacher'), asyncHandler(textbookController.createTextbook));
router.get('/by-class/:classId/subject/:subjectId', authenticate, asyncHandler(textbookController.getTextbooksByClassAndSubject));
router.get('/', authenticate, asyncHandler(textbookController.listTextbooks));
router.get('/:textbookId/chapters', authenticate, asyncHandler(textbookController.listChapters));
router.get('/:textbookId/chapters/:chapterId/concepts', authenticate, asyncHandler(textbookController.listConcepts));
router.get('/:textbookId', authenticate, asyncHandler(textbookController.getTextbook));
router.delete('/:textbookId', authenticate, requireRole('teacher', 'admin'), asyncHandler(textbookController.deleteTextbook));

export default router;
