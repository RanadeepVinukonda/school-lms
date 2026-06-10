import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';
import * as youtubeController from '../controllers/youtube.controller';

const router = Router();

const searchConceptSchema = z.object({
  subject: z.string().min(1),
  chapterTitle: z.string().min(1),
  conceptTitle: z.string().min(1),
});

router.get('/search', authenticate, asyncHandler(youtubeController.search));
router.post('/search-concept', authenticate, validate(searchConceptSchema), asyncHandler(youtubeController.searchForConcept));

export default router;
