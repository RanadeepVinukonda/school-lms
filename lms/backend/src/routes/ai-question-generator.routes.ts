import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/ai-question-generator.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const generateForConceptSchema = z.object({
  conceptId: z.string().min(1),
  count: z.number().positive().optional(),
  types: z.array(z.string()).optional(),
}).passthrough();

const generateAndSaveSchema = z.object({
  conceptId: z.string().min(1),
  questions: z.array(z.any()).optional(),
}).passthrough();

const generateFromTextbookSchema = z.object({
  textbookId: z.string().min(1),
  chapterId: z.string().min(1),
  count: z.number().positive().optional(),
}).passthrough();

const fillMissingTypesSchema = z.object({
  conceptId: z.string().min(1),
}).passthrough();

router.post('/generate', authenticate, requireRole('teacher', 'admin'), validate(generateForConceptSchema), asyncHandler(ctrl.generateForConcept));
router.post('/generate-and-save', authenticate, requireRole('teacher', 'admin'), validate(generateAndSaveSchema), asyncHandler(ctrl.generateAndSave));
router.post('/from-textbook', authenticate, requireRole('teacher', 'admin'), validate(generateFromTextbookSchema), asyncHandler(ctrl.generateFromTextbook));
router.post('/fill-missing', authenticate, requireRole('teacher', 'admin'), validate(fillMissingTypesSchema), asyncHandler(ctrl.fillMissingTypes));

export default router;
