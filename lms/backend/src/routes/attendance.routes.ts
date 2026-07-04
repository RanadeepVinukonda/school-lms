import { Router } from 'express';
import * as attendanceController from '../controllers/attendance.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { requireSchoolAccess } from '../middlewares/role.middleware';
import { requireClassAccess } from '../middlewares/class-access.middleware';
import { validate } from '../middlewares/validate.middleware';
import { markAttendanceSchema } from '../validators/attendance.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/mark', authenticate, requireRole('admin', 'teacher'), requireSchoolAccess, validate(markAttendanceSchema), asyncHandler(attendanceController.markAttendance));
router.get('/class/:classId', authenticate, requireSchoolAccess, requireClassAccess('admin', 'super_admin'), asyncHandler(attendanceController.getClassAttendance));
router.get('/student/:studentId', authenticate, requireSchoolAccess, asyncHandler(attendanceController.getStudentAttendance));
router.get('/report/:classId', authenticate, requireSchoolAccess, requireClassAccess('admin', 'super_admin'), asyncHandler(attendanceController.getAttendanceReport));
router.get('/export/:classId', authenticate, requireSchoolAccess, requireClassAccess('admin', 'super_admin'), asyncHandler(attendanceController.exportAttendanceCSV));

export default router;
