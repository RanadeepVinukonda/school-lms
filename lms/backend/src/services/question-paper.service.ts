import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { nosqlGet, nosqlSet, nosqlUpdate, nosqlDelete } from './nosql.service';

const QP = 'questionPapers';
const QB = 'questionBank';

interface SectionQuestion {
  questionId: string;
  points: number;
  order: number;
}

interface Section {
  title: string;
  instructions?: string;
  questions: SectionQuestion[];
}

interface SectionInput {
  title: string;
  instructions?: string;
  questionIds: string[];
  pointsPerQuestion?: number;
}

export async function createPaper(data: {
  title: string;
  description?: string;
  classId: string;
  subjectId: string;
  createdBy: string;
  sections: SectionInput[];
  duration?: number;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin()!;
  let totalPoints = 0;

  const sections: Section[] = await Promise.all(data.sections.map(async (sec) => {
    const questions: SectionQuestion[] = [];
    for (let qi = 0; qi < sec.questionIds.length; qi++) {
      const qId = sec.questionIds[qi];
      const { data: qRow } = await supabase.from('firestore_docs').select('data').eq('collection', QB).eq('doc_id', qId).maybeSingle();
      const qData = qRow?.data as Record<string, unknown> | undefined;
      const pts = sec.pointsPerQuestion || (qData ? (qData.points as number) || 1 : 1);
      questions.push({ questionId: qId, points: pts, order: qi });
      totalPoints += pts;
    }
    return { title: sec.title, instructions: sec.instructions, questions };
  }));

  const paperData: Record<string, unknown> = {
    id, title: data.title, description: data.description || null,
    classId: data.classId, subjectId: data.subjectId,
    createdBy: data.createdBy, sections,
    totalPoints, duration: data.duration || null,
    status: 'draft',
    createdAt: now, updatedAt: now,
  };

  await nosqlSet(QP, id, paperData);
  logger.info('Question paper created', { id, title: data.title });
  return paperData;
}

export async function updatePaper(id: string, userId: string, data: Partial<{
  title: string; description: string; duration: number; status: 'draft' | 'ready';
}>) {
  const { exists, data: docData } = await nosqlGet(QP, id);
  if (!exists || !docData) throw new NotFoundError('Question paper not found');
  if (docData.createdBy !== userId) throw new ForbiddenError('Not your paper');

  const updates: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() };
  Object.keys(updates).forEach((k) => { if (updates[k] === undefined) delete updates[k]; });
  await nosqlUpdate(QP, id, updates);
  const updated = await nosqlGet(QP, id);
  return { id, ...updated.data };
}

export async function deletePaper(id: string, userId: string) {
  const { exists, data: docData } = await nosqlGet(QP, id);
  if (!exists || !docData) throw new NotFoundError('Question paper not found');
  if (docData.createdBy !== userId) throw new ForbiddenError('Not your paper');
  await nosqlDelete(QP, id);
  logger.info('Question paper deleted', { id });
}

export async function getPaper(id: string) {
  const { exists, data } = await nosqlGet(QP, id);
  if (!exists || !data) throw new NotFoundError('Question paper not found');
  return { id, ...data };
}

export async function listPapers(params: {
  classId?: string; subjectId?: string; createdBy?: string; status?: string;
}) {
  const supabase = getSupabaseAdmin()!;
  let q: any = supabase.from('firestore_docs').select('*').eq('collection', QP);

  if (params.classId) q = q.contains('data', { classId: params.classId });
  if (params.subjectId) q = q.contains('data', { subjectId: params.subjectId });
  if (params.createdBy) q = q.contains('data', { createdBy: params.createdBy });
  if (params.status) q = q.contains('data', { status: params.status });

  const { data: rows, error } = await q;
  if (error) throw error;

  const results = (rows || []).map((r: any) => ({ id: r.doc_id, ...r.data }));
  results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}
