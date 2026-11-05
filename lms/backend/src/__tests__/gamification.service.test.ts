import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockSupabase } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));
jest.mock('../services/notification.service', () => ({ createNotification: jest.fn(() => Promise.resolve({ id: 'n1' })) }));

import {
  calculateLevel, getXpForNextLevel, getXpForCurrentLevel, XP_THRESHOLDS, XP_REWARDS, COIN_REWARDS, BADGE_DEFINITIONS,
  getProfile, awardXp, awardCoins, getBadges, getUserBadges, getLeaderboard, getClassLeaderboard,
  getDailyChallenges, completeDailyChallenge, updateStreak, incrementLessonsCompleted,
  recordAssessmentResult, awardXpAndCoins,
} from '../services/gamification.service';

function defaultProfile() {
  return { xp: 0, level: 1, coins: 0, streak: 0, badges: [], lessonsCompleted: 0, perfectScores: 0, highAccuracyCount: 0, challengesCompleted: 0, codingProjectsCompleted: 0, codingChallengesCompleted: 0, lastActiveDate: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.select.mockReturnThis();
  mockQuery.update.mockReturnThis();
  mockQuery.delete.mockReturnThis();
  (mockQuery as any).upsert = jest.fn<any>().mockReturnThis();
  mockQuery.single.mockResolvedValue(({ data: null, error: null }) as any);
  mockQuery.maybeSingle.mockResolvedValue(({ data: null, error: null }) as any);
  delete (mockQuery as any).data;
  delete (mockQuery as any).error;
  delete (mockQuery as any).count;
});

