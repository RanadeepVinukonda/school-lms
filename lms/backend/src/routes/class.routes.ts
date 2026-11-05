import { Router } from 'express';
import { z } from 'zod';
import * as classController from '../controllers/class.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createClassSchema, updateClassSchema } from '../validators/class.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const addStudentsSchema = z.object({
  studentIds: z.array(z.string()).min(1, 'At least one student required'),
});

router.get('/', authenticate, requireRole('admin', 'teacher'), asyncHandler(classController.listClasses));
router.get('/my', authenticate, asyncHandler(classController.listMyClasses));
router.post('/', authenticate, requireRole('admin'), validate(createClassSchema), asyncHandler(classController.createClass));
router.get('/:classId', authenticate, asyncHandler(classController.getClass));
router.put('/:classId', authenticate, requireRole('admin'), validate(updateClassSchema), asyncHandler(classController.updateClass));
router.delete('/:classId', authenticate, requireRole('admin'), asyncHandler(classController.deleteClass));
router.post('/:classId/students', authenticate, requireRole('admin'), validate(addStudentsSchema), asyncHandler(classController.addStudents));
router.delete('/:classId/students', authenticate, requireRole('admin'), asyncHandler(classController.removeStudents));
router.get('/:classId/roster', authenticate, requireRole('admin', 'teacher'), asyncHandler(classController.getRoster));

export default router;
