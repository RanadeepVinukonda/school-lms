import { v4 as uuidv4 } from 'uuid';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { collections } from '../firebase/firestore';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export const XP_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000];
export const XP_REWARDS = { lessonComplete: 25, assessmentComplete: 15, highAccuracy: 50, perfectScore: 100, dailyChallenge: 30, streakBonus: 10 };
export const COIN_REWARDS = { lessonComplete: 5, assessmentComplete: 3, highAccuracy: 10, perfectScore: 25, dailyChallenge: 15, streakBonus: 5 };

export interface BadgeDefinition { id: string; name: string; description: string; icon: string; condition: (profile: { xp: number; level: number; streak: number; coins: number; badges: string[]; lessonsCompleted: number; perfectScores: number; highAccuracyCount: number; challengesCompleted: number }) => boolean }

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'first_lesson', name: 'First Steps', description: 'Complete your first lesson', icon: 'school', condition: (p) => p.lessonsCompleted >= 1 },
  { id: 'quick_learner', name: 'Quick Learner', description: 'Complete 5 lessons in a day', icon: 'bolt', condition: (p) => p.lessonsCompleted >= 5 },
  { id: 'perfect_score', name: 'Perfect Score', description: 'Get a perfect score on any assessment', icon: 'stars', condition: (p) => p.perfectScores >= 1 },
  { id: 'high_achiever', name: 'High Achiever', description: 'Score 90%+ on 3 assessments', icon: 'emoji_events', condition: (p) => p.highAccuracyCount >= 3 },
  { id: 'streak_3', name: 'On Fire', description: '3-day login streak', icon: 'local_fire_department', condition: (p) => p.streak >= 3 },
  { id: 'streak_7', name: 'Unstoppable', description: '7-day login streak', icon: 'local_fire_department', condition: (p) => p.streak >= 7 },
  { id: 'streak_30', name: 'Legendary Streak', description: '30-day login streak', icon: 'military_tech', condition: (p) => p.streak >= 30 },
  { id: 'coin_collector', name: 'Coin Collector', description: 'Collect 100 coins', icon: 'monetization_on', condition: (p) => p.coins >= 100 },
  { id: 'xp_chaser', name: 'XP Chaser', description: 'Reach 1000 XP', icon: 'trending_up', condition: (p) => p.xp >= 1000 },
  { id: 'xp_master', name: 'XP Master', description: 'Reach 5000 XP', icon: 'workspace_premium', condition: (p) => p.xp >= 5000 },
  { id: 'challenge_complete', name: 'Challenge Accepted', description: 'Complete 10 daily challenges', icon: 'task_alt', condition: (p) => p.challengesCompleted >= 10 },
  { id: 'level_5', name: 'Rising Star', description: 'Reach Level 5', icon: 'star', condition: (p) => p.level >= 5 },
  { id: 'level_10', name: 'Top Performer', description: 'Reach Level 10', icon: 'diamond', condition: (p) => p.level >= 10 },
];

export const DAILY_CHALLENGE_TEMPLATES = [
  { title: 'Lesson Master', description: 'Complete 3 lessons today', xpReward: 30, coinReward: 15, type: 'lessons', target: 3 },
  { title: 'Quiz Ace', description: 'Score 80% or higher on a quiz', xpReward: 50, coinReward: 20, type: 'quiz_accuracy', target: 80 },
  { title: 'Assignment Star', description: 'Complete 1 assignment', xpReward: 25, coinReward: 10, type: 'assignments', target: 1 },
  { title: 'Concept Explorer', description: 'Complete 5 concept quizzes', xpReward: 35, coinReward: 15, type: 'concept_quizzes', target: 5 },
  { title: 'Streak Keeper', description: 'Study for 20 minutes', xpReward: 20, coinReward: 10, type: 'study_time', target: 20 },
  { title: 'Perfect Practice', description: 'Get a perfect score on any assessment', xpReward: 60, coinReward: 25, type: 'perfect_score', target: 1 },
];

export function calculateLevel(xp: number): number {
  let level = 1;
  for (const threshold of XP_THRESHOLDS) {
    if (xp >= threshold) level = XP_THRESHOLDS.indexOf(threshold) + 1;
  }
  return Math.min(level, XP_THRESHOLDS.length);
}

export function getXpForNextLevel(level: number): number {
  if (level >= XP_THRESHOLDS.length) return XP_THRESHOLDS[XP_THRESHOLDS.length - 1] + 1000;
  return XP_THRESHOLDS[level];
}

export function getXpForCurrentLevel(level: number): number {
  return XP_THRESHOLDS[Math.max(0, level - 1)];
}

