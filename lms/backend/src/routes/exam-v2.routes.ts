import { Router } from 'express';
import { z } from 'zod';
import * as examV2Controller from '../controllers/exam-v2.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const createExamSchema = z.object({
  title: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  duration: z.number().positive(),
  totalMarks: z.number().positive().optional(),
}).passthrough();

const releaseExamSchema = z.object({
  scheduledDate: z.string().optional(),
}).passthrough();

const startAttemptSchema = z.object({}).passthrough();

const submitAttemptSchema = z.object({
  answers: z.any(),
}).passthrough();

const logProctoringSchema = z.object({
  event: z.string().min(1),
  details: z.any().optional(),
}).passthrough();

const releaseGradesSchema = z.object({
  grades: z.record(z.number().min(0)),
}).passthrough();

router.post('/', authenticate, requireRole('teacher', 'admin'), validate(createExamSchema), asyncHandler(examV2Controller.createExam));
router.post('/:examId/release', authenticate, requireRole('teacher', 'admin'), validate(releaseExamSchema), asyncHandler(examV2Controller.releaseExam));
router.post('/:examId/start', authenticate, requireRole('student'), validate(startAttemptSchema), asyncHandler(examV2Controller.startAttempt));
router.post('/attempts/:attemptId/submit', authenticate, validate(submitAttemptSchema), asyncHandler(examV2Controller.submitAttempt));
router.post('/attempts/:attemptId/logs', authenticate, validate(logProctoringSchema), asyncHandler(examV2Controller.logProctoringEvent));
router.get('/exams/:examId/students/:studentId/attempt', authenticate, asyncHandler(examV2Controller.getStudentAttempt));
router.get('/attempts/:attemptId/logs', authenticate, asyncHandler(examV2Controller.getProctoringLogs));
router.put('/:examId/grades', authenticate, requireRole('teacher', 'admin'), validate(releaseGradesSchema), asyncHandler(examV2Controller.releaseGrades));
router.get('/:examId/results', authenticate, asyncHandler(examV2Controller.getResults));
router.get('/class/:classId', authenticate, asyncHandler(examV2Controller.listForClass));
router.get('/my', authenticate, asyncHandler(examV2Controller.listForTeacher));
router.get('/:examId', authenticate, asyncHandler(examV2Controller.getExam));

export default router;
