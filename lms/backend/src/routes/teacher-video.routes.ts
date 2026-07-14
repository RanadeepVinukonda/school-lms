import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as teacherVideoController from '../controllers/teacher-video.controller';

const router = Router();

const addVideoSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  subjectId: z.string().min(1),
  description: z.string().optional(),
}).passthrough();

const attachToConceptSchema = z.object({
  conceptId: z.string().min(1),
}).passthrough();

const searchAndSaveSchema = z.object({
  query: z.string().min(1),
  subjectId: z.string().min(1),
}).passthrough();

router.post('/', authenticate, requireRole('teacher'), validate(addVideoSchema), asyncHandler(teacherVideoController.addVideo));
router.get('/', authenticate, asyncHandler(teacherVideoController.listVideos));
router.delete('/:videoId', authenticate, requireRole('teacher'), asyncHandler(teacherVideoController.removeVideo));
router.put('/:videoId/attach', authenticate, requireRole('teacher'), validate(attachToConceptSchema), asyncHandler(teacherVideoController.attachToConcept));
router.post('/search-and-save', authenticate, requireRole('teacher'), validate(searchAndSaveSchema), asyncHandler(teacherVideoController.searchAndSave));

export default router;