async function ensureProfile(userId: string) {
  const ref = collections.gamificationProfiles().doc(userId);
  const snap = await ref.get();
  if (!snap.exists) {
    const profile = {
      userId,
      xp: 0,
      coins: 0,
      level: 1,
      streak: 0,
      badges: [],
      lessonsCompleted: 0,
      perfectScores: 0,
      highAccuracyCount: 0,
      challengesCompleted: 0,
      lastActiveDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ref.set(profile);
    return profile;
  }
  return snap.data() as Record<string, unknown>;
}

export async function getProfile(userId: string) {
  const profile = await updateStreak(userId);
  return profile;
}

export async function awardXp(userId: string, amount: number, source: string) {
  const profile = await ensureProfile(userId);
  const newXp = (profile.xp as number) + amount;
  const newLevel = calculateLevel(newXp);
  await collections.gamificationProfiles().doc(userId).update({
    xp: FieldValue.increment(amount),
    level: newLevel,
    updatedAt: new Date().toISOString(),
  });
  await collections.gamificationTransactions().add({
    userId, amount, type: 'xp', source, createdAt: new Date().toISOString(),
  });
  logger.info('XP awarded', { userId, amount, source, newXp, newLevel });
  const profile2 = await ensureProfile(userId);
  const newBadges = await checkAndAwardBadges(userId, profile2 as any);
  return { xp: newXp, level: newLevel, newBadges };
}

export async function awardCoins(userId: string, amount: number, source: string) {
  const profile = await ensureProfile(userId);
  const newCoins = (profile.coins as number) + amount;
  await collections.gamificationProfiles().doc(userId).update({
    coins: FieldValue.increment(amount),
    updatedAt: new Date().toISOString(),
  });
  await collections.gamificationTransactions().add({
    userId, amount, type: 'coin', source, createdAt: new Date().toISOString(),
  });
  logger.info('Coins awarded', { userId, amount, source });
  const profile2 = await ensureProfile(userId);
  const newBadges = await checkAndAwardBadges(userId, profile2 as any);
  return { coins: newCoins, newBadges };
}

export async function getBadges() {
  return BADGE_DEFINITIONS.map(({ condition, ...rest }) => rest);
}

export async function getUserBadges(userId: string) {
  const profile = await ensureProfile(userId);
  const earnedBadgeIds = (profile.badges as string[]) || [];
  const allBadges = BADGE_DEFINITIONS.map(({ condition, ...rest }) => rest);
  return allBadges.map((b) => ({ ...b, earned: earnedBadgeIds.includes(b.id), earnedAt: null }));
}

async function checkAndAwardBadges(userId: string, profile: Record<string, unknown>) {
  const earnedBadgeIds = new Set((profile.badges as string[]) || []);
  const newlyEarned: string[] = [];
  const p = {
    xp: profile.xp as number,
    level: profile.level as number,
    streak: profile.streak as number,
    coins: profile.coins as number,
    badges: profile.badges as string[],
    lessonsCompleted: profile.lessonsCompleted as number || 0,
    perfectScores: profile.perfectScores as number || 0,
    highAccuracyCount: profile.highAccuracyCount as number || 0,
    challengesCompleted: profile.challengesCompleted as number || 0,
  };
  for (const badge of BADGE_DEFINITIONS) {
    if (!earnedBadgeIds.has(badge.id) && badge.condition(p)) {
      earnedBadgeIds.add(badge.id);
      newlyEarned.push(badge.id);
    }
  }
  if (newlyEarned.length > 0) {
    await collections.gamificationProfiles().doc(userId).update({
      badges: FieldValue.arrayUnion(...newlyEarned),
      updatedAt: new Date().toISOString(),
    });
    logger.info('Badges awarded', { userId, badges: newlyEarned });
  }
  return newlyEarned;
}

export async function getLeaderboard(limit = 50) {
  const snapshot = await collections.gamificationProfiles()
    .orderBy('xp', 'desc')
    .limit(limit)
    .get();
  const results: Array<{ userId: string; displayName: string; xp: number; level: number; rank: number; avatar?: string }> = [];
  let rank = 1;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const userSnap = await collections.users().doc(doc.id).get();
    const userData = userSnap.data();
    results.push({
      userId: doc.id,
      displayName: userData?.displayName || userData?.email || 'Unknown',
      xp: data.xp || 0,
      level: data.level || 1,
      rank,
      avatar: userData?.avatar || undefined,
    });
    rank++;
  }
  return results;
}

