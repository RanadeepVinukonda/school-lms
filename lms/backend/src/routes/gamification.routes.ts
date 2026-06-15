import { Router } from 'express';
import * as gamificationController from '../controllers/gamification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/profile/me', authenticate, asyncHandler(gamificationController.getMyProfile));
router.get('/profile/:userId', authenticate, asyncHandler(gamificationController.getProfile));
router.post('/xp', authenticate, requireRole('teacher', 'admin'), asyncHandler(gamificationController.awardXp));
router.post('/coins', authenticate, requireRole('teacher', 'admin'), asyncHandler(gamificationController.awardCoins));
router.get('/badges', authenticate, asyncHandler(gamificationController.getBadges));
router.get('/badges/me', authenticate, asyncHandler(gamificationController.getMyBadges));
router.get('/badges/:userId', authenticate, asyncHandler(gamificationController.getUserBadges));
router.get('/leaderboard', authenticate, asyncHandler(gamificationController.getLeaderboard));
router.get('/leaderboard/class/:classId', authenticate, asyncHandler(gamificationController.getClassLeaderboard));
router.get('/daily-challenges', authenticate, asyncHandler(gamificationController.getDailyChallenges));
router.post('/daily-challenges/:id/complete', authenticate, asyncHandler(gamificationController.completeDailyChallenge));
router.get('/streak/me', authenticate, asyncHandler(gamificationController.updateStreak));
router.get('/streak/:userId', authenticate, asyncHandler(gamificationController.getStreak));

export default router;
