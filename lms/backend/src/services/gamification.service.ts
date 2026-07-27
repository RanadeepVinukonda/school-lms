import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';
import { nosqlSet, ensureProfile } from './gamification-helpers.service';

export {
  getDailyChallenges,
  completeDailyChallenge,
  getWeeklyChallenges,
  getMonthlyChallenges,
  completeWeeklyChallenge,
  completeMonthlyChallenge,
  DAILY_CHALLENGE_TEMPLATES,
} from './gamification-challenges.service';

export {
  getLeaderboard,
  getClassLeaderboard,
} from './gamification-rewards.service';

export const XP_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000];
export const XP_REWARDS = { lessonComplete: 25, assessmentComplete: 15, highAccuracy: 50, perfectScore: 100, dailyChallenge: 30, streakBonus: 10 };
export const COIN_REWARDS = { lessonComplete: 5, assessmentComplete: 3, highAccuracy: 10, perfectScore: 25, dailyChallenge: 15, streakBonus: 5 };

export interface BadgeDefinition { id: string; name: string; description: string; icon: string; condition: (profile: {
  xp: number; level: number; streak: number; coins: number; badges: string[];
  lessonsCompleted: number; perfectScores: number; highAccuracyCount: number; challengesCompleted: number;
  codingProjectsCompleted: number; codingChallengesCompleted: number;
}) => boolean }

export const LEVEL_BADGE_CONFIG = [
  { icon: 'school', name: 'Newcomer' },
  { icon: 'bolt', name: 'Apprentice' },
  { icon: 'star', name: 'Learner' },
  { icon: 'stars', name: 'Achiever' },
  { icon: 'emoji_events', name: 'Rising Star' },
  { icon: 'workspace_premium', name: 'Scholar' },
  { icon: 'diamond', name: 'Expert' },
  { icon: 'military_tech', name: 'Master' },
  { icon: 'auto_awesome', name: 'Genius' },
  { icon: 'rocket_launch', name: 'Top Performer' },
];

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  ...LEVEL_BADGE_CONFIG.map((cfg, idx) => ({
    id: `level_${idx + 1}`,
    name: cfg.name,
    description: `Reach Level ${idx + 1}`,
    icon: cfg.icon,
    condition: (p: { level: number }) => p.level >= idx + 1,
  })),
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
  { id: 'first_project', name: 'First Project', description: 'Complete your first coding project', icon: 'code', condition: (p) => p.codingProjectsCompleted >= 1 },
  { id: 'five_projects', name: 'Apprentice Dev', description: 'Complete 5 coding projects', icon: 'developer_mode', condition: (p) => p.codingProjectsCompleted >= 5 },
  { id: 'ten_challenges', name: 'Codewarrior', description: 'Complete 10 coding challenges', icon: 'terminal', condition: (p) => p.codingChallengesCompleted >= 10 },
  { id: 'project_master', name: 'Project Master', description: 'Complete 20 coding projects', icon: 'rocket', condition: (p) => p.codingProjectsCompleted >= 20 },
];

export { nosqlSet, ensureProfile } from './gamification-helpers.service';

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

export async function getProfile(userId: string) {
  return updateStreak(userId);
}

