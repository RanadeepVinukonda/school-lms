import { Router } from 'express';
import * as tcsController from '../controllers/teacher-class-subject.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/assign', authenticate, requireRole('admin'), asyncHandler(tcsController.assignTeacher));
router.post('/setup', authenticate, requireRole('teacher'), asyncHandler(tcsController.setupTeacher));
router.get('/my', authenticate, requireRole('teacher'), asyncHandler(tcsController.getMyAssignments));
router.get('/my/class/:classId', authenticate, requireRole('teacher'), asyncHandler(tcsController.getAssignmentForClass));
router.get('/unassigned/:classId', authenticate, requireRole('admin', 'teacher'), asyncHandler(tcsController.getUnassignedSubjects));
router.get('/all', authenticate, requireRole('admin'), asyncHandler(tcsController.getAllAssignments));
router.delete('/:assignmentId', authenticate, requireRole('admin'), asyncHandler(tcsController.removeAssignment));

export default router;