export async function getClassLeaderboard(classId: string, limit = 50) {
  const classSnap = await collections.classes().doc(classId).get();
  if (!classSnap.exists) throw new NotFoundError('Class not found');
  const classData = classSnap.data()!;
  const studentIds = classData.studentIds || [];
  if (studentIds.length === 0) return [];
  const profiles: Array<{ userId: string; xp: number; level: number; displayName: string; avatar?: string }> = [];
  for (const sid of studentIds) {
    const profileSnap = await collections.gamificationProfiles().doc(sid).get();
    const userSnap = await collections.users().doc(sid).get();
    const userData = userSnap.data();
    const p = profileSnap.exists ? profileSnap.data()! : { xp: 0, level: 1 };
    profiles.push({
      userId: sid,
      xp: p.xp || 0,
      level: p.level || 1,
      displayName: userData?.displayName || userData?.email || 'Unknown',
      avatar: userData?.avatar || undefined,
    });
  }
  profiles.sort((a, b) => b.xp - a.xp);
  return profiles.slice(0, limit).map((p, i) => ({ ...p, rank: i + 1 }));
}

export async function getDailyChallenges(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const snapshot = await collections.gamificationDailyChallenges()
    .where('userId', '==', userId)
    .where('date', '==', today)
    .get();
  if (!snapshot.empty) {
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const count = Math.min(DAILY_CHALLENGE_TEMPLATES.length, 3);
  const shuffled = [...DAILY_CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, count);
  const challenges = shuffled.map((t) => ({
    id: uuidv4(),
    userId,
    date: today,
    ...t,
    progress: 0,
    completed: false,
    createdAt: new Date().toISOString(),
  }));
  const batch = collections.gamificationDailyChallenges().firestore.batch();
  for (const c of challenges) {
    batch.set(collections.gamificationDailyChallenges().doc(c.id), c);
  }
  await batch.commit();
  return challenges;
}

export async function completeDailyChallenge(userId: string, challengeId: string) {
  const ref = collections.gamificationDailyChallenges().doc(challengeId);
  const snap = await ref.get();
  if (!snap.exists) throw new NotFoundError('Daily challenge not found');
  const challenge = snap.data()!;
  if (challenge.userId !== userId) throw new NotFoundError('Challenge not found');
  if (challenge.completed) return { alreadyCompleted: true };
  await ref.update({ completed: true, progress: challenge.target, updatedAt: new Date().toISOString() });
  const xpResult = await awardXp(userId, challenge.xpReward || 30, 'daily_challenge');
  const coinResult = await awardCoins(userId, challenge.coinReward || 15, 'daily_challenge');
  await collections.gamificationProfiles().doc(userId).update({
    challengesCompleted: FieldValue.increment(1),
  });
  logger.info('Daily challenge completed', { userId, challengeId });
  return { xp: xpResult.xp, coins: coinResult.coins, alreadyCompleted: false };
}

export async function updateStreak(userId: string) {
  const profile = await ensureProfile(userId);
  const today = new Date().toISOString().split('T')[0];
  const lastActive = profile.lastActiveDate as string | null;
  if (lastActive === today) return profile;
  let newStreak = 1;
  if (lastActive) {
    const lastDate = new Date(lastActive);
    const diff = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) newStreak = (profile.streak as number) + 1;
  }
  await collections.gamificationProfiles().doc(userId).update({
    streak: newStreak,
    lastActiveDate: today,
    updatedAt: new Date().toISOString(),
  });
  if (newStreak > 1 && newStreak % 3 === 0) {
    await awardXp(userId, XP_REWARDS.streakBonus * Math.floor(newStreak / 3), 'streak_bonus');
    await awardCoins(userId, COIN_REWARDS.streakBonus * Math.floor(newStreak / 3), 'streak_bonus');
  }
  const profile2 = await ensureProfile(userId);
  await checkAndAwardBadges(userId, profile2 as any);
  return { ...profile2, streak: newStreak };
}

export async function incrementLessonsCompleted(userId: string) {
  await collections.gamificationProfiles().doc(userId).update({
    lessonsCompleted: FieldValue.increment(1),
  });
  const profile = await ensureProfile(userId);
  await checkAndAwardBadges(userId, profile as any);
}

export async function recordAssessmentResult(userId: string, accuracy: number) {
  const updates: Record<string, unknown> = {};
  if (accuracy >= 100) {
    updates.perfectScores = FieldValue.increment(1);
  }
  if (accuracy >= 90) {
    updates.highAccuracyCount = FieldValue.increment(1);
  }
  if (Object.keys(updates).length > 0) {
    await collections.gamificationProfiles().doc(userId).update(updates);
  }
  const profile = await ensureProfile(userId);
  await checkAndAwardBadges(userId, profile as any);
}
