import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import * as questionPaperController from '../controllers/question-paper.controller';

const router = Router();

router.post('/', authenticate, requireRole('teacher'), asyncHandler(questionPaperController.createPaper));
router.get('/', authenticate, asyncHandler(questionPaperController.listPapers));
router.get('/:id', authenticate, asyncHandler(questionPaperController.getPaper));
router.put('/:id', authenticate, requireRole('teacher'), asyncHandler(questionPaperController.updatePaper));
router.delete('/:id', authenticate, requireRole('teacher'), asyncHandler(questionPaperController.deletePaper));

export default router;
