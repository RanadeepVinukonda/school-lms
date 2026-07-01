import { Router } from 'express';
import { z } from 'zod';
import * as auditController from '../controllers/audit.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const recoverSchema = z.object({
  changes: z.record(z.any()),
}).passthrough();

router.get('/', authenticate, requireRole('admin', 'super_admin'), asyncHandler(auditController.listAuditLogs));
router.post('/recover/:logId', authenticate, requireRole('admin', 'super_admin'), validate(recoverSchema), asyncHandler(auditController.recoverEntity));

export default router;
