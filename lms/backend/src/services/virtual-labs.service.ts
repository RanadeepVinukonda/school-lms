import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { deleteDocument } from './document.service';
import { logger } from '../utils/logger';

export interface LabElement {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  properties: Record<string, unknown>;
}

export interface VirtualLab {
  id?: string;
  title: string;
  subject: 'physics' | 'chemistry' | 'biology';
  topic: string;
  description: string;
  type: 'circuit' | 'mechanics' | 'reaction' | 'cell' | 'custom';
  config: {
    elements: LabElement[];
    initialState: Record<string, unknown>;
  };
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  classIds: string[];
  createdAt: string;
}

const NOSQL_LABS = 'virtualLabs';
const NOSQL_PROGRESS = 'virtualLabProgress';

async function getNsDoc(collection: string, docId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('firestore_docs').select('data, doc_id').eq('collection', collection).eq('doc_id', docId).maybeSingle();
  if (error) throw new Error('Failed to fetch document: ' + error.message);
  return data ? { id: data.doc_id, ...data.data as Record<string, unknown> } : null;
}

export async function getAllLabs() {
  const supabase = getSupabaseAdmin();
  const { data: docs, error } = await supabase.from('firestore_docs').select('data, doc_id').eq('collection', NOSQL_LABS).order('created_at', { ascending: false });
  if (error) throw new Error('Failed to fetch virtual labs: ' + error.message);
  return (docs || []).map((d) => ({ id: d.doc_id, ...d.data as Record<string, unknown> }));
}

export async function getLabById(id: string) {
  const doc = await getNsDoc(NOSQL_LABS, id);
  if (!doc) throw new NotFoundError('Virtual lab not found');
  return doc;
}

export async function createLab(data: Omit<VirtualLab, 'id' | 'createdAt'>) {
  const supabase = getSupabaseAdmin();
  const id = uuidv4();
  const now = new Date().toISOString();
  const lab = { ...data, createdAt: now };
  const { error } = await supabase.from('firestore_docs').upsert({ collection: NOSQL_LABS, doc_id: id, data: lab, created_at: now, updated_at: now }, { onConflict: 'collection,doc_id' });
  if (error) throw new Error(`Failed to create virtual lab: ${error.message}`);
  logger.info('Virtual lab created', { id, title: lab.title });
  return { id, ...lab };
}

export async function updateLab(id: string, data: Partial<VirtualLab>) {
  const doc = await getNsDoc(NOSQL_LABS, id);
  if (!doc) throw new NotFoundError('Virtual lab not found');
  const now = new Date().toISOString();
  const { data: existing, error: fetchErr } = await getSupabaseAdmin().from('firestore_docs').select('data').eq('collection', NOSQL_LABS).eq('doc_id', id).maybeSingle();
  if (fetchErr) throw new Error('Failed to fetch lab: ' + fetchErr.message);
  const merged = { ...(existing?.data as Record<string, unknown> ?? {}), ...data, updatedAt: now };
  const { error } = await getSupabaseAdmin().from('firestore_docs').upsert({ collection: NOSQL_LABS, doc_id: id, data: merged, updated_at: now }, { onConflict: 'collection,doc_id' });
  if (error) throw new Error(`Failed to update virtual lab: ${error.message}`);
  return getNsDoc(NOSQL_LABS, id) as Promise<Record<string, unknown>>;
}

export async function deleteLab(id: string) {
  const doc = await getNsDoc(NOSQL_LABS, id);
  if (!doc) throw new NotFoundError('Virtual lab not found');
  await deleteDocument(NOSQL_LABS, id);
  logger.info('Virtual lab deleted', { id });
}

export async function markLabCompleted(studentId: string, labId: string) {
  const supabase = getSupabaseAdmin();
  const labDoc = await getNsDoc(NOSQL_LABS, labId);
  if (!labDoc) throw new NotFoundError('Virtual lab not found');

  const progressId = `${studentId}_${labId}`;
  const { data: existing, error: fetchErr } = await supabase.from('firestore_docs').select('data').eq('collection', NOSQL_PROGRESS).eq('doc_id', progressId).maybeSingle();
  if (fetchErr) throw new Error('Failed to fetch lab progress: ' + fetchErr.message);
  const now = new Date().toISOString();

  if (existing) {
    const data = existing.data as Record<string, unknown>;
    const attempts = ((data.attempts as number) || 0) + 1;
    const { error } = await supabase.from('firestore_docs').upsert({
      collection: NOSQL_PROGRESS, doc_id: progressId,
      data: { ...data, completedAt: now, attempts },
      updated_at: now,
    }, { onConflict: 'collection,doc_id' });
    if (error) throw new Error(`Failed to update lab progress: ${error.message}`);
  } else {
    const { error } = await supabase.from('firestore_docs').upsert({
      collection: NOSQL_PROGRESS, doc_id: progressId,
      data: { studentId, labId, completed: true, completedAt: now, attempts: 1, score: 100 },
      created_at: now, updated_at: now,
    }, { onConflict: 'collection,doc_id' });
    if (error) throw new Error(`Failed to create lab progress: ${error.message}`);
  }

  const { data: concept, error: conceptErr } = await supabase
    .from('curriculum_hierarchy')
    .select('id')
    .ilike('title', (labDoc as Record<string, unknown>).topic as string)
    .maybeSingle();
  if (conceptErr) throw new Error('Failed to fetch concept: ' + conceptErr.message);
  if (concept) {
    try {
      const { computeMastery } = await import('./adaptive/mastery.service');
      computeMastery(studentId, concept.id, 90).catch((err: unknown) =>
        logger.error('Mastery update failed (lab)', { studentId, labId, error: err })
      );
    } catch (_) { /* mastery non-critical */ }

    try {
      const { data: quizDocs, error: quizErr } = await supabase
        .from('firestore_docs')
        .select('data, doc_id')
        .eq('collection', 'quizV2')
        .filter('data->>conceptId', 'eq', concept.id)
        .limit(1);
      if (quizErr) throw new Error('Failed to fetch quiz: ' + quizErr.message);
      if (quizDocs?.length) {
        const quizId = quizDocs[0].doc_id;
        const { data: progExisting, error: progErr } = await supabase.from('firestore_docs').select('data').eq('collection', NOSQL_PROGRESS).eq('doc_id', progressId).maybeSingle();
        if (progErr) throw new Error('Failed to fetch progress: ' + progErr.message);
        const progData = progExisting?.data as Record<string, unknown> || {};
        const { error } = await supabase.from('firestore_docs').upsert({
          collection: NOSQL_PROGRESS, doc_id: progressId,
          data: { ...progData, quizUnlocked: true, unlockedQuizId: quizId },
          updated_at: now,
        }, { onConflict: 'collection,doc_id' });
        if (error) throw new Error(`Failed to update lab progress: ${error.message}`);
      }
    } catch (_) { /* quiz unlock non-critical */ }
  }

  logger.info('Virtual lab completed', { studentId, labId });
  return { completed: true, labId, studentId };
}

export async function getStudentProgress(studentId: string) {
  const supabase = getSupabaseAdmin();
  const { data: docs, error } = await supabase
    .from('firestore_docs')
    .select('data, doc_id')
    .eq('collection', NOSQL_PROGRESS)
    .filter('data->>studentId', 'eq', studentId);
  if (error) throw new Error('Failed to fetch student progress: ' + error.message);
  return (docs || []).map((doc) => ({ id: doc.doc_id, ...doc.data as Record<string, unknown> }));
}
