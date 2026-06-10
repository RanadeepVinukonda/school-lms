import { Router } from 'express';
import * as auditController from '../controllers/audit.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/', authenticate, requireRole('admin', 'super_admin'), asyncHandler(auditController.listAuditLogs));
router.post('/recover/:logId', authenticate, requireRole('admin', 'super_admin'), asyncHandler(auditController.recoverEntity));

export default router;