export async function awardXp(userId: string, amount: number, source: string) {
  const profile = await ensureProfile(userId);
  const newXp = (profile.xp as number) + amount;
  const newLevel = calculateLevel(newXp);
  const supabase = getSupabaseAdmin()!;

  const updated = { ...profile, xp: newXp, level: newLevel, updatedAt: new Date().toISOString() };
  await nosqlSet('gamificationProfiles', userId, updated);

  const { error: txError } = await supabase.from('firestore_docs').insert({
    collection: 'gamificationTransactions', doc_id: uuidv4(),
    data: { userId, amount, type: 'xp', source, createdAt: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  });
  if (txError) throw new Error(`Failed to log gamification transaction: ${txError.message}`);

  logger.info('XP awarded', { userId, amount, source, newXp, newLevel });
  const profile2 = await ensureProfile(userId);
  const newBadges = await checkAndAwardBadges(userId, profile2);
  return { xp: newXp, level: newLevel, newBadges };
}

export async function awardCoins(userId: string, amount: number, source: string) {
  const profile = await ensureProfile(userId);
  const newCoins = (profile.coins as number) + amount;
  const supabase = getSupabaseAdmin()!;

  const updated = { ...profile, coins: newCoins, updatedAt: new Date().toISOString() };
  await nosqlSet('gamificationProfiles', userId, updated);

  const { error: txError } = await supabase.from('firestore_docs').insert({
    collection: 'gamificationTransactions', doc_id: uuidv4(),
    data: { userId, amount, type: 'coin', source, createdAt: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  });
  if (txError) throw new Error(`Failed to log gamification transaction: ${txError.message}`);

  logger.info('Coins awarded', { userId, amount, source });
  const profile2 = await ensureProfile(userId);
  const newBadges = await checkAndAwardBadges(userId, profile2);
  return { coins: newCoins, newBadges };
}

export async function awardXpAndCoins(
  userId: string,
  xpAmount: number,
  coinAmount: number,
  source: string,
): Promise<{ xp: number; coins: number; level: number; newBadges: string[] }> {
  const profile = await ensureProfile(userId);
  const newXp = (profile.xp as number) + xpAmount;
  const newCoins = (profile.coins as number) + coinAmount;
  const newLevel = calculateLevel(newXp);
  const now = new Date().toISOString();

  const updated = { ...profile, xp: newXp, coins: newCoins, level: newLevel, updatedAt: now };
  await nosqlSet('gamificationProfiles', userId, updated);

  const supabase = getSupabaseAdmin()!;
  try {
    const [{ error: xpTxErr }, { error: coinTxErr }] = await Promise.all([
      supabase.from('firestore_docs').insert({ collection: 'gamificationTransactions', doc_id: uuidv4(), data: { userId, amount: xpAmount, type: 'xp', source, createdAt: now }, updated_at: now }),
      supabase.from('firestore_docs').insert({ collection: 'gamificationTransactions', doc_id: uuidv4(), data: { userId, amount: coinAmount, type: 'coin', source, createdAt: now }, updated_at: now }),
    ]);
    if (xpTxErr) throw new Error(`Failed to log gamification transaction: ${xpTxErr.message}`);
    if (coinTxErr) throw new Error(`Failed to log gamification transaction: ${coinTxErr.message}`);
  } catch (err) {
    logger.warn('Failed to log gamification transactions', { userId, source, error: err });
  }

  logger.info('XP and coins awarded atomically', { userId, xpAmount, coinAmount, source, newXp, newCoins, newLevel });
  const updatedProfile = await ensureProfile(userId);
  const newBadges = await checkAndAwardBadges(userId, updatedProfile);
  return { xp: newXp, coins: newCoins, level: newLevel, newBadges };
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

export async function checkAndAwardBadges(userId: string, profile: Record<string, unknown>) {
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
    codingProjectsCompleted: profile.codingProjectsCompleted as number || 0,
    codingChallengesCompleted: profile.codingChallengesCompleted as number || 0,
  };
  for (const badge of BADGE_DEFINITIONS) {
    if (!earnedBadgeIds.has(badge.id) && badge.condition(p)) {
      earnedBadgeIds.add(badge.id);
      newlyEarned.push(badge.id);
    }
  }
  if (newlyEarned.length > 0) {
    const merged = { ...profile, badges: [...earnedBadgeIds], updatedAt: new Date().toISOString() };
    await nosqlSet('gamificationProfiles', userId, merged);
    logger.info('Badges awarded', { userId, badges: newlyEarned });
  }
  return newlyEarned;
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
  const merged = { ...profile, streak: newStreak, lastActiveDate: today, updatedAt: new Date().toISOString() };
  await nosqlSet('gamificationProfiles', userId, merged);
  if (newStreak > 1 && newStreak % 3 === 0) {
    await awardXp(userId, XP_REWARDS.streakBonus * Math.floor(newStreak / 3), 'streak_bonus');
    await awardCoins(userId, COIN_REWARDS.streakBonus * Math.floor(newStreak / 3), 'streak_bonus');
  }
  const profile2 = await ensureProfile(userId);
  await checkAndAwardBadges(userId, profile2);
  return { ...profile2, streak: newStreak };
}

export async function incrementLessonsCompleted(userId: string) {
  const profile = await ensureProfile(userId);
  profile.lessonsCompleted = ((profile.lessonsCompleted as number) || 0) + 1;
  profile.updatedAt = new Date().toISOString();
  await nosqlSet('gamificationProfiles', userId, profile);
  const p = await ensureProfile(userId);
  await checkAndAwardBadges(userId, p);
}

export async function recordAssessmentResult(userId: string, accuracy: number) {
  const profile = await ensureProfile(userId);
  if (accuracy >= 100) profile.perfectScores = ((profile.perfectScores as number) || 0) + 1;
  if (accuracy >= 90) profile.highAccuracyCount = ((profile.highAccuracyCount as number) || 0) + 1;
  profile.updatedAt = new Date().toISOString();
  await nosqlSet('gamificationProfiles', userId, profile);
  const p = await ensureProfile(userId);
  return checkAndAwardBadges(userId, p);
}

export async function recordCodingProjectCompleted(userId: string) {
  const profile = await ensureProfile(userId);
  profile.codingProjectsCompleted = ((profile.codingProjectsCompleted as number) || 0) + 1;
  profile.updatedAt = new Date().toISOString();
  await nosqlSet('gamificationProfiles', userId, profile);
  const p = await ensureProfile(userId);
  await checkAndAwardBadges(userId, p);
}

export async function recordCodingChallengeCompleted(userId: string) {
  const profile = await ensureProfile(userId);
  profile.codingChallengesCompleted = ((profile.codingChallengesCompleted as number) || 0) + 1;
  profile.updatedAt = new Date().toISOString();
  await nosqlSet('gamificationProfiles', userId, profile);
  const p = await ensureProfile(userId);
  await checkAndAwardBadges(userId, p);
}
