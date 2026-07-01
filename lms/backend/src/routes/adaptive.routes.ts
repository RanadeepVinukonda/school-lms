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

export default router;
