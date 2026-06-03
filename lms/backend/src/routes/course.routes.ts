import { Router } from 'express';
import * as courseController from '../controllers/course.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createCourseSchema, updateCourseSchema, courseQuerySchema } from '../validators/course.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/', authenticate, validate(courseQuerySchema, 'query'), asyncHandler(courseController.listCourses));
router.get('/:courseId', authenticate, asyncHandler(courseController.getCourse));
router.post('/', authenticate, requireRole('teacher', 'admin'), validate(createCourseSchema), asyncHandler(courseController.createCourse));
router.put('/:courseId', authenticate, requireRole('teacher', 'admin'), validate(updateCourseSchema), asyncHandler(courseController.updateCourse));
router.delete('/:courseId', authenticate, requireRole('admin'), asyncHandler(courseController.deleteCourse));
router.post('/:courseId/enroll', authenticate, requireRole('student', 'admin'), asyncHandler(courseController.enrollStudent));
router.post('/:courseId/unenroll', authenticate, asyncHandler(courseController.unenrollStudent));
router.get('/:courseId/enrollments', authenticate, requireRole('teacher', 'admin'), asyncHandler(courseController.getEnrollments));

export default router;
