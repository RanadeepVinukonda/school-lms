import { Router } from 'express';
import * as assignmentController from '../controllers/assignment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createAssignmentSchema, updateAssignmentSchema, gradeSubmissionSchema } from '../validators/assignment.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/course/:courseId', authenticate, asyncHandler(assignmentController.listAssignmentsByCourse));
router.get('/:assignmentId', authenticate, asyncHandler(assignmentController.getAssignment));
router.post('/', authenticate, requireRole('teacher', 'admin'), validate(createAssignmentSchema), asyncHandler(assignmentController.createAssignment));
router.put('/:assignmentId', authenticate, requireRole('teacher', 'admin'), validate(updateAssignmentSchema), asyncHandler(assignmentController.updateAssignment));
router.delete('/:assignmentId', authenticate, requireRole('teacher', 'admin'), asyncHandler(assignmentController.deleteAssignment));
router.post('/:assignmentId/submit', authenticate, requireRole('student'), asyncHandler(assignmentController.submitAssignment));
router.get('/:assignmentId/submissions', authenticate, requireRole('teacher', 'admin'), asyncHandler(assignmentController.listSubmissions));
router.put('/:assignmentId/submissions/:submissionId/grade', authenticate, requireRole('teacher', 'admin'), validate(gradeSubmissionSchema), asyncHandler(assignmentController.gradeSubmission));

export default router;
