import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess, sendCreated } from '../utils/response';
import * as curriculumPlanService from '../services/curriculum-plan.service';

const router = Router();

const chapterPlanSchema = z.object({
  chapterId: z.string().min(1),
  chapterTitle: z.string().min(1),
  week: z.number().int().positive(),
  startDate: z.string(),
  endDate: z.string(),
});

const createPlanSchema = z.object({
  board_id: z.string().min(1),
  grade: z.string().min(1),
  subject: z.string().min(1),
  title: z.string().min(1),
  academic_year: z.string().min(1),
  chapters: z.array(chapterPlanSchema).default([]),
});

const updatePlanSchema = createPlanSchema.partial();

router.get('/teachers/:id/curriculum-plans', authenticate, requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
  const plans = await curriculumPlanService.getPlans(req.params.id, req.user!.school_id);
  sendSuccess(res, plans);
}));

router.post('/teachers/:id/curriculum-plans', authenticate, requireRole('teacher', 'admin'), validate(createPlanSchema), asyncHandler(async (req, res) => {
  const plan = await curriculumPlanService.createPlan({
    teacher_id: req.params.id,
    school_id: req.user!.school_id || '',
    ...req.body,
  });
  sendCreated(res, plan, 'Curriculum plan created');
}));

router.get('/curriculum-plans/:planId', authenticate, requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
  const plan = await curriculumPlanService.getPlan(req.params.planId, req.user!.school_id);
  sendSuccess(res, plan);
}));

router.put('/curriculum-plans/:planId', authenticate, requireRole('teacher', 'admin'), validate(updatePlanSchema), asyncHandler(async (req, res) => {
  const plan = await curriculumPlanService.updatePlan(req.params.planId, req.body);
  sendSuccess(res, plan, 'Curriculum plan updated');
}));

router.delete('/curriculum-plans/:planId', authenticate, requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
  await curriculumPlanService.deletePlan(req.params.planId);
  sendSuccess(res, null, 'Curriculum plan deleted');
}));

export default router;
