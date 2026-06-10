import { Router } from 'express';
import * as quizController from '../controllers/quiz.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createQuizSchema, updateQuizSchema, submitAttemptSchema } from '../validators/quiz.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/', authenticate, asyncHandler(quizController.listAllQuizzes));
router.post('/', authenticate, requireRole('teacher', 'admin'), validate(createQuizSchema), asyncHandler(quizController.createQuiz));
router.put('/:quizId', authenticate, requireRole('teacher', 'admin'), validate(updateQuizSchema), asyncHandler(quizController.updateQuiz));
router.delete('/:quizId', authenticate, requireRole('teacher', 'admin'), asyncHandler(quizController.deleteQuiz));
router.get('/:quizId', authenticate, asyncHandler(quizController.getQuiz));
router.post('/:quizId/start', authenticate, requireRole('student'), asyncHandler(quizController.startAttempt));
router.post('/:quizId/attempts/:attemptId/submit', authenticate, validate(submitAttemptSchema), asyncHandler(quizController.submitAttempt));
router.get('/:quizId/results', authenticate, asyncHandler(quizController.getResults));
router.patch('/:quizId/release-grades', authenticate, requireRole('teacher', 'admin'), asyncHandler(quizController.releaseGrades));

export default router;
