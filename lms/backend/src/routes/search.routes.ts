import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import { getSupabaseAdmin } from '../services/supabase';
import { indexDocument, searchAll } from '../services/search.service';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { q } = req.query;
  const schoolId = req.user!.school_id || '';
  const results = await searchAll(String(q || ''), schoolId);
  sendSuccess(res, results || { textbooks: [], concepts: [], courses: [] });
}));

router.post('/sync', authenticate, asyncHandler(async (_req, res) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database connection failed');

  // 1. Fetch textbooks
  const { data: textbooks } = await supabase.from('textbooks').select('*');
  if (textbooks) {
    for (const item of textbooks) {
      await indexDocument('textbooks', item.id, {
        id: item.id,
        school_id: item.school_id,
        title: item.title,
        subject: item.subject,
        description: item.description,
      });
    }
  }

  // 2. Fetch concepts
  const { data: concepts } = await supabase.from('concepts').select('*, textbook:textbooks(school_id)');
  if (concepts) {
    for (const item of concepts) {
      await indexDocument('concepts', item.id, {
        id: item.id,
        school_id: (item.textbook as any)?.school_id,
        title: item.title,
        notes: item.notes,
      });
    }
  }

  // 3. Fetch courses
  const { data: courses } = await supabase.from('courses').select('*');
  if (courses) {
    for (const item of courses) {
      await indexDocument('courses', item.id, {
        id: item.id,
        school_id: item.school_id,
        name: item.name,
        description: item.description,
      });
    }
  }

  sendSuccess(res, null, 'Sync completed');
}));

export default router;
