import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as testTemplateController from '../controllers/test-template.controller';

const router = Router();

const createTemplateSchema = z.object({
  title: z.string().min(1),
  subjectId: z.string().min(1),
  sections: z.array(z.any()).optional(),
}).passthrough();

const updateTemplateSchema = z.object({
  title: z.string().optional(),
  sections: z.array(z.any()).optional(),
}).passthrough();

const compilePaperSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  questionCount: z.number().positive().optional(),
}).passthrough();

router.post('/', authenticate, requireRole('teacher'), validate(createTemplateSchema), asyncHandler(testTemplateController.createTemplate));
router.get('/', authenticate, asyncHandler(testTemplateController.listTemplates));
router.get('/:id', authenticate, asyncHandler(testTemplateController.getTemplate));
router.put('/:id', authenticate, requireRole('teacher'), validate(updateTemplateSchema), asyncHandler(testTemplateController.updateTemplate));
router.delete('/:id', authenticate, requireRole('teacher'), asyncHandler(testTemplateController.deleteTemplate));
router.post('/:id/compile', authenticate, requireRole('teacher'), validate(compilePaperSchema), asyncHandler(testTemplateController.compilePaper));

export default router;
