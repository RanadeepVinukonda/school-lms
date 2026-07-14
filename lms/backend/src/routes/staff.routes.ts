import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as staffService from '../services/staff.service';

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
  validate(z.object({
    name: z.string().min(1, 'Name is required'),
    role: z.enum(['teacher', 'non-teaching']),
    department: z.string().optional(),
    joining_date: z.string().optional(),
    contract_url: z.string().optional(),
    user_id: z.string().uuid().optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await staffService.createStaff(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.put('/:id', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    name: z.string().optional(),
    role: z.enum(['teacher', 'non-teaching']).optional(),
    department: z.string().optional(),
    joining_date: z.string().optional(),
    contract_url: z.string().optional(),
    user_id: z.string().uuid().optional(),
  })),
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
  validate(z.object({
    staff_id: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    status: z.enum(['present', 'absent', 'leave']),
  })),
  asyncHandler(async (req, res) => {
    const { staff_id, date, status } = req.body;
    const result = await staffService.markStaffAttendance(req.user!.school_id || '', staff_id, date, status);
    sendSuccess(res, result);
  })
);

router.get('/attendance/report', authenticate,
  validate(z.object({
    dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { dateStart, dateEnd } = req.query as any;
    const result = await staffService.getStaffAttendanceReport(req.user!.school_id || '', dateStart, dateEnd);
    sendSuccess(res, result);
  })
);

export default router;
