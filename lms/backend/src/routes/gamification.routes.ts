import { Router } from 'express';
import { z } from 'zod';
import * as gamificationController from '../controllers/gamification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const awardXpSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  reason: z.string().optional(),
}).passthrough();

const awardCoinsSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  reason: z.string().optional(),
}).passthrough();

const completeChallengeSchema = z.object({}).passthrough();

router.get('/profile/me', authenticate, asyncHandler(gamificationController.getMyProfile));
router.get('/profile/:userId', authenticate, asyncHandler(gamificationController.getProfile));
router.post('/xp', authenticate, requireRole('teacher', 'admin'), validate(awardXpSchema), asyncHandler(gamificationController.awardXp));
router.post('/coins', authenticate, requireRole('teacher', 'admin'), validate(awardCoinsSchema), asyncHandler(gamificationController.awardCoins));
router.get('/badges', authenticate, asyncHandler(gamificationController.getBadges));
router.get('/badges/me', authenticate, asyncHandler(gamificationController.getMyBadges));
router.get('/badges/:userId', authenticate, asyncHandler(gamificationController.getUserBadges));
router.get('/leaderboard', authenticate, asyncHandler(gamificationController.getLeaderboard));
router.get('/leaderboard/class/:classId', authenticate, asyncHandler(gamificationController.getClassLeaderboard));
router.get('/daily-challenges', authenticate, asyncHandler(gamificationController.getDailyChallenges));
router.post('/daily-challenges/:id/complete', authenticate, validate(completeChallengeSchema), asyncHandler(gamificationController.completeDailyChallenge));
router.get('/weekly-challenges', authenticate, asyncHandler(gamificationController.getWeeklyChallenges));
router.post('/weekly-challenges/:id/complete', authenticate, validate(completeChallengeSchema), asyncHandler(gamificationController.completeWeeklyChallenge));
router.get('/monthly-challenges', authenticate, asyncHandler(gamificationController.getMonthlyChallenges));
router.post('/monthly-challenges/:id/complete', authenticate, validate(completeChallengeSchema), asyncHandler(gamificationController.completeMonthlyChallenge));
router.get('/streak/me', authenticate, asyncHandler(gamificationController.updateStreak));
router.get('/streak/:userId', authenticate, asyncHandler(gamificationController.getStreak));

export default router;
