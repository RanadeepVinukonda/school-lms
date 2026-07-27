import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { nosqlGet } from './nosql.service';

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
