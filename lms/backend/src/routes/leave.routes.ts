import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as leaveService from '../services/leave.service';
import type { Request, Response } from 'express';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const list = await leaveService.getLeaveRequests(req.user!.school_id || '');
  sendSuccess(res, list);
}));

router.post('/', authenticate,
  validate(z.object({
    staff_id: z.string().uuid(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().optional(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await leaveService.requestLeave(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.put('/:id/status', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    status: z.enum(['approved', 'rejected']),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await leaveService.updateLeaveStatus(req.user!.school_id || '', req.params.id, req.body.status, req.user!.uid);
    sendSuccess(res, result);
  })
);

export default router;
