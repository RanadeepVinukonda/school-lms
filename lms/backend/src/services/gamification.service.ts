import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { TransactionManager } from '../database/transaction-manager';

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

export const DAILY_CHALLENGE_TEMPLATES = [
  { title: 'Lesson Master', description: 'Complete 3 lessons today', xpReward: 30, coinReward: 15, type: 'lessons', target: 3 },
  { title: 'Quiz Ace', description: 'Score 80% or higher on a quiz', xpReward: 50, coinReward: 20, type: 'quiz_accuracy', target: 80 },
  { title: 'Assignment Star', description: 'Complete 1 assignment', xpReward: 25, coinReward: 10, type: 'assignments', target: 1 },
  { title: 'Concept Explorer', description: 'Complete 5 concept quizzes', xpReward: 35, coinReward: 15, type: 'concept_quizzes', target: 5 },
  { title: 'Streak Keeper', description: 'Study for 20 minutes', xpReward: 20, coinReward: 10, type: 'study_time', target: 20 },
  { title: 'Perfect Practice', description: 'Get a perfect score on any assessment', xpReward: 60, coinReward: 25, type: 'perfect_score', target: 1 },
];

const WEEKLY_CHALLENGE_TEMPLATES = [
  { title: 'Weekly Warrior', description: 'Complete 10 lessons this week', xpReward: 100, coinReward: 50, type: 'lessons', target: 10 },
  { title: 'Accuracy Ace', description: 'Score 90%+ on 5 quizzes', xpReward: 150, coinReward: 75, type: 'high_accuracy', target: 5 },
  { title: 'Challenge Conqueror', description: 'Complete 3 daily challenges', xpReward: 80, coinReward: 40, type: 'daily_challenges', target: 3 },
  { title: 'Concept Master', description: 'Master 3 concepts (70%+)', xpReward: 200, coinReward: 100, type: 'concept_mastery', target: 3 },
];

const MONTHLY_CHALLENGE_TEMPLATES = [
  { title: 'Diligent Scholar', description: 'Complete 30 lessons this month', xpReward: 300, coinReward: 150, type: 'lessons', target: 30 },
  { title: 'Perfect Month', description: 'Score 100% on 10 quizzes', xpReward: 500, coinReward: 250, type: 'perfect_scores', target: 10 },
  { title: 'Streak Legend', description: 'Maintain a 7-day streak', xpReward: 400, coinReward: 200, type: 'streak', target: 7 },
  { title: 'Subject Star', description: 'Master 8 concepts across any subject', xpReward: 600, coinReward: 300, type: 'concept_mastery', target: 8 },
];

const coll = (name: string) => {
  const s = getSupabaseAdmin()!;
  return { s, name };
};

