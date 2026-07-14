import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as questionPaperController from '../controllers/question-paper.controller';

const router = Router();

const createPaperSchema = z.object({
  title: z.string().min(1),
  subjectId: z.string().min(1),
  questions: z.array(z.any()).optional(),
}).passthrough();

const updatePaperSchema = z.object({
  title: z.string().optional(),
  questions: z.array(z.any()).optional(),
}).passthrough();

router.post('/', authenticate, requireRole('teacher'), validate(createPaperSchema), asyncHandler(questionPaperController.createPaper));
router.get('/', authenticate, asyncHandler(questionPaperController.listPapers));
router.get('/:id', authenticate, asyncHandler(questionPaperController.getPaper));
router.put('/:id', authenticate, requireRole('teacher'), validate(updatePaperSchema), asyncHandler(questionPaperController.updatePaper));
router.delete('/:id', authenticate, requireRole('teacher'), asyncHandler(questionPaperController.deletePaper));

export default router;
