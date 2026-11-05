import { getSupabaseAdmin } from './supabase';
import { setCustomClaims } from '../database/auth';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getUserDoc } from './user.service';

export async function assignRole(uid: string, role: string) {
  const supabase = getSupabaseAdmin();
  const { exists } = await getUserDoc(uid);
  if (!exists) throw new NotFoundError('User not found');

  const { error } = await supabase.from('users').update({ role, updated_at: new Date().toISOString() }).eq('id', uid);
  if (error) throw new Error(`Failed to assign user role: ${error.message}`);
  await setCustomClaims(uid, { role });
  logger.info('User role assigned', { uid, role });
}

export async function pingActive(uid: string) {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from('users').select('last_active_date, streak_count').eq('id', uid).maybeSingle();
  if (!existing) throw new NotFoundError('User not found');

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const lastActive = existing.last_active_date ? new Date(existing.last_active_date) : null;
  let streakCount = existing.streak_count ?? 0;

  if (lastActive) {
    const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) streakCount += 1;
    else if (diffDays > 1) streakCount = 1;
  } else {
    streakCount = 1;
  }

  const { error } = await supabase.from('users').update({ streak_count: streakCount, last_active_date: today.toISOString() }).eq('id', uid);
  if (error) throw new Error(`Failed to update user streak: ${error.message}`);
  return { streakCount, lastActiveDate: today.toISOString() };
}

export async function getStrengthsWeaknesses(uid: string) {
  const supabase = getSupabaseAdmin();
  const { data: quizRows } = await supabase.from('firestore_docs').select('data').eq('collection', 'quizAttempts').contains('data', { studentId: uid });
  const { data: examRows } = await supabase.from('firestore_docs').select('data').eq('collection', 'examAttempts').contains('data', { studentId: uid });

  const conceptScores: Record<string, { totalScore: number; totalMax: number; count: number }> = {};

  for (const row of [...(quizRows || []), ...(examRows || [])]) {
    const data = row.data as Record<string, unknown> || {};
    const conceptIds: string[] = (data.conceptIds as string[]) ?? (data.conceptId ? [data.conceptId as string] : []);
    const score = (data.score as number) ?? 0;
    const maxScore = (data.maxScore as number) ?? (data.totalPoints as number) ?? 100;
    for (const cid of conceptIds) {
      if (!cid) continue;
      if (!conceptScores[cid]) conceptScores[cid] = { totalScore: 0, totalMax: 0, count: 0 };
      conceptScores[cid].totalScore += score;
      conceptScores[cid].totalMax += maxScore;
      conceptScores[cid].count += 1;
    }
  }

  const strong: string[] = [];
  const weak: string[] = [];
  const details: Record<string, { name: string; averageScore: number; attemptCount: number }> = {};

  for (const [cid, d] of Object.entries(conceptScores)) {
    const averageScore = d.totalMax > 0 ? Math.round((d.totalScore / d.totalMax) * 100) : 0;
    details[cid] = { name: cid, averageScore, attemptCount: d.count };
    if (averageScore >= 70) strong.push(cid);
    else weak.push(cid);
  }

  return { strongConceptIds: strong, weakConceptIds: weak, conceptDetails: details };
}
