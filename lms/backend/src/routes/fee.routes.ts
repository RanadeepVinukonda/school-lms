import { Router } from 'express';
import * as feeController from '../controllers/fee.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createFeeScheduleSchema, updateFeeScheduleSchema, recordPaymentSchema } from '../validators/fee.validator';
import { asyncHandler } from '../middlewares/asyncHandler';
import { idempotency } from '../middlewares/idempotency.middleware';

const router = Router();

router.post('/schedules', authenticate, requireRole('admin'), validate(createFeeScheduleSchema), asyncHandler(feeController.createFeeSchedule));
router.get('/schedules', authenticate, requireRole('admin'), asyncHandler(feeController.listFeeSchedules));
router.get('/schedules/:id', authenticate, requireRole('admin'), asyncHandler(feeController.getFeeSchedule));
router.put('/schedules/:id', authenticate, requireRole('admin'), validate(updateFeeScheduleSchema), asyncHandler(feeController.updateFeeSchedule));
router.delete('/schedules/:id', authenticate, requireRole('admin'), asyncHandler(feeController.deleteFeeSchedule));
router.post('/payments', authenticate, requireRole('admin'), idempotency(), validate(recordPaymentSchema), asyncHandler(feeController.recordPayment));
router.get('/payments/student/:studentId', authenticate, requireRole('admin'), asyncHandler(feeController.getStudentPayments));
router.get('/reports/outstanding', authenticate, requireRole('admin'), asyncHandler(feeController.getOutstandingReport));
router.get('/payments/:id/receipt', authenticate, requireRole('admin'), asyncHandler(feeController.downloadReceipt));

// Invoices
router.get('/invoices', authenticate, requireRole('admin'), asyncHandler(feeController.listInvoices));
router.get('/invoices/available/:studentId', authenticate, requireRole('admin'), asyncHandler(feeController.getInvoicePreviewData));
router.post('/invoices', authenticate, requireRole('admin'), idempotency(), asyncHandler(feeController.createInvoice));
router.get('/invoices/:id', authenticate, requireRole('admin'), asyncHandler(feeController.getInvoice));
router.get('/invoices/:id/pdf', authenticate, requireRole('admin'), asyncHandler(feeController.downloadInvoice));
router.delete('/invoices/:id', authenticate, requireRole('admin'), asyncHandler(feeController.deleteInvoice));

export default router;
