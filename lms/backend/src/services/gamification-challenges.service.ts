import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { nosqlSet, ensureProfile } from './gamification-helpers.service';
import { awardXp, awardCoins } from './gamification.service';

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

  let activityChallenges: typeof DAILY_CHALLENGE_TEMPLATES = [];
  try {
    const { data: recentLessons } = await supabase.from('firestore_docs')
      .select('data')
      .eq('collection', 'conceptProgress')
      .contains('data', { userId })
      .order('updated_at', { ascending: false })
      .limit(20);

    const { data: recentQuizzes } = await supabase.from('firestore_docs')
      .select('data')
      .eq('collection', 'quizAttempts')
      .contains('data', { userId })
      .order('updated_at', { ascending: false })
      .limit(10);

    const viewedLessons = (recentLessons || [])
      .filter((r: any) => r.data?.lessonCompleted)
      .map((r: any) => r.data);
    if (viewedLessons.length > 0) {
      const count = Math.min(viewedLessons.length, 5);
      activityChallenges.push({
        title: 'Review Master',
        description: `Review ${count} lessons you've completed`,
        xpReward: 25 + count * 5,
        coinReward: 10 + count * 2,
        type: 'lessons',
        target: count,
      });
    }

    const quizAttempts = (recentQuizzes || []).map((r: any) => r.data);
    const lowScoreQuizzes = quizAttempts.filter((q: any) => (q.score || 0) < 80);
    if (lowScoreQuizzes.length > 0) {
      activityChallenges.push({
        title: 'Score Booster',
        description: 'Score 80% or higher on a quiz you attempted before',
        xpReward: 40,
        coinReward: 20,
        type: 'quiz_accuracy',
        target: 80,
      });
    }

    const exploredConcepts = (recentLessons || [])
      .filter((r: any) => r.data?.lastAccessed)
      .map((r: any) => r.data?.conceptId)
      .filter(Boolean);
    if (exploredConcepts.length >= 3) {
      activityChallenges.push({
        title: 'Concept Deep Dive',
        description: `Practice quiz on ${Math.min(exploredConcepts.length, 5)} concepts you explored`,
        xpReward: 35,
        coinReward: 15,
        type: 'concept_quizzes',
        target: Math.min(exploredConcepts.length, 5),
      });
    }
  } catch (err) {
    logger.warn('Failed to fetch activity for personalized challenges, falling back to generic', { userId, error: (err as Error).message });
  }

  const needed = 3;
  let selected: typeof DAILY_CHALLENGE_TEMPLATES;
  if (activityChallenges.length >= needed) {
    selected = activityChallenges.slice(0, needed);
  } else {
    const remaining = needed - activityChallenges.length;
    const genericFiller = [...DAILY_CHALLENGE_TEMPLATES]
      .sort(() => Math.random() - 0.5)
      .slice(0, remaining);
    selected = [...activityChallenges, ...genericFiller];
  }

  const challenges = selected.map((t) => ({
    id: uuidv4(),
    userId,
    date: today,
    ...t,
    progress: 0,
    completed: false,
    createdAt: new Date().toISOString(),
  }));

  const now = new Date().toISOString();
  for (const c of challenges) {
    const { error } = await supabase.from('firestore_docs').upsert(
      { collection: 'gamificationDailyChallenges', doc_id: c.id, data: c, updated_at: now },
      { onConflict: 'collection,doc_id' }
    );
    if (error) {
      logger.error('Failed to write daily challenge', { challengeId: c.id, error: error.message });
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

  const now = new Date().toISOString();
  for (const c of challenges) {
    const { error } = await supabase.from('firestore_docs').upsert(
      { collection: collectionName, doc_id: c.id, data: c, updated_at: now },
      { onConflict: 'collection,doc_id' }
    );
    if (error) {
      logger.error('Failed to write period challenge', { challengeId: c.id, collection: collectionName, error: error.message });
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
