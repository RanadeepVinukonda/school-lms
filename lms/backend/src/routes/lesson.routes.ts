import { Router } from 'express';
import * as lessonController from '../controllers/lesson.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createLessonSchema, updateLessonSchema } from '../validators/lesson.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/course/:courseId', authenticate, asyncHandler(lessonController.listLessonsByCourse));
router.get('/:lessonId', authenticate, asyncHandler(lessonController.getLesson));
router.post('/', authenticate, requireRole('teacher', 'admin'), validate(createLessonSchema), asyncHandler(lessonController.createLesson));
router.put('/:lessonId', authenticate, requireRole('teacher', 'admin'), validate(updateLessonSchema), asyncHandler(lessonController.updateLesson));
router.delete('/:lessonId', authenticate, requireRole('teacher', 'admin'), asyncHandler(lessonController.deleteLesson));
router.put('/reorder', authenticate, requireRole('teacher', 'admin'), asyncHandler(lessonController.reorderLessons));
router.post('/:lessonId/complete', authenticate, asyncHandler(lessonController.markLessonComplete));

export default router;