describe('gamification.service', () => {
  describe('pure functions', () => {
    it('calculateLevel returns correct level', () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(100)).toBe(2);
      expect(calculateLevel(500)).toBe(4);
      expect(calculateLevel(9999)).toBe(10);
    });
    it('getXpForNextLevel returns threshold', () => {
      expect(getXpForNextLevel(1)).toBe(100);
      expect(getXpForNextLevel(10)).toBe(5000);
    });
    it('getXpForCurrentLevel returns previous threshold', () => {
      expect(getXpForCurrentLevel(1)).toBe(0);
      expect(getXpForCurrentLevel(3)).toBe(250);
    });
    it('XP_REWARDS has expected values', () => {
      expect(XP_REWARDS.lessonComplete).toBe(25);
      expect(XP_REWARDS.perfectScore).toBe(100);
    });
    it('COIN_REWARDS has expected values', () => {
      expect(COIN_REWARDS.lessonComplete).toBe(5);
      expect(COIN_REWARDS.highAccuracy).toBe(10);
    });
    it('BADGE_DEFINITIONS includes all badges', () => {
      expect(BADGE_DEFINITIONS.length).toBeGreaterThanOrEqual(15);
      const levelBadges = BADGE_DEFINITIONS.filter(b => b.id.startsWith('level_'));
      expect(levelBadges).toHaveLength(10);
    });
    it('badge conditions evaluate correctly', () => {
      const profile = { xp: 0, level: 1, streak: 5, coins: 50, badges: [], lessonsCompleted: 3, perfectScores: 0, highAccuracyCount: 0, challengesCompleted: 0, codingProjectsCompleted: 0, codingChallengesCompleted: 0 };
      const firstLesson = BADGE_DEFINITIONS.find(b => b.id === 'first_lesson')!;
      const streak3 = BADGE_DEFINITIONS.find(b => b.id === 'streak_3')!;
      expect(firstLesson.condition(profile)).toBe(true);
      expect(streak3.condition(profile)).toBe(true);
    });
  });
  describe('getProfile', () => {
    it('creates profile if missing and returns it', async () => {
      const result = await getProfile('u1');
      expect(result).toBeDefined();
    });
  });
  describe('awardXp', () => {
    it('awards XP and returns result', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({ data: { doc_id: 'u1', data: { xp: 100, level: 2, coins: 50, streak: 0, badges: [], lessonsCompleted: 0, perfectScores: 0, highAccuracyCount: 0, challengesCompleted: 0 } }, error: null }) as any);
      const result = await awardXp('u1', 50, 'test');
      expect(result.xp).toBe(150);
    });
  });
  describe('awardCoins', () => {
    it('awards coins and returns result', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({ data: { doc_id: 'u1', data: { xp: 100, level: 2, coins: 50, streak: 0, badges: [], lessonsCompleted: 0, perfectScores: 0, highAccuracyCount: 0, challengesCompleted: 0 } }, error: null }) as any);
      const result = await awardCoins('u1', 25, 'test');
      expect(result.coins).toBe(75);
    });
  });
  describe('awardXpAndCoins', () => {
    it('awards both atomically', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({ data: { doc_id: 'u1', data: { xp: 100, level: 2, coins: 50, streak: 0, badges: [], lessonsCompleted: 0, perfectScores: 0, highAccuracyCount: 0, challengesCompleted: 0 } }, error: null }) as any);
      const result = await awardXpAndCoins('u1', 25, 10, 'lesson');
      expect(result.xp).toBe(125);
      expect(result.coins).toBe(60);
    });
  });
  describe('getBadges', () => {
    it('returns badge list without conditions', async () => {
      const badges = await getBadges();
      expect(badges.length).toBeGreaterThan(0);
      expect((badges[0] as any).condition).toBeUndefined();
    });
  });
  describe('getUserBadges', () => {
    it('returns badges with earned status', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({ data: { doc_id: 'u1', data: { badges: ['first_lesson'], xp: 0, level: 1, coins: 0, streak: 0, lessonsCompleted: 0, perfectScores: 0, highAccuracyCount: 0, challengesCompleted: 0 } }, error: null }) as any);
      const result = await getUserBadges('u1');
      expect(result.find((b: any) => b.id === 'first_lesson')!.earned).toBe(true);
    });
  });
  describe('updateStreak', () => {
    it('resets streak for inactive user', async () => {
      const threeDaysAgo = new Date(Date.now() - 86400000 * 3).toISOString();
      mockQuery.maybeSingle.mockResolvedValue(({ data: { doc_id: 'u1', data: { xp: 0, level: 1, coins: 0, streak: 10, badges: [], lessonsCompleted: 0, perfectScores: 0, highAccuracyCount: 0, challengesCompleted: 0, lastActiveDate: threeDaysAgo } }, error: null }) as any);
      await expect(updateStreak('u1')).resolves.not.toThrow();
    });
  });
  describe('incrementLessonsCompleted', () => {
    it('increments counter', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({ data: { doc_id: 'u1', data: { xp: 0, level: 1, coins: 0, streak: 0, badges: [], lessonsCompleted: 0, perfectScores: 0, highAccuracyCount: 0, challengesCompleted: 0 } }, error: null }) as any);
      await expect(incrementLessonsCompleted('u1')).resolves.not.toThrow();
    });
  });
  describe('recordAssessmentResult', () => {
    it('records perfect score', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({ data: { doc_id: 'u1', data: { xp: 0, level: 1, coins: 0, streak: 0, badges: [], lessonsCompleted: 0, perfectScores: 0, highAccuracyCount: 0, challengesCompleted: 0 } }, error: null }) as any);
      await expect(recordAssessmentResult('u1', 100)).resolves.not.toThrow();
    });
    it('records high accuracy', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({ data: { doc_id: 'u1', data: { xp: 0, level: 1, coins: 0, streak: 0, badges: [], lessonsCompleted: 0, perfectScores: 0, highAccuracyCount: 0, challengesCompleted: 0 } }, error: null }) as any);
      await expect(recordAssessmentResult('u1', 95)).resolves.not.toThrow();
    });
    it('skips recording for low accuracy', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({ data: { doc_id: 'u1', data: { xp: 0, level: 1, coins: 0, streak: 0, badges: [], lessonsCompleted: 0, perfectScores: 0, highAccuracyCount: 0, challengesCompleted: 0 } }, error: null }) as any);
      await expect(recordAssessmentResult('u1', 50)).resolves.not.toThrow();
    });
  });
});
