import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as staffService from '../services/staff.service';
import {
  createStaffSchema,
  updateStaffSchema,
  markStaffAttendanceSchema,
  staffAttendanceReportQuerySchema,
} from '../validators/staff.validator';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const list = await staffService.getStaff(req.user!.school_id || '');
  sendSuccess(res, list);
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const record = await staffService.getStaffById(req.params.id);
  sendSuccess(res, record);
}));

router.post('/', authenticate, requireRole('admin', 'super_admin'),
  validate(createStaffSchema),
  asyncHandler(async (req, res) => {
    const result = await staffService.createStaff(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.put('/:id', authenticate, requireRole('admin', 'super_admin'),
  validate(updateStaffSchema),
  asyncHandler(async (req, res) => {
    const result = await staffService.updateStaff(req.params.id, req.body);
    sendSuccess(res, result);
  })
);

router.delete('/:id', authenticate, requireRole('admin', 'super_admin'), asyncHandler(async (req, res) => {
  await staffService.deleteStaff(req.params.id);
  sendSuccess(res, null, 'Staff record deleted');
}));

router.post('/attendance', authenticate, requireRole('admin', 'super_admin'),
  validate(markStaffAttendanceSchema),
  asyncHandler(async (req, res) => {
    const { staff_id, date, status } = req.body;
    const result = await staffService.markStaffAttendance(req.user!.school_id || '', staff_id, date, status);
    sendSuccess(res, result);
  })
);

router.get('/attendance/report', authenticate,
  validate(staffAttendanceReportQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { dateStart, dateEnd } = req.query as any;
    const result = await staffService.getStaffAttendanceReport(req.user!.school_id || '', dateStart, dateEnd);
    sendSuccess(res, result);
  })
);

export default router;
