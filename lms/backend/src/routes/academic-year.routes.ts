import { Router } from 'express';
import * as academicYearController from '../controllers/academic-year.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createAcademicYearSchema, updateAcademicYearSchema } from '../validators/academic-year.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/', authenticate, asyncHandler(academicYearController.listAcademicYears));
router.post('/', authenticate, requireRole('admin', 'super_admin'), validate(createAcademicYearSchema), asyncHandler(academicYearController.createAcademicYear));
router.get('/current', authenticate, asyncHandler(academicYearController.getCurrentAcademicYear));
router.post('/promote', authenticate, requireRole('admin', 'super_admin'), asyncHandler(academicYearController.promoteStudents));
router.get('/:id', authenticate, asyncHandler(academicYearController.getAcademicYear));
router.put('/:id', authenticate, requireRole('admin', 'super_admin'), validate(updateAcademicYearSchema), asyncHandler(academicYearController.updateAcademicYear));
router.delete('/:id', authenticate, requireRole('admin', 'super_admin'), asyncHandler(academicYearController.deleteAcademicYear));

export default router;
