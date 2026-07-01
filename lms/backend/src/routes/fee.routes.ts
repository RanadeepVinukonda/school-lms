import { Router } from 'express';
import * as feeController from '../controllers/fee.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createFeeScheduleSchema, recordPaymentSchema } from '../validators/fee.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/schedules', authenticate, requireRole('admin'), validate(createFeeScheduleSchema), asyncHandler(feeController.createFeeSchedule));
router.get('/schedules', authenticate, asyncHandler(feeController.listFeeSchedules));
router.get('/schedules/:id', authenticate, asyncHandler(feeController.getFeeSchedule));
router.post('/payments', authenticate, requireRole('admin'), validate(recordPaymentSchema), asyncHandler(feeController.recordPayment));
router.get('/payments/student/:studentId', authenticate, asyncHandler(feeController.getStudentPayments));
router.get('/reports/outstanding', authenticate, requireRole('admin'), asyncHandler(feeController.getOutstandingReport));
router.get('/payments/:id/receipt', authenticate, asyncHandler(feeController.downloadReceipt));

export default router;