async function nosqlGet(collection: string, docId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('firestore_docs').select('doc_id, data').eq('collection', collection).eq('doc_id', docId).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function nosqlSet(collection: string, docId: string, docData: Record<string, unknown>) {
  const supabase = getSupabaseAdmin()!;
  const now = new Date().toISOString();
  const { error } = await supabase.from('firestore_docs').upsert({ collection, doc_id: docId, data: docData, updated_at: now }, { onConflict: 'collection,doc_id' });
  if (error) {
    logger.error('Failed to write nosql_doc', { collection, docId, error: error.message });
    throw error;
  }
}

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
  const existing = await nosqlGet('gamificationProfiles', userId);
  if (!existing) {
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
      codingProjectsCompleted: 0,
      codingChallengesCompleted: 0,
      lastActiveDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await nosqlSet('gamificationProfiles', userId, profile);
    return profile;
  }
  const data = existing.data as Record<string, unknown>;
  if (data.codingProjectsCompleted === undefined) {
    await nosqlSet('gamificationProfiles', userId, { ...data, codingProjectsCompleted: 0 });
    data.codingProjectsCompleted = 0;
  }
  if (data.codingChallengesCompleted === undefined) {
    await nosqlSet('gamificationProfiles', userId, { ...data, codingChallengesCompleted: 0 });
    data.codingChallengesCompleted = 0;
  }
  return data;
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

export async function getLeaderboard(limit = 50) {
  const supabase = getSupabaseAdmin()!;
  const { data: rows, error } = await supabase.from('firestore_docs').select('doc_id, data')
    .eq('collection', 'gamificationProfiles')
    .order('data->>xp', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const results: Array<{ userId: string; displayName: string; xp: number; level: number; rank: number; avatar?: string }> = [];
  let rank = 1;
  for (const row of rows || []) {
    const data = row.data as Record<string, unknown>;
    const { data: user, error: userErr } = await supabase.from('users').select('display_name, email, data').eq('id', row.doc_id).maybeSingle();
    if (userErr) throw userErr;
    if (!user) continue;
    const userData = user.data as Record<string, unknown> || {};
    results.push({
      userId: row.doc_id,
      displayName: user.display_name || user.email || 'Unknown',
      xp: (data.xp as number) || 0,
      level: (data.level as number) || 1,
      rank,
      avatar: userData.avatar as string || undefined,
    });
    rank++;
  }
  if (results.length === 0) {
    const { data: allUsers, error: allUsersError } = await supabase.from('users').select('id, display_name, email, data, role');
    if (allUsersError) throw allUsersError;
    for (const user of allUsers || []) {
      if (user.role === 'student') {
        results.push({
          userId: user.id,
          displayName: user.display_name || user.email || 'Unknown',
          xp: 0,
          level: 1,
          rank,
          avatar: (user.data as Record<string, unknown>)?.avatar as string || undefined,
        });
        rank++;
        if (results.length >= limit) break;
      }
    }
  }
  return results;
}

export async function getClassLeaderboard(classId: string, limit = 50) {
  const supabase = getSupabaseAdmin()!;
  const { data: classData, error } = await supabase.from('classes').select('*').eq('id', classId).maybeSingle();
  if (error) throw error;
  if (!classData) throw new NotFoundError('Class not found');

  const { data: usersSnap, error: snapError } = await supabase.from('users')
    .select('id, display_name, email, data')
    .contains('class_ids', [classId]);
  if (snapError) throw snapError;
  let studentIds = (usersSnap || []).map((d) => d.id);

  if (studentIds.length === 0) {
    const legacyIds = (classData.student_ids as string[]) || [];
    if (legacyIds.length === 0) return [];
    studentIds = legacyIds;
  }

  const profiles: Array<{ userId: string; xp: number; level: number; displayName: string; avatar?: string }> = [];
  for (const sid of studentIds) {
    const profile = await nosqlGet('gamificationProfiles', sid);
    const { data: user, error: userErr } = await supabase.from('users').select('display_name, email, data').eq('id', sid).maybeSingle();
    if (userErr) throw userErr;
    if (!user) continue;
    const p = profile?.data as Record<string, unknown> || { xp: 0, level: 1 };
    profiles.push({
      userId: sid,
      xp: (p.xp as number) || 0,
      level: (p.level as number) || 1,
      displayName: user.display_name || user.email || 'Unknown',
      avatar: (user.data as Record<string, unknown>)?.avatar as string || undefined,
    });
  }
  profiles.sort((a, b) => b.xp - a.xp);
  return profiles.slice(0, limit).map((p, i) => ({ ...p, rank: i + 1 }));
}

function getWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function getDailyChallenges(userId: string) {
  const supabase = getSupabaseAdmin()!;
  const today = new Date().toISOString().split('T')[0];
  const { data: rows, error } = await supabase.from('firestore_docs').select('doc_id, data')
    .eq('collection', 'gamificationDailyChallenges')
    .contains('data', { userId, date: today });
  if (error) throw error;

  if (rows && rows.length > 0) {
    return rows.map((r: any) => ({ id: r.doc_id, ...r.data }));
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

  try {
    const tm = new TransactionManager();
    await tm.runTransaction(async (tx) => {
      for (const c of challenges) {
        tx.set('gamificationDailyChallenges', c.id, c);
      }
    });
  } catch (txError) {
    // Fallback: individual upserts when TransactionManager is unavailable (e.g. DATABASE_URL not set)
    logger.warn('TransactionManager unavailable for daily challenges, using fallback inserts', {
      error: txError instanceof Error ? txError.message : String(txError),
    });
    const now = new Date().toISOString();
    for (const c of challenges) {
      const { error } = await supabase.from('firestore_docs').upsert(
        { collection: 'gamificationDailyChallenges', doc_id: c.id, data: c, updated_at: now },
        { onConflict: 'collection,doc_id' }
      );
      if (error) {
        logger.error('Failed to write daily challenge nosql_doc', { challengeId: c.id, error: error.message });
        throw error;
      }
    }
  }

  return challenges;
}

export async function completeDailyChallenge(userId: string, challengeId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('firestore_docs').select('data')
    .eq('collection', 'gamificationDailyChallenges').eq('doc_id', challengeId).maybeSingle();
  if (error) throw error;

  if (!data) throw new NotFoundError('Daily challenge not found');
  const challenge = data.data as Record<string, unknown>;
  if (challenge.userId !== userId) throw new NotFoundError('Challenge not found');
  if (challenge.completed) return { alreadyCompleted: true };

  const merged = { ...challenge, completed: true, progress: challenge.target, updatedAt: new Date().toISOString() };
  const { error: updateError } = await supabase.from('firestore_docs').update({ data: merged })
    .eq('collection', 'gamificationDailyChallenges').eq('doc_id', challengeId);
  if (updateError) throw new Error(`Failed to update daily challenge: ${updateError.message}`);

  const xpResult = await awardXp(userId, (challenge.xpReward as number) || 30, 'daily_challenge');
  const coinResult = await awardCoins(userId, (challenge.coinReward as number) || 15, 'daily_challenge');

  const profile = await ensureProfile(userId);
  profile.challengesCompleted = ((profile.challengesCompleted as number) || 0) + 1;
  profile.updatedAt = new Date().toISOString();
  await nosqlSet('gamificationProfiles', userId, profile);

  logger.info('Daily challenge completed', { userId, challengeId });
  return { xp: xpResult.xp, coins: coinResult.coins, alreadyCompleted: false };
}

async function getOrCreatePeriodChallenges(
  userId: string,
  periodKey: string,
  templates: typeof WEEKLY_CHALLENGE_TEMPLATES,
  collectionName: string,
) {
  const supabase = getSupabaseAdmin()!;
  const { data: rows, error } = await supabase.from('firestore_docs').select('doc_id, data')
    .eq('collection', collectionName)
    .contains('data', { userId, periodKey });
  if (error) throw error;

  if (rows && rows.length > 0) {
    return rows.map((r: any) => ({ id: r.doc_id, ...r.data }));
  }
  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  const challenges = shuffled.map((t) => ({
    id: uuidv4(),
    userId,
    periodKey,
    ...t,
    progress: 0,
    completed: false,
    createdAt: new Date().toISOString(),
  }));

  try {
    const tm = new TransactionManager();
    await tm.runTransaction(async (tx) => {
      for (const c of challenges) {
        tx.set(collectionName, c.id, c);
      }
    });
  } catch (txError) {
    // Fallback: individual upserts when TransactionManager is unavailable (e.g. DATABASE_URL not set)
    logger.warn('TransactionManager unavailable for period challenges, using fallback inserts', {
      collection: collectionName,
      error: txError instanceof Error ? txError.message : String(txError),
    });
    const now = new Date().toISOString();
    for (const c of challenges) {
      const { error } = await supabase.from('firestore_docs').upsert(
        { collection: collectionName, doc_id: c.id, data: c, updated_at: now },
        { onConflict: 'collection,doc_id' }
      );
      if (error) {
        logger.error('Failed to write period challenge nosql_doc', { challengeId: c.id, collection: collectionName, error: error.message });
        throw error;
      }
    }
  }

  return challenges;
}

export async function getWeeklyChallenges(userId: string) {
  return getOrCreatePeriodChallenges(userId, getWeekKey(), WEEKLY_CHALLENGE_TEMPLATES, 'gamificationWeeklyChallenges');
}

export async function getMonthlyChallenges(userId: string) {
  return getOrCreatePeriodChallenges(userId, getMonthKey(), MONTHLY_CHALLENGE_TEMPLATES, 'gamificationMonthlyChallenges');
}

async function completePeriodChallenge(
  userId: string,
  challengeId: string,
  collectionName: string,
  source: string,
) {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('firestore_docs').select('data')
    .eq('collection', collectionName).eq('doc_id', challengeId).maybeSingle();
  if (error) throw error;

  if (!data) throw new NotFoundError('Challenge not found');
  const challenge = data.data as Record<string, unknown>;
  if (challenge.userId !== userId) throw new NotFoundError('Challenge not found');
  if (challenge.completed) return { alreadyCompleted: true };

  const merged = { ...challenge, completed: true, progress: challenge.target, updatedAt: new Date().toISOString() };
  const { error: updateError } = await supabase.from('firestore_docs').update({ data: merged })
    .eq('collection', collectionName).eq('doc_id', challengeId);
  if (updateError) throw new Error(`Failed to update period challenge: ${updateError.message}`);

  const xpResult = await awardXp(userId, (challenge.xpReward as number) || 100, source);
  const coinResult = await awardCoins(userId, (challenge.coinReward as number) || 50, source);

  const profile = await ensureProfile(userId);
  profile.challengesCompleted = ((profile.challengesCompleted as number) || 0) + 1;
  profile.updatedAt = new Date().toISOString();
  await nosqlSet('gamificationProfiles', userId, profile);

  logger.info('Period challenge completed', { userId, challengeId, source });
  return { xp: xpResult.xp, coins: coinResult.coins, alreadyCompleted: false };
}

export async function completeWeeklyChallenge(userId: string, challengeId: string) {
  return completePeriodChallenge(userId, challengeId, 'gamificationWeeklyChallenges', 'weekly_challenge');
}

export async function completeMonthlyChallenge(userId: string, challengeId: string) {
  return completePeriodChallenge(userId, challengeId, 'gamificationMonthlyChallenges', 'monthly_challenge');
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
  await checkAndAwardBadges(userId, p);
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
