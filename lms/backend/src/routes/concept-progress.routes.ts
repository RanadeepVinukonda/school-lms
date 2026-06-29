import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import * as conceptProgressController from '../controllers/concept-progress.controller';

const router = Router();

router.post('/toggle', authenticate, requireRole('teacher'), asyncHandler(conceptProgressController.toggleCompletion));
router.get('/status/:conceptId/:classId', authenticate, requireRole('teacher', 'student'), asyncHandler(conceptProgressController.getStatus));
router.get('/class/:classId', authenticate, requireRole('teacher'), asyncHandler(conceptProgressController.getClassStatus));
router.get('/subject/:subjectId/:classId', authenticate, requireRole('teacher'), asyncHandler(conceptProgressController.getSubjectProgress));
router.get('/student/:classId', authenticate, requireRole('student'), asyncHandler(conceptProgressController.getStudentProgress));

export default router;
