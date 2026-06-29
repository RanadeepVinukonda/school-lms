import { Router } from 'express';
import * as ctrl from '../controllers/unified-test-engine.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/create', authenticate, requireRole('teacher', 'admin'), asyncHandler(ctrl.createTest));
router.post('/preview', authenticate, requireRole('teacher', 'admin'), asyncHandler(ctrl.previewTest));
router.get('/class/:classId', authenticate, asyncHandler(ctrl.listTestsForClass));
router.get('/my', authenticate, requireRole('teacher'), asyncHandler(ctrl.listTestsForTeacher));
router.get('/attempts/my', authenticate, requireRole('student'), asyncHandler(ctrl.getStudentAttempts));
router.get('/attempts/student/:studentId', authenticate, requireRole('teacher', 'admin'), asyncHandler(ctrl.getStudentAttempts));
router.get('/class/:classId/attempts', authenticate, requireRole('teacher', 'admin'), asyncHandler(ctrl.getClassAttempts));
router.get('/:testId', authenticate, asyncHandler(ctrl.getTest));
router.patch('/:testId', authenticate, requireRole('teacher'), asyncHandler(ctrl.updateTest));
router.delete('/:testId', authenticate, requireRole('teacher'), asyncHandler(ctrl.deleteTest));
router.post('/:testId/republish', authenticate, requireRole('teacher'), asyncHandler(ctrl.republishTest));
router.post('/:testId/start', authenticate, requireRole('student'), asyncHandler(ctrl.startTestAttempt));
router.post('/attempts/:attemptId/submit', authenticate, requireRole('student'), asyncHandler(ctrl.submitTestAttempt));
router.get('/:testId/results', authenticate, asyncHandler(ctrl.getTestResults));
router.put('/:testId/results', authenticate, requireRole('teacher'), asyncHandler(ctrl.releaseTestResults));

router.get('/templates/my', authenticate, requireRole('teacher'), asyncHandler(ctrl.listTemplates));
router.post('/templates', authenticate, requireRole('teacher'), asyncHandler(ctrl.createTemplate));
router.put('/templates/:templateId', authenticate, requireRole('teacher'), asyncHandler(ctrl.updateTemplate));
router.delete('/templates/:templateId', authenticate, requireRole('teacher'), asyncHandler(ctrl.deleteTemplate));

export default router;
