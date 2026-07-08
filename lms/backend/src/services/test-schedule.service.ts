import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

const TSCH = 'testSchedule';
const TMPL = 'testTemplates';

async function nGet(col: string, id: string) {
  const { data: row } = await getSupabaseAdmin().from('firestore_docs').select('data').eq('collection', col).eq('doc_id', id).maybeSingle();
  return { exists: !!row, data: (row?.data as Record<string, unknown>) ?? null };
}

async function nSet(col: string, id: string, data: Record<string, unknown>) {
  const { error } = await getSupabaseAdmin().from('firestore_docs').upsert({
    collection: col, doc_id: id, data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;
}

async function nUpdate(col: string, id: string, updates: Record<string, unknown>) {
  const { data: existing } = await getSupabaseAdmin().from('firestore_docs').select('data').eq('collection', col).eq('doc_id', id).maybeSingle();
  const merged = { ...((existing?.data as Record<string, unknown>) || {}), ...updates };
  const { error } = await getSupabaseAdmin().from('firestore_docs').upsert({
    collection: col, doc_id: id, data: merged,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;
}

async function nDelete(col: string, id: string) {
  const { error } = await getSupabaseAdmin().from('firestore_docs').delete().eq('collection', col).eq('doc_id', id);
  if (error) throw error;
}

async function nQuery(col: string, filters: Record<string, unknown>) {
  let q: any = getSupabaseAdmin().from('firestore_docs').select('doc_id, data').eq('collection', col);
  for (const [k, v] of Object.entries(filters)) { q = q.contains('data', { [k]: v }); }
  const { data: rows, error } = await q;
  if (error) throw error;
  return (rows || []).map((r: { doc_id: string; data: unknown }) => ({ id: r.doc_id, ...(r.data as object) }));
}

export async function createSchedule(data: {
  templateId: string;
  title: string;
  description?: string;
  classId: string;
  subjectId: string;
  createdBy: string;
  startDate: string;
  endDate: string;
  durationMinutes: number;
  requiresApproval?: boolean;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const { data: template } = await nGet(TMPL, data.templateId);
  if (!template) throw new NotFoundError('Template not found');

  const scheduleData: Record<string, unknown> = {
    id,
    templateId: data.templateId,
    title: data.title,
    description: data.description || null,
    classId: data.classId,
    subjectId: data.subjectId,
    createdBy: data.createdBy,
    startDate: data.startDate,
    endDate: data.endDate,
    durationMinutes: data.durationMinutes,
    status: data.requiresApproval ? 'pending_approval' : 'scheduled',
    approvedBy: null,
    approvedAt: null,
    config: (template as any).config,
    requiresApproval: data.requiresApproval ?? false,
    totalStudents: 0,
    attemptedCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await nSet(TSCH, id, scheduleData);
  logger.info('Test scheduled', { id, title: data.title });
  return scheduleData;
}

export async function approveSchedule(id: string, approverId: string) {
  const { exists, data } = await nGet(TSCH, id);
  if (!exists || !data) throw new NotFoundError('Schedule not found');
  if (data.status !== 'pending_approval') throw new Error('Schedule is not pending approval');

  const now = new Date().toISOString();
  await nUpdate(TSCH, id, { status: 'approved', approvedBy: approverId, approvedAt: now, updatedAt: now });
  logger.info('Test schedule approved', { id, approverId });
  const updated = await nGet(TSCH, id);
  return { id, ...updated.data };
}

export async function updateScheduleStatus(id: string, userId: string, status: string) {
  const { exists, data } = await nGet(TSCH, id);
  if (!exists || !data) throw new NotFoundError('Schedule not found');
  if (data.createdBy !== userId) throw new ForbiddenError('Not your schedule');

  await nUpdate(TSCH, id, { status, updatedAt: new Date().toISOString() });
  logger.info('Test schedule status updated', { id, status });
  const updated = await nGet(TSCH, id);
  return { id, ...updated.data };
}

export async function deleteSchedule(id: string, userId: string) {
  const { exists, data } = await nGet(TSCH, id);
  if (!exists || !data) throw new NotFoundError('Schedule not found');
  if (data.createdBy !== userId) throw new ForbiddenError('Not your schedule');
  await nDelete(TSCH, id);
  logger.info('Test schedule deleted', { id });
}

export async function getSchedule(id: string) {
  const { exists, data } = await nGet(TSCH, id);
  if (!exists || !data) throw new NotFoundError('Schedule not found');
  return { id, ...data };
}

export async function listSchedules(params: {
  classId?: string; subjectId?: string; createdBy?: string; status?: string;
}) {
  let filters: Record<string, unknown> = {};
  if (params.classId) filters.classId = params.classId;
  if (params.subjectId) filters.subjectId = params.subjectId;
  if (params.createdBy) filters.createdBy = params.createdBy;
  if (params.status) filters.status = params.status;

  const results = await nQuery(TSCH, filters);
  results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}
