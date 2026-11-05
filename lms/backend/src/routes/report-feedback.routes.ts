import { Router } from 'express';
import * as reportFeedbackController from '../controllers/report-feedback.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/', authenticate, asyncHandler(reportFeedbackController.createReport));
router.get('/', authenticate, asyncHandler(reportFeedbackController.getReports));
router.get('/stats', authenticate, asyncHandler(reportFeedbackController.getReportStats));
router.get('/:id', authenticate, asyncHandler(reportFeedbackController.getReportById));
router.put('/:id', authenticate, asyncHandler(reportFeedbackController.updateReportStatus));

export default router;
