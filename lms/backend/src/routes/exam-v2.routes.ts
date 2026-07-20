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
  textbookId: z.string().min(1),
  chapterId: z.string().min(1),
  timeLimitMinutes: z.coerce.number().positive(),
  selectedModels: z.array(z.string()).min(1),
  questionCountPerConcept: z.coerce.number().positive(),
  description: z.string().optional(),
  subjectId: z.string().optional(),
  passingScore: z.coerce.number().min(0).optional(),
  maxAttempts: z.coerce.number().positive().optional(),
  shuffleQuestions: z.boolean().optional(),
  showResults: z.boolean().optional(),
  preview: z.boolean().optional(),
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

router.post('/', authenticate, requireRole('teacher', 'admin'), (req, _res, next) => {
  console.log('EXAM_BODY', JSON.stringify(req.body).substring(0, 1000));
  try {
    req.body = createExamSchema.parse(req.body);
    next();
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      console.log('ZOD_ERR', JSON.stringify(e.errors));
      return _res.status(400).json({ success: false, error: { message: 'ZOD: ' + e.errors.map((x: any) => x.path.join('.') + ' ' + x.message).join(', '), code: 'VALIDATION', details: e.errors.map((x: any) => ({ field: x.path.join('.'), message: x.message })) } });
    }
    next(e);
  }
}, asyncHandler(examV2Controller.createExam));
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
