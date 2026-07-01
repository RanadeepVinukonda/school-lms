import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as noticeService from '../services/notice.service';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const classId = (req.user as any)?.class_id || undefined;
  const items = await noticeService.getNotices(req.user!.school_id || '', classId);
  sendSuccess(res, items);
}));

router.post('/', authenticate, requireRole('admin', 'super_admin', 'teacher'),
  validate(z.object({ title: z.string(), content: z.string(), priority: z.string().optional(), expires_at: z.string().optional(), target_class_id: z.string().nullable().optional() })),
  asyncHandler(async (req, res) => {
    const result = await noticeService.createNotice(req.user!.school_id || '', req.user!.uid, req.body);
    sendSuccess(res, result);
  })
);

router.delete('/:id', authenticate, requireRole('admin', 'super_admin'), asyncHandler(async (req, res) => {
  await noticeService.deleteNotice(req.params.id);
  sendSuccess(res, null, 'Notice deleted');
}));

export default router;
