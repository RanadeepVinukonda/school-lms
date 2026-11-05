import { Router } from 'express';
import { z } from 'zod';
import * as prePrimaryController from '../controllers/pre-primary.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();
router.use(authenticate);

const saveTracingSchema = z.object({
  studentId: z.string().min(1),
  letter: z.string().length(1),
  strokes: z.any(),
}).passthrough();

const updateProgressSchema = z.object({
  activityId: z.string().min(1),
  completed: z.boolean(),
  score: z.number().min(0).max(100).optional(),
}).passthrough();

router.get('/dashboard/:studentId', asyncHandler(prePrimaryController.getDashboard));
router.get('/lessons', asyncHandler(prePrimaryController.getLessons));
router.get('/flashcards/:subjectId', asyncHandler(prePrimaryController.getFlashcards));
router.post('/tracing/save', validate(saveTracingSchema), asyncHandler(prePrimaryController.saveTracing));
router.get('/stories', asyncHandler(prePrimaryController.getStories));
router.post('/progress/:studentId', validate(updateProgressSchema), asyncHandler(prePrimaryController.updateProgress));

export default router;
