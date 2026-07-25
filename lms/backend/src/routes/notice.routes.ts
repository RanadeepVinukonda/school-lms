import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as noticeService from '../services/notice.service';
import { getSupabaseAdmin } from '../services/supabase';
import { createBulkNotifications } from '../services/notification.service';
import { logger } from '../utils/logger';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const user = req.user!;
  let classIds: string[] = [];
  if (user.role === 'parent' && (user as any).children_ids?.length > 0) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: children } = await supabase.from('users').select('class_id').in('id', (user as any).children_ids);
      if (children) {
        classIds = [...new Set(children.map((c) => c.class_id).filter(Boolean))] as string[];
      }
    }
  } else if (user.class_id) {
    classIds = [user.class_id];
  }
  const items = await noticeService.getNotices(user.school_id || '', classIds.length > 0 ? classIds : undefined);
  sendSuccess(res, items);
}));

router.post('/', authenticate, requireRole('admin', 'super_admin', 'teacher'),
  validate(z.object({ title: z.string(), content: z.string(), priority: z.string().optional(), expires_at: z.string().optional(), target_class_id: z.string().nullable().optional() })),
  asyncHandler(async (req, res) => {
    const result = await noticeService.createNotice(req.user!.school_id || '', req.user!.uid, req.body);
    // generate bell notifications for affected users
    notifyUsersOfNotice(req.user!.school_id || '', req.body.target_class_id, req.body.title, req.body.content)
      .catch((err) => logger.warn('Failed to notify users of notice', { error: err?.message || err }));
    sendSuccess(res, result);
  })
);

router.delete('/:id', authenticate, requireRole('admin', 'super_admin'), asyncHandler(async (req, res) => {
  await noticeService.deleteNotice(req.params.id);
  sendSuccess(res, null, 'Notice deleted');
}));

async function notifyUsersOfNotice(schoolId: string, targetClassId: string | null | undefined, title: string, content: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  let userIds: string[] = [];
  if (targetClassId) {
    const { data: users } = await supabase
      .from('users').select('id').eq('school_id', schoolId)
      .or(`role.eq.student,role.eq.teacher,role.eq.parent`)
      .contains('class_ids', [targetClassId]);
    if (users) userIds = users.map(u => u.id as string);
    const { data: parents } = await supabase
      .from('users').select('children_ids').eq('school_id', schoolId).eq('role', 'parent');
    if (parents) {
      const { data: students } = await supabase.from('users').select('id').in('class_id', [targetClassId]);
      if (students) {
        const studentIds = new Set(students.map(s => s.id as string));
        for (const p of parents) {
          const kids = (p.children_ids as string[]) || [];
          if (kids.some(k => studentIds.has(k))) userIds.push(p.id as string);
        }
      }
    }
  } else {
    const { data: users } = await supabase
      .from('users').select('id').eq('school_id', schoolId)
      .in('role', ['student', 'teacher', 'parent']);
    if (users) userIds = users.map(u => u.id as string);
  }
  if (userIds.length === 0) return;
  await createBulkNotifications(userIds.map(uid => ({
    userId: uid, type: 'announcement', title: `Notice: ${title}`, body: content,
  })));
}

export default router;
