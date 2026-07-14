import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as questionBankController from '../controllers/question-bank.controller';

const router = Router();

const createQuestionSchema = z.object({
  question: z.string().min(1),
  type: z.string().min(1),
  subjectId: z.string().min(1),
  options: z.array(z.any()).optional(),
  answer: z.any().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'olympiad']).optional(),
}).passthrough();

const bulkCreateSchema = z.object({
  questions: z.array(z.any()).min(1),
}).passthrough();

const updateQuestionSchema = z.object({
  question: z.string().optional(),
  options: z.array(z.any()).optional(),
  answer: z.any().optional(),
}).passthrough();

router.post('/', authenticate, requireRole('teacher'), validate(createQuestionSchema), asyncHandler(questionBankController.createQuestion));
router.post('/bulk', authenticate, requireRole('teacher'), validate(bulkCreateSchema), asyncHandler(questionBankController.bulkCreate));
router.post('/import-from-concept', authenticate, requireRole('teacher'), asyncHandler(questionBankController.importFromConcept));
router.get('/', authenticate, asyncHandler(questionBankController.listQuestions));
router.get('/:id', authenticate, asyncHandler(questionBankController.getQuestion));
router.put('/:id', authenticate, requireRole('teacher'), validate(updateQuestionSchema), asyncHandler(questionBankController.updateQuestion));
router.delete('/:id', authenticate, requireRole('teacher'), asyncHandler(questionBankController.deleteQuestion));

export default router;
