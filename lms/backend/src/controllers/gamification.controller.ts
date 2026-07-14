import { Request, Response } from 'express';
import * as gamificationService from '../services/gamification.service';
import { sendSuccess, sendCreated } from '../utils/response';
import type { ReqWithUser } from '../types/common';

export async function getProfile(req: Request, res: Response) {
  const { userId } = req.params;
  const profile = await gamificationService.getProfile(userId);
  sendSuccess(res, profile);
}

export async function getMyProfile(req: Request, res: Response) {
  try {
    const userId = (req as ReqWithUser).user!.uid;
    const profile = await gamificationService.getProfile(userId);
    sendSuccess(res, profile);
  } catch {
    sendSuccess(res, { xp: 0, coins: 0, level: 1, streak: 0, badges: [] });
  }
}

export async function awardXp(req: Request, res: Response) {
  const { userId, amount, source } = req.body;
  const result = await gamificationService.awardXp(userId, amount, source);
  sendCreated(res, result, 'XP awarded');
}

export async function awardCoins(req: Request, res: Response) {
  const { userId, amount, source } = req.body;
  const result = await gamificationService.awardCoins(userId, amount, source);
  sendCreated(res, result, 'Coins awarded');
}

export async function getBadges(_req: Request, res: Response) {
  const badges = await gamificationService.getBadges();
  sendSuccess(res, badges);
}

export async function getUserBadges(req: Request, res: Response) {
  const { userId } = req.params;
  const badges = await gamificationService.getUserBadges(userId);
  sendSuccess(res, badges);
}

export async function getMyBadges(req: Request, res: Response) {
  try {
    const userId = (req as ReqWithUser).user!.uid;
    const badges = await gamificationService.getUserBadges(userId);
    sendSuccess(res, badges);
  } catch {
    sendSuccess(res, []);
  }
}

export async function getLeaderboard(_req: Request, res: Response) {
  const limit = parseInt(_req.query.limit as string) || 50;
  const leaderboard = await gamificationService.getLeaderboard(limit);
  sendSuccess(res, leaderboard);
}

export async function getClassLeaderboard(req: Request, res: Response) {
  const { classId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const leaderboard = await gamificationService.getClassLeaderboard(classId, limit);
  sendSuccess(res, leaderboard);
}

export async function getDailyChallenges(req: Request, res: Response) {
  try {
    const userId = (req as ReqWithUser).user!.uid;
    const challenges = await gamificationService.getDailyChallenges(userId);
    sendSuccess(res, challenges);
  } catch {
    sendSuccess(res, []);
  }
}

export async function completeDailyChallenge(req: Request, res: Response) {
  const userId = (req as ReqWithUser).user!.uid;
  const { id } = req.params;
  const result = await gamificationService.completeDailyChallenge(userId, id);
  sendSuccess(res, result, 'Daily challenge completed');
}

export async function getWeeklyChallenges(req: Request, res: Response) {
  try {
    const userId = (req as ReqWithUser).user!.uid;
    const challenges = await gamificationService.getWeeklyChallenges(userId);
    sendSuccess(res, challenges);
  } catch {
    sendSuccess(res, []);
  }
}

export async function completeWeeklyChallenge(req: Request, res: Response) {
  const userId = (req as ReqWithUser).user!.uid;
  const { id } = req.params;
  const result = await gamificationService.completeWeeklyChallenge(userId, id);
  sendSuccess(res, result, 'Weekly challenge completed');
}

export async function getMonthlyChallenges(req: Request, res: Response) {
  try {
    const userId = (req as ReqWithUser).user!.uid;
    const challenges = await gamificationService.getMonthlyChallenges(userId);
    sendSuccess(res, challenges);
  } catch {
    sendSuccess(res, []);
  }
}

export async function completeMonthlyChallenge(req: Request, res: Response) {
  const userId = (req as ReqWithUser).user!.uid;
  const { id } = req.params;
  const result = await gamificationService.completeMonthlyChallenge(userId, id);
  sendSuccess(res, result, 'Monthly challenge completed');
}

export async function getStreak(req: Request, res: Response) {
  const { userId } = req.params;
  const profile = await gamificationService.getProfile(userId);
  sendSuccess(res, { streak: profile.streak || 0, lastActiveDate: profile.lastActiveDate || null });
}

export async function updateStreak(req: Request, res: Response) {
  try {
    const userId = (req as ReqWithUser).user!.uid;
    const result = await gamificationService.updateStreak(userId);
    sendSuccess(res, result, 'Streak updated');
  } catch {
    sendSuccess(res, { streak: 0 });
  }
}
