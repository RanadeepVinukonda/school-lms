import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as youtubeController from '../controllers/youtube.controller';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1),
  maxResults: z.coerce.number().int().positive().max(50).optional(),
}).passthrough();

const searchConceptSchema = z.object({
  subject: z.string().min(1),
  chapterTitle: z.string().min(1),
  conceptTitle: z.string().min(1),
});

router.get('/search', authenticate, validate(searchQuerySchema, 'query'), asyncHandler(youtubeController.search));
router.post('/search-concept', authenticate, validate(searchConceptSchema), asyncHandler(youtubeController.searchForConcept));

export default router;
