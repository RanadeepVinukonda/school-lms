import { Request, Response } from 'express';
import { getSupabaseAdmin } from '../services/supabase';
import { NotFoundError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export async function createSchool(req: Request, res: Response) {
  const supabase = getSupabaseAdmin()!;
  const { name, subdomain, logo_url, primary_color, plan } = req.body;
  const { data, error } = await supabase.from('schools').insert({ name, subdomain, logo_url, primary_color, plan }).select('id').maybeSingle();
  if (error) throw error;
  sendSuccess(res, { id: data?.id, name, subdomain }, undefined, 201);
}

export async function getSchool(req: Request, res: Response) {
  const { data } = await getSupabaseAdmin()!.from('schools').select('*').eq('id', req.params.id).maybeSingle();
  if (!data) throw new NotFoundError('School not found');
  sendSuccess(res, data);
}

export async function updateSchool(req: Request, res: Response) {
  const supabase = getSupabaseAdmin()!;
  const { data } = await supabase.from('schools').select('id').eq('id', req.params.id).maybeSingle();
  if (!data) throw new NotFoundError('School not found');
  await supabase.from('schools').update(req.body).eq('id', req.params.id);
  sendSuccess(res, { id: req.params.id });
}

export async function getBranding(req: Request, res: Response) {
  const { data } = await getSupabaseAdmin()!.from('schools').select('logo_url, primary_color, name').eq('id', req.params.id).maybeSingle();
  if (!data) throw new NotFoundError('School not found');
  sendSuccess(res, data);
}

export async function updateBranding(req: Request, res: Response) {
  const supabase = getSupabaseAdmin()!;
  const { data } = await supabase.from('schools').select('id').eq('id', req.params.id).maybeSingle();
  if (!data) throw new NotFoundError('School not found');
  const { logo_url, primary_color } = req.body;
  await supabase.from('schools').update({ logo_url, primary_color }).eq('id', req.params.id);
  sendSuccess(res, { id: req.params.id });
}
