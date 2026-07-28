import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as educationalVideoController from '../controllers/educational-video.controller';

const router = Router();

const searchSchema = z.object({
  query: z.string().min(1),
  maxResults: z.coerce.number().int().positive().max(50).optional(),
}).passthrough();

const searchConceptSchema = z.object({
  subject: z.string().min(1),
  conceptTitle: z.string().min(1),
  maxResults: z.coerce.number().int().positive().max(50).optional(),
});

router.get('/search', authenticate, validate(searchSchema, 'query'), asyncHandler(educationalVideoController.searchVideos));
router.post('/search-concept', authenticate, validate(searchConceptSchema), asyncHandler(educationalVideoController.searchVideosForConcept));

export default router;
