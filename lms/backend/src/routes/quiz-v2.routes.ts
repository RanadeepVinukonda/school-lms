import { Router } from 'express';
import { z } from 'zod';
import * as quizV2Controller from '../controllers/quiz-v2.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const createQuizSchema = z.object({
  title: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  questions: z.array(z.any()).optional(),
}).passthrough();

const updateQuizSchema = z.object({
  title: z.string().optional(),
}).passthrough();

const releaseQuizSchema = z.object({
  scheduledDate: z.string().optional(),
}).passthrough();

const republishQuizSchema = z.object({}).passthrough();

const startAttemptSchema = z.object({}).passthrough();

const submitAttemptSchema = z.object({
  answers: z.any(),
}).passthrough();

const releaseGradesSchema = z.object({
  grades: z.record(z.number().min(0)),
}).passthrough();

router.post('/', authenticate, requireRole('teacher', 'admin'), validate(createQuizSchema), asyncHandler(quizV2Controller.createQuiz));
router.patch('/:quizId', authenticate, requireRole('teacher', 'admin'), validate(updateQuizSchema), asyncHandler(quizV2Controller.updateQuiz));
router.post('/:quizId/release', authenticate, requireRole('teacher', 'admin'), validate(releaseQuizSchema), asyncHandler(quizV2Controller.releaseQuiz));
router.post('/:quizId/republish', authenticate, requireRole('teacher', 'admin'), validate(republishQuizSchema), asyncHandler(quizV2Controller.republishQuiz));
router.delete('/:quizId', authenticate, requireRole('teacher', 'admin'), asyncHandler(quizV2Controller.deleteQuiz));
router.post('/:quizId/start', authenticate, requireRole('student'), validate(startAttemptSchema), asyncHandler(quizV2Controller.startAttempt));
router.get('/attempts/my', authenticate, asyncHandler(quizV2Controller.getMyAttempts));
router.post('/attempts/:attemptId/submit', authenticate, validate(submitAttemptSchema), asyncHandler(quizV2Controller.submitAttempt));
router.put('/:quizId/grades', authenticate, requireRole('teacher', 'admin'), validate(releaseGradesSchema), asyncHandler(quizV2Controller.releaseGrades));
router.get('/:quizId/results', authenticate, asyncHandler(quizV2Controller.getResults));
router.get('/class/:classId', authenticate, asyncHandler(quizV2Controller.listForClass));
router.get('/my', authenticate, asyncHandler(quizV2Controller.listForTeacher));
router.get('/:quizId', authenticate, asyncHandler(quizV2Controller.getQuizById));
router.get('/concept/:conceptId', authenticate, asyncHandler(quizV2Controller.getQuizByConcept));
router.get('/', authenticate, asyncHandler(quizV2Controller.listForTeacher));

export default router;
