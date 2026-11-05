import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { TransactionManager } from '../database/transaction-manager';
import { nosqlGet, nosqlUpdate, nosqlDelete } from './nosql.service';

interface CreateQuestionData {
  text: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'matching' | 'essay';
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
  tags?: string[];
  classId: string;
  subjectId: string;
  chapterId?: string;
  conceptId?: string;
  isPreviousYear?: boolean;
  year?: string;
  source?: string;
  bloomLevel?: string;
  hots?: boolean;
  topic?: string;
  language?: string;
}

const QB = 'questionBank';

export async function createQuestion(data: CreateQuestionData & { createdBy: string }) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const questionData: Record<string, unknown> = {
    id,
    ...data,
    tags: data.tags || [],
    isPreviousYear: data.isPreviousYear ?? false,
    year: data.year || null,
    chapterId: data.chapterId || null,
    conceptId: data.conceptId || null,
    explanation: data.explanation || null,
    source: data.source || 'Manual',
    bloomLevel: data.bloomLevel || null,
    hots: data.hots === true || false,
    topic: data.topic || null,
    language: data.language || 'en',
    createdAt: now,
    updatedAt: now,
  };

  const supabase = getSupabaseAdmin()!;
  const { error } = await supabase.from('firestore_docs').upsert({
    collection: QB, doc_id: id, data: questionData,
    updated_at: now,
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;

  logger.info('Question created', { id, type: data.type, difficulty: data.difficulty });
  return questionData;
}

export async function bulkCreateQuestions(questions: CreateQuestionData[], createdBy: string) {
  const now = new Date().toISOString();
  const results: any[] = [];

  for (const q of questions) {
    const id = uuidv4();
    const data = {
      id, ...q,
      tags: q.tags || [],
      isPreviousYear: q.isPreviousYear ?? false,
      year: q.year || null,
      chapterId: q.chapterId || null,
      conceptId: q.conceptId || null,
      explanation: q.explanation || null,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
    results.push(data);
  }

  const tm = new TransactionManager();
  await tm.runTransaction(async (tx) => {
    for (const r of results) {
      tx.set('questionBank', r.id, r);
    }
  });

  logger.info(`Bulk created ${results.length} questions`);
  return results;
}

export async function updateQuestion(id: string, userId: string, data: Partial<CreateQuestionData>) {
  const { exists, data: docData } = await nosqlGet(QB, id);
  if (!exists || !docData) throw new NotFoundError('Question not found');
  if (docData.createdBy !== userId) throw new ForbiddenError('You can only edit your own questions');

  const updates: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() };
  Object.keys(updates).forEach((k) => { if (updates[k] === undefined) delete updates[k]; });

  await nosqlUpdate(QB, id, updates);
  const updated = await nosqlGet(QB, id);
  return { id, ...updated.data };
}

export async function deleteQuestion(id: string, userId: string) {
  const { exists, data: docData } = await nosqlGet(QB, id);
  if (!exists || !docData) throw new NotFoundError('Question not found');
  if (docData.createdBy !== userId) throw new ForbiddenError('You can only delete your own questions');
  await nosqlDelete(QB, id);
  logger.info('Question deleted', { id });
}

export async function getQuestion(id: string) {
  const { exists, data } = await nosqlGet(QB, id);
  if (!exists || !data) throw new NotFoundError('Question not found');
  return { id, ...data };
}

export async function listQuestions(params: {
  classId?: string;
  subjectId?: string;
  type?: string;
  difficulty?: string;
  isPreviousYear?: boolean | string;
  year?: string;
  createdBy?: string;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}) {
  const supabase = getSupabaseAdmin()!;
  let q: any = supabase.from('firestore_docs').select('*').eq('collection', QB);

  if (params.classId) q = q.contains('data', { classId: params.classId });
  if (params.subjectId) q = q.contains('data', { subjectId: params.subjectId });
  if (params.type) q = q.contains('data', { type: params.type });
  if (params.difficulty) q = q.contains('data', { difficulty: params.difficulty });
  if (params.isPreviousYear !== undefined) {
    const isPyq = params.isPreviousYear === true || params.isPreviousYear === 'true';
    q = q.contains('data', { isPreviousYear: isPyq });
  }
  if (params.year) q = q.contains('data', { year: params.year });
  if (params.createdBy) q = q.contains('data', { createdBy: params.createdBy });
  if (params.tags?.length) q = q.overlaps('data', { tags: params.tags });

  const { data: rows, error } = await q;
  if (error) throw error;

  let results = (rows || []).map((r: any) => ({ id: r.doc_id, ...r.data }));
  results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (params.search) {
    const sq = params.search.toLowerCase();
    results = results.filter((r: any) => r.title?.toLowerCase().includes(sq) || r.questionText?.toLowerCase().includes(sq) || r.instruction?.toLowerCase().includes(sq));
  }

  const page = params.page || 1;
  const limit = params.limit || 50;
  const offsetVal = (page - 1) * limit;
  const paginated = results.slice(offsetVal, offsetVal + limit);

  return { items: paginated, total: results.length, page, limit };
}

export async function importFromConcept(_textbookId: string, _chapterId: string, conceptId: string, userId: string) {
  const existingResult = await listQuestions({ createdBy: userId });
  const existingTexts = new Set(existingResult.items.map((q: any) => q.text));

  const supabase = getSupabaseAdmin()!;
  const { data: conceptRow } = await supabase.from('concepts').select('*').eq('id', conceptId).maybeSingle();
  if (!conceptRow) return { imported: 0 };

  const { data: questionRows } = await supabase.from('concept_questions').select('*').eq('concept_id', conceptId);
  const bank = (questionRows || []).map((r: any) => ({ id: r.id, ...r.data, ...r }));
  let imported = 0;

  for (const q of bank) {
    if (existingTexts.has(q.text || q.question)) continue;
    await createQuestion({
      text: q.text || q.question,
      type: mapType(q.type),
      difficulty: q.difficulty || 'medium',
      options: q.options,
      correctAnswer: q.correctAnswer || q.answer || '',
      explanation: q.explanation,
      points: q.points || 1,
      tags: [q.category].filter(Boolean),
      classId: '',
      subjectId: '',
      conceptId,
      source: q.source || q.data?.source || 'Imported from Concept',
      bloomLevel: q.bloom_level || q.data?.bloomLevel || null,
      hots: q.hots === true || q.hots === 'true' || q.data?.hots === true || false,
      topic: q.topic || q.data?.topic || null,
      createdBy: userId,
    });
    imported++;
  }

  logger.info('Questions imported from concept', { conceptId, imported });
  return { imported };
}

function mapType(type: string): CreateQuestionData['type'] {
  const map: Record<string, CreateQuestionData['type']> = {
    mcq: 'multiple_choice',
    multiple_choice: 'multiple_choice',
    true_false: 'true_false',
    fill_blank: 'fill_blank',
    short_answer: 'short_answer',
    long_answer: 'essay',
    numerical: 'short_answer',
    scenario: 'essay',
    matching: 'matching',
    essay: 'essay',
  };
  return map[type] || 'multiple_choice';
}
