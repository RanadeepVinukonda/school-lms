import { Router } from 'express';
import { z } from 'zod';
import * as assignmentV2Controller from '../controllers/assignment-v2.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const createAssignmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  dueDate: z.string().min(1),
  maxScore: z.number().positive().optional(),
}).passthrough();

const releaseAssignmentSchema = z.object({
  scheduledDate: z.string().optional(),
}).passthrough();

const startAssignmentSchema = z.object({}).passthrough();

const submitAssignmentSchema = z.object({
  answers: z.any(),
}).passthrough();

const releaseGradesSchema = z.object({
  grades: z.record(z.number().min(0)),
}).passthrough();

router.post('/', authenticate, requireRole('teacher', 'admin'), validate(createAssignmentSchema), asyncHandler(assignmentV2Controller.createAssignment));
router.get('/', authenticate, asyncHandler(assignmentV2Controller.listForTeacher));
router.get('/my', authenticate, requireRole('teacher', 'admin'), asyncHandler(assignmentV2Controller.listForTeacher));
router.get('/class/:classId', authenticate, asyncHandler(assignmentV2Controller.listForClass));
router.get('/:assignmentId', authenticate, asyncHandler(assignmentV2Controller.getAssignmentById));
router.post('/:assignmentId/release', authenticate, requireRole('teacher', 'admin'), validate(releaseAssignmentSchema), asyncHandler(assignmentV2Controller.releaseAssignment));
router.post('/:assignmentId/start', authenticate, requireRole('student'), validate(startAssignmentSchema), asyncHandler(assignmentV2Controller.startAssignment));
router.post('/attempts/:attemptId/submit', authenticate, validate(submitAssignmentSchema), asyncHandler(assignmentV2Controller.submitAssignment));
router.put('/:assignmentId/grades', authenticate, requireRole('teacher', 'admin'), validate(releaseGradesSchema), asyncHandler(assignmentV2Controller.releaseGrades));
router.get('/:assignmentId/results', authenticate, asyncHandler(assignmentV2Controller.getResults));

export default router;
