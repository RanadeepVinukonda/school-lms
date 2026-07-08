import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function getDashboardData(studentId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const { data: userRow, error } = await supabase
    .from('users')
    .select('id, display_name, class_id, data')
    .eq('id', studentId)
    .maybeSingle();
  if (error || !userRow) throw new NotFoundError('Student not found');

  const profile = {
    id: studentId,
    displayName: userRow.display_name || 'Student',
    classId: userRow.class_id || '',
    level: (userRow.data as Record<string, unknown> | null)?.level || 'nursery',
  };

  const { data: progressDocs } = await supabase
    .from('firestore_docs')
    .select('data, doc_id')
    .eq('collection', 'prePrimaryProgress')
    .filter('data->>studentId', 'eq', studentId);

  const progress: Record<string, number> = {};
  (progressDocs || []).forEach((doc) => {
    const d = doc.data as Record<string, unknown>;
    progress[(d.subject as string) || 'general'] = (d.completed as number) || 0;
  });

  const totalStars = (progressDocs || []).reduce((sum, doc) => sum + ((doc.data as Record<string, unknown>).stars as number || 0), 0);

  return { profile, progress, totalStars };
}

export async function getLessons() {
  const supabase = getSupabaseAdmin()!;
  const { data: docs } = await supabase
    .from('firestore_docs')
    .select('data, doc_id')
    .eq('collection', 'prePrimaryLessons')
    .order('data->>order', { ascending: true });

  return (docs || []).map((doc) => ({
    id: doc.doc_id,
    ...doc.data as Record<string, unknown>,
  }));
}

export async function getFlashcards(subjectId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: docs } = await supabase
    .from('firestore_docs')
    .select('data, doc_id')
    .eq('collection', 'flashcards')
    .filter('data->>subjectId', 'eq', subjectId);

  return (docs || []).map((doc) => ({
    id: doc.doc_id,
    ...doc.data as Record<string, unknown>,
  }));
}

export async function getStories() {
  const supabase = getSupabaseAdmin()!;
  const { data: docs } = await supabase
    .from('firestore_docs')
    .select('data, doc_id')
    .eq('collection', 'stories')
    .order('data->>order', { ascending: true });

  return (docs || []).map((doc) => ({
    id: doc.doc_id,
    ...doc.data as Record<string, unknown>,
  }));
}

export async function saveTracing(data: {
  studentId: string;
  content: string;
  type: string;
  label?: string;
}) {
  const supabase = getSupabaseAdmin()!;
  const id = uuidv4();
  const now = new Date().toISOString();

  const tracingData = { ...data, id, createdAt: now, updatedAt: now };

  const { error } = await supabase.from('firestore_docs').upsert({
    collection: 'tracingActivities',
    doc_id: id,
    data: tracingData,
    created_at: now,
    updated_at: now,
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;
  logger.info('Tracing saved', { id, studentId: data.studentId });
  return { ...tracingData };
}

export async function updateProgress(studentId: string, data: {
  subject: string;
  completed: number;
  stars?: number;
}) {
  const supabase = getSupabaseAdmin()!;
  const id = `${studentId}_${data.subject}`;
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('firestore_docs')
    .select('data')
    .eq('collection', 'prePrimaryProgress')
    .eq('doc_id', id)
    .maybeSingle();

  const newData = {
    ...data,
    studentId,
    updatedAt: now,
  };

  if (existing) {
    const merged = { ...existing.data as Record<string, unknown>, ...newData };
    const { error: upsertErr } = await supabase.from('firestore_docs').upsert({
      collection: 'prePrimaryProgress',
      doc_id: id,
      data: merged,
      updated_at: now,
    }, { onConflict: 'collection,doc_id' });
    if (upsertErr) throw upsertErr;
  } else {
    const { error: upsertErr } = await supabase.from('firestore_docs').upsert({
      collection: 'prePrimaryProgress',
      doc_id: id,
      data: { ...newData, id, createdAt: now },
      created_at: now,
      updated_at: now,
    }, { onConflict: 'collection,doc_id' });
    if (upsertErr) throw upsertErr;
  }

  const { data: updated } = await supabase
    .from('firestore_docs')
    .select('data')
    .eq('collection', 'prePrimaryProgress')
    .eq('doc_id', id)
    .maybeSingle();
  logger.info('Progress updated', { studentId, subject: data.subject });
  return { ...(updated?.data as Record<string, unknown>) };
}
