import { getSupabaseAdmin } from './supabase';
import { nosqlSet as _nosqlSet } from './nosql.service';

export async function nosqlGet(collection: string, docId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('firestore_docs').select('doc_id, data').eq('collection', collection).eq('doc_id', docId).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function nosqlSet(collection: string, docId: string, docData: Record<string, unknown>) {
  await _nosqlSet(collection, docId, docData);
}

export async function ensureProfile(userId: string) {
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
