import { Router } from 'express';
import { z } from 'zod';
import * as tcsController from '../controllers/teacher-class-subject.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const assignTeacherSchema = z.object({
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
}).passthrough();

const setupTeacherSchema = z.object({
  classIds: z.array(z.string().min(1)).min(1),
  subjectIds: z.array(z.string().min(1)).min(1),
}).passthrough();

router.post('/assign', authenticate, requireRole('admin'), validate(assignTeacherSchema), asyncHandler(tcsController.assignTeacher));
router.post('/setup', authenticate, requireRole('teacher'), validate(setupTeacherSchema), asyncHandler(tcsController.setupTeacher));
router.get('/my', authenticate, requireRole('teacher'), asyncHandler(tcsController.getMyAssignments));
router.get('/my/class/:classId', authenticate, requireRole('teacher'), asyncHandler(tcsController.getAssignmentForClass));
router.get('/unassigned/:classId', authenticate, requireRole('admin', 'teacher'), asyncHandler(tcsController.getUnassignedSubjects));
router.get('/all', authenticate, requireRole('admin'), asyncHandler(tcsController.getAllAssignments));
router.delete('/:assignmentId', authenticate, requireRole('admin'), asyncHandler(tcsController.removeAssignment));

export default router;
