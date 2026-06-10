import { Router } from 'express';
import * as assignmentV2Controller from '../controllers/assignment-v2.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/', authenticate, requireRole('teacher', 'admin'), asyncHandler(assignmentV2Controller.createAssignment));
router.get('/my', authenticate, requireRole('teacher', 'admin'), asyncHandler(assignmentV2Controller.listForTeacher));
router.get('/class/:classId', authenticate, asyncHandler(assignmentV2Controller.listForClass));
router.get('/:assignmentId', authenticate, asyncHandler(assignmentV2Controller.getAssignmentById));
router.post('/:assignmentId/release', authenticate, requireRole('teacher', 'admin'), asyncHandler(assignmentV2Controller.releaseAssignment));
router.post('/:assignmentId/start', authenticate, requireRole('student'), asyncHandler(assignmentV2Controller.startAssignment));
router.post('/attempts/:attemptId/submit', authenticate, asyncHandler(assignmentV2Controller.submitAssignment));
router.put('/:assignmentId/grades', authenticate, requireRole('teacher', 'admin'), asyncHandler(assignmentV2Controller.releaseGrades));
router.get('/:assignmentId/results', authenticate, asyncHandler(assignmentV2Controller.getResults));

export default router;
