import { getSupabaseAdmin } from './supabase';

export async function getChallenges(language?: string, schoolId?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  let q = supabase.from('coding_challenges').select('*');
  if (language) q = q.eq('language', language);
  if (schoolId) q = q.eq('school_id', schoolId);
  const { data } = await q.order('difficulty');
  return data || [];
}

export async function getChallenge(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data } = await supabase.from('coding_challenges').select('*').eq('id', id).maybeSingle();
  return data;
}
