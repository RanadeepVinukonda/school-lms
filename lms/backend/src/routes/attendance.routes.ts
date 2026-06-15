import { Router } from 'express';
import * as attendanceController from '../controllers/attendance.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { markAttendanceSchema } from '../validators/attendance.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/mark', authenticate, requireRole('admin', 'teacher'), validate(markAttendanceSchema), asyncHandler(attendanceController.markAttendance));
router.get('/class/:classId', authenticate, asyncHandler(attendanceController.getClassAttendance));
router.get('/student/:studentId', authenticate, asyncHandler(attendanceController.getStudentAttendance));
router.get('/report/:classId', authenticate, asyncHandler(attendanceController.getAttendanceReport));
router.get('/export/:classId', authenticate, asyncHandler(attendanceController.exportAttendanceCSV));

export default router;
