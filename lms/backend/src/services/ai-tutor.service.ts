import { getSupabaseAdmin } from './supabase';

export async function getSession(userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from('ai_tutor_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .maybeSingle();
  return data;
}

export async function saveMessage(userId: string, message: { role: string; content: string }, language?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const session = await getSession(userId);
  const messages = (session?.messages as Array<{ role: string; content: string }>) || [];
  messages.push(message);
  const last10 = messages.slice(-10);
  
  const payload: any = { messages: last10, updated_at: new Date().toISOString() };
  if (language) {
    payload.language = language;
  }
  
  if (session) {
    const { error } = await supabase.from('ai_tutor_sessions').update(payload).eq('id', session.id);
    if (error) throw new Error('Failed to update tutor session: ' + error.message);
  } else {
    const { error } = await supabase.from('ai_tutor_sessions').insert({ user_id: userId, messages: last10, language: language || 'en' });
    if (error) throw new Error('Failed to create tutor session: ' + error.message);
  }
  return last10;
}

