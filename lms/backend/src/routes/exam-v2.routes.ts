import { Router } from 'express';
import * as examV2Controller from '../controllers/exam-v2.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/', authenticate, requireRole('teacher', 'admin'), asyncHandler(examV2Controller.createExam));
router.post('/:examId/release', authenticate, requireRole('teacher', 'admin'), asyncHandler(examV2Controller.releaseExam));
router.post('/:examId/start', authenticate, requireRole('student'), asyncHandler(examV2Controller.startAttempt));
router.post('/attempts/:attemptId/submit', authenticate, asyncHandler(examV2Controller.submitAttempt));
router.post('/attempts/:attemptId/logs', authenticate, asyncHandler(examV2Controller.logProctoringEvent));
router.get('/exams/:examId/students/:studentId/attempt', authenticate, asyncHandler(examV2Controller.getStudentAttempt));
router.get('/attempts/:attemptId/logs', authenticate, asyncHandler(examV2Controller.getProctoringLogs));
router.put('/:examId/grades', authenticate, requireRole('teacher', 'admin'), asyncHandler(examV2Controller.releaseGrades));
router.get('/:examId/results', authenticate, asyncHandler(examV2Controller.getResults));
router.get('/class/:classId', authenticate, asyncHandler(examV2Controller.listForClass));
router.get('/my', authenticate, asyncHandler(examV2Controller.listForTeacher));
router.get('/:examId', authenticate, asyncHandler(examV2Controller.getExam));

export default router;
