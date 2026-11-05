import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as classroomService from '../services/classroom.service';

const router = Router();

router.get('/courses', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    accessToken: z.string().min(1, 'Google Access Token is required')
  }), 'query'),
  asyncHandler(async (req, res) => {
    const list = await classroomService.getCourses(req.query.accessToken as string);
    sendSuccess(res, list);
  })
);

router.post('/sync-roster', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    classroomCourseId: z.string().min(1),
    targetClassId: z.string().uuid(),
    accessToken: z.string().min(1)
  })),
  asyncHandler(async (req, res) => {
    const { classroomCourseId, targetClassId, accessToken } = req.body;
    const result = await classroomService.syncRoster(req.user!.school_id || '', accessToken, classroomCourseId, targetClassId);
    sendSuccess(res, result);
  })
);

router.post('/push-grade', authenticate, requireRole('admin', 'super_admin', 'teacher'),
  validate(z.object({
    classroomCourseId: z.string().min(1),
    courseWorkId: z.string().min(1),
    studentEmail: z.string().email(),
    grade: z.number().nonnegative(),
    accessToken: z.string().min(1)
  })),
  asyncHandler(async (req, res) => {
    const { classroomCourseId, courseWorkId, studentEmail, grade, accessToken } = req.body;
    const result = await classroomService.pushGrade(accessToken, classroomCourseId, courseWorkId, studentEmail, grade);
    sendSuccess(res, result);
  })
);

export default router;
