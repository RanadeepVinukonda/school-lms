import { getSupabaseAdmin, getSupabaseClient } from './supabase';
import { NotFoundError } from '../utils/errors';

export async function createSchool(data: { name: string; subdomain?: string; logo_url?: string; primary_color?: string; plan?: string }) {
  const supabase = getSupabaseAdmin()!;
  const { data: result, error } = await supabase.from('schools').insert(data).select('id').maybeSingle();
  if (error) throw error;
  return { id: result?.id, name: data.name, subdomain: data.subdomain };
}

export async function getSchool(id: string) {
  const { data } = await getSupabaseClient().from('schools').select('*').eq('id', id).maybeSingle();
  if (!data) throw new NotFoundError('School not found');
  return data;
}

export async function updateSchool(id: string, data: Record<string, unknown>) {
  const supabase = getSupabaseAdmin()!;
  const { data: existing } = await supabase.from('schools').select('id').eq('id', id).maybeSingle();
  if (!existing) throw new NotFoundError('School not found');
  await supabase.from('schools').update(data).eq('id', id);
  return { id };
}

export async function getBranding(id: string) {
  const { data } = await getSupabaseClient().from('schools').select('logo_url, primary_color, name').eq('id', id).maybeSingle();
  if (!data) throw new NotFoundError('School not found');
  return data;
}

export async function updateBranding(id: string, branding: { logo_url?: string; primary_color?: string }) {
  const supabase = getSupabaseAdmin()!;
  const { data: existing } = await supabase.from('schools').select('id').eq('id', id).maybeSingle();
  if (!existing) throw new NotFoundError('School not found');
  await supabase.from('schools').update(branding).eq('id', id);
  return { id };
}
