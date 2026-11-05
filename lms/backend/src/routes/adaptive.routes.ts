import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import { computeMastery, getMastery } from '../services/adaptive/mastery.service';
import { getRecommendations } from '../services/adaptive/recommendation.service';
import { getOverdueConcepts } from '../services/adaptive/revision-scheduler.service';
import { getLearningVelocity } from '../services/adaptive/velocity.service';
import { getSupabaseAdmin } from '../services/supabase';
import { getRemediationPlan, getStudentAdaptiveSummary } from '../services/adaptive/remediation.service';

const router = Router();

const updateMasterySchema = z.object({
  conceptId: z.string().min(1),
  accuracy: z.number().min(0).max(1),
});

router.get('/mastery/:studentId/:conceptId', authenticate, asyncHandler(async (req, res) => {
  const score = await getMastery(req.params.studentId, req.params.conceptId);
  sendSuccess(res, { studentId: req.params.studentId, conceptId: req.params.conceptId, score });
}));

router.post('/mastery', authenticate, validate(updateMasterySchema), asyncHandler(async (req, res) => {
  const score = await computeMastery(req.user!.uid, req.body.conceptId, req.body.accuracy);
  sendSuccess(res, { score });
}));

router.get('/recommendations/:studentId', authenticate, asyncHandler(async (req, res) => {
  const items = await getRecommendations(req.params.studentId, req.user!.school_id || '');
  sendSuccess(res, items);
}));

router.get('/overdue/:studentId', authenticate, requireRole('student'), asyncHandler(async (req, res) => {
  const items = await getOverdueConcepts(req.params.studentId);
  sendSuccess(res, items);
}));

router.get('/velocity/:studentId', authenticate, asyncHandler(async (req, res) => {
  const velocity = await getLearningVelocity(req.params.studentId);
  sendSuccess(res, velocity);
}));

router.get('/skill-distribution/:classId', authenticate, requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) { sendSuccess(res, { distribution: {} }); return; }

  const { data: students, error } = await supabase
    .from('users')
    .select('id, display_name, data')
    .eq('role', 'student')
    .contains('class_ids', [req.params.classId]);
  if (error) { sendSuccess(res, { distribution: {}, students: [] }); return; }

  const distribution: Record<string, number> = { beginner: 0, intermediate: 0, advanced: 0 };
  const profiles = (students || []).map((s: any) => {
    const level = ((s.data as any)?.level as string) || 'beginner';
    distribution[level] = (distribution[level] || 0) + 1;
    return { id: s.id, name: s.display_name || '', level };
  });

  sendSuccess(res, { distribution, students: profiles, total: profiles.length });
}));

router.get('/remediation/:studentId/:conceptId', authenticate, asyncHandler(async (req, res) => {
  const plan = await getRemediationPlan(req.params.studentId, req.params.conceptId);
  sendSuccess(res, plan);
}));

router.get('/student-summary/:studentId', authenticate, asyncHandler(async (req, res) => {
  const summary = await getStudentAdaptiveSummary(req.params.studentId);
  sendSuccess(res, summary);
}));

export default router;
