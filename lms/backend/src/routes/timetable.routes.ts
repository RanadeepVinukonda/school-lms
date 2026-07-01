import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as timetableService from '../services/timetable.service';

const router = Router();

router.get('/class/:classId', authenticate, asyncHandler(async (req, res) => {
  const items = await timetableService.getTimetableByClass(req.params.classId);
  sendSuccess(res, items);
}));

router.get('/school/:schoolId', authenticate, asyncHandler(async (req, res) => {
  const items = await timetableService.getTimetableBySchool(req.params.schoolId);
  sendSuccess(res, items);
}));

router.post('/', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({ classId: z.string(), day: z.string(), period: z.number(), subjectId: z.string().optional(), teacherId: z.string().optional(), room: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const result = await timetableService.createTimetableEntry({ ...req.body, schoolId: req.user!.school_id || '' });
    sendSuccess(res, result);
  })
);

router.put('/:id', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({ classId: z.string().optional(), day: z.string().optional(), period: z.number().optional(), subjectId: z.string().optional(), teacherId: z.string().optional(), room: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const result = await timetableService.updateTimetableEntry(req.params.id, req.body);
    sendSuccess(res, result);
  })
);

router.delete('/:id', authenticate, requireRole('admin', 'super_admin'), asyncHandler(async (req, res) => {
  await timetableService.deleteTimetableEntry(req.params.id);
  sendSuccess(res, null, 'Timetable entry deleted');
}));

export default router;
