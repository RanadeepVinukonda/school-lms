import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import * as teacherVideoController from '../controllers/teacher-video.controller';

const router = Router();

router.post('/', authenticate, requireRole('teacher'), asyncHandler(teacherVideoController.addVideo));
router.get('/', authenticate, asyncHandler(teacherVideoController.listVideos));
router.delete('/:videoId', authenticate, requireRole('teacher'), asyncHandler(teacherVideoController.removeVideo));
router.put('/:videoId/attach', authenticate, requireRole('teacher'), asyncHandler(teacherVideoController.attachToConcept));
router.post('/search-and-save', authenticate, requireRole('teacher'), asyncHandler(teacherVideoController.searchAndSave));

export default router;
