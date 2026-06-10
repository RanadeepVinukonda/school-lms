import { Router } from 'express';
import * as textbookController from '../controllers/textbook.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/', authenticate, requireRole('teacher'), asyncHandler(textbookController.createTextbook));
router.get('/by-class/:classId/subject/:subjectId', authenticate, asyncHandler(textbookController.getTextbooksByClassAndSubject));
router.get('/:textbookId', authenticate, asyncHandler(textbookController.getTextbook));
router.delete('/:textbookId', authenticate, requireRole('teacher', 'admin'), asyncHandler(textbookController.deleteTextbook));

export default router;
