import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { getReport, getLatest, downloadReportPdf } from '../controllers/reports.controller';

const router = Router();

router.get('/', authenticate, asyncHandler(getLatest));
router.get('/:id', authenticate, asyncHandler(getReport));
router.get('/:id/pdf', authenticate, asyncHandler(downloadReportPdf));

export default router;
