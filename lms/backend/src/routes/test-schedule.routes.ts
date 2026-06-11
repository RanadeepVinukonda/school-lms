import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import * as testScheduleController from '../controllers/test-schedule.controller';

const router = Router();

router.post('/', authenticate, requireRole('teacher'), asyncHandler(testScheduleController.createSchedule));
router.get('/', authenticate, asyncHandler(testScheduleController.listSchedules));
router.get('/:id', authenticate, asyncHandler(testScheduleController.getSchedule));
router.put('/:id/approve', authenticate, requireRole('teacher'), asyncHandler(testScheduleController.approveSchedule));
router.put('/:id/status', authenticate, requireRole('teacher'), asyncHandler(testScheduleController.updateScheduleStatus));
router.delete('/:id', authenticate, requireRole('teacher'), asyncHandler(testScheduleController.deleteSchedule));

export default router;
