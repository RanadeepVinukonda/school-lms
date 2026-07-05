import { getSupabaseAdmin } from './supabase';

export async function getChallenges(language?: string, schoolId?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  let q = supabase.from('coding_challenges').select('*');
  if (language) q = q.eq('language', language);
  if (schoolId) q = q.eq('school_id', schoolId);
  const { data, error } = await q.order('difficulty');
  if (error) throw new Error('Failed to fetch challenges: ' + error.message);
  return data || [];
}

export async function getChallenge(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data, error } = await supabase.from('coding_challenges').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('Failed to fetch challenge: ' + error.message);
  return data;
}
