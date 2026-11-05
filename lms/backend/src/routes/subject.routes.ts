import { Router } from 'express';
import * as subjectController from '../controllers/subject.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createSubjectSchema, updateSubjectSchema } from '../validators/subject.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/', authenticate, asyncHandler(subjectController.listSubjects));
router.get('/by-class/:classId', authenticate, asyncHandler(subjectController.listSubjectsByClass));
router.get('/:subjectId', authenticate, asyncHandler(subjectController.getSubject));
router.post('/', authenticate, requireRole('admin'), validate(createSubjectSchema), asyncHandler(subjectController.createSubject));
router.put('/:subjectId', authenticate, requireRole('admin'), validate(updateSubjectSchema), asyncHandler(subjectController.updateSubject));
router.delete('/:subjectId', authenticate, requireRole('admin'), asyncHandler(subjectController.deleteSubject));

export default router;
