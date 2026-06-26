import { Router } from 'express';
import * as quizV2Controller from '../controllers/quiz-v2.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/', authenticate, requireRole('teacher', 'admin'), asyncHandler(quizV2Controller.createQuiz));
router.patch('/:quizId', authenticate, requireRole('teacher', 'admin'), asyncHandler(quizV2Controller.updateQuiz));
router.post('/:quizId/release', authenticate, requireRole('teacher', 'admin'), asyncHandler(quizV2Controller.releaseQuiz));
router.post('/:quizId/republish', authenticate, requireRole('teacher', 'admin'), asyncHandler(quizV2Controller.republishQuiz));
router.delete('/:quizId', authenticate, requireRole('teacher', 'admin'), asyncHandler(quizV2Controller.deleteQuiz));
router.post('/:quizId/start', authenticate, requireRole('student'), asyncHandler(quizV2Controller.startAttempt));
router.post('/attempts/:attemptId/submit', authenticate, asyncHandler(quizV2Controller.submitAttempt));
router.put('/:quizId/grades', authenticate, requireRole('teacher', 'admin'), asyncHandler(quizV2Controller.releaseGrades));
router.get('/:quizId/results', authenticate, asyncHandler(quizV2Controller.getResults));
router.get('/class/:classId', authenticate, asyncHandler(quizV2Controller.listForClass));
router.get('/my', authenticate, asyncHandler(quizV2Controller.listForTeacher));
// Get a single quiz by ID
router.get('/:quizId', authenticate, asyncHandler(quizV2Controller.getQuizById));
router.get('/concept/:conceptId', authenticate, asyncHandler(quizV2Controller.getQuizByConcept));
// List all quizzes for the authenticated user (same as /my but at root)
router.get('/', authenticate, asyncHandler(quizV2Controller.listForTeacher));

export default router;
