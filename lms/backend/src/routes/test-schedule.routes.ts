import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as testScheduleController from '../controllers/test-schedule.controller';

const router = Router();

const createScheduleSchema = z.object({
  testId: z.string().min(1),
  classId: z.string().min(1),
  scheduledDate: z.string().min(1),
  duration: z.number().positive().optional(),
}).passthrough();

const approveScheduleSchema = z.object({}).passthrough();

const updateStatusSchema = z.object({
  status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']),
}).passthrough();

router.post('/', authenticate, requireRole('teacher'), validate(createScheduleSchema), asyncHandler(testScheduleController.createSchedule));
router.get('/', authenticate, asyncHandler(testScheduleController.listSchedules));
router.get('/:id', authenticate, asyncHandler(testScheduleController.getSchedule));
router.put('/:id/approve', authenticate, requireRole('teacher'), validate(approveScheduleSchema), asyncHandler(testScheduleController.approveSchedule));
router.put('/:id/status', authenticate, requireRole('teacher'), validate(updateStatusSchema), asyncHandler(testScheduleController.updateScheduleStatus));
router.delete('/:id', authenticate, requireRole('teacher'), asyncHandler(testScheduleController.deleteSchedule));

export default router;
