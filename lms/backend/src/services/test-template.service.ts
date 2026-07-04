import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

const TMPL = 'testTemplates';
const QP = 'questionPapers';

async function nGet(col: string, id: string) {
  const { data: row } = await getSupabaseAdmin()!.from('nosql_docs').select('data').eq('collection', col).eq('doc_id', id).maybeSingle();
  return { exists: !!row, data: (row?.data as Record<string, unknown>) ?? null };
}

async function nSet(col: string, id: string, data: Record<string, unknown>) {
  const { error } = await getSupabaseAdmin()!.from('nosql_docs').upsert({
    collection: col, doc_id: id, data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;
}

async function nUpdate(col: string, id: string, updates: Record<string, unknown>) {
  const { data: existing } = await getSupabaseAdmin()!.from('nosql_docs').select('data').eq('collection', col).eq('doc_id', id).maybeSingle();
  const merged = { ...((existing?.data as Record<string, unknown>) || {}), ...updates };
  const { error } = await getSupabaseAdmin()!.from('nosql_docs').upsert({
    collection: col, doc_id: id, data: merged,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;
}

async function nDelete(col: string, id: string) {
  const { error } = await getSupabaseAdmin()!.from('nosql_docs').delete().eq('collection', col).eq('doc_id', id);
  if (error) throw error;
}

async function nQuery(col: string, filters: Record<string, unknown>) {
  let q: any = getSupabaseAdmin()!.from('nosql_docs').select('doc_id, data').eq('collection', col);
  for (const [k, v] of Object.entries(filters)) { q = q.contains('data', { [k]: v }); }
  const { data: rows, error } = await q;
  if (error) throw error;
  return (rows || []).map((r: { doc_id: string; data: unknown }) => ({ id: r.doc_id, ...(r.data as object) }));
}

interface TemplateConfig {
  timeLimitMinutes: number;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showResults: boolean;
}

interface SelectionConfig {
  selectedModels: string[];
  questionCount: number;
  difficultyDistribution: { easy: number; medium: number; hard: number };
  chapterIds?: string[];
  conceptIds?: string[];
}

export async function createTemplate(data: {
  title: string;
  description?: string;
  classId: string;
  subjectId: string;
  createdBy: string;
  config: TemplateConfig;
  source: 'question_paper' | 'question_bank';
  questionPaperId?: string;
  selectionConfig?: SelectionConfig;
}) {
  if (data.source === 'question_paper' && !data.questionPaperId) {
    throw new Error('questionPaperId required when source is question_paper');
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  const templateData: Record<string, unknown> = {
    id, title: data.title, description: data.description || null,
    classId: data.classId, subjectId: data.subjectId,
    createdBy: data.createdBy, config: data.config,
    source: data.source, questionPaperId: data.questionPaperId || null,
    selectionConfig: data.selectionConfig || null,
    status: 'draft', createdAt: now, updatedAt: now,
  };

  await nSet(TMPL, id, templateData);
  logger.info('Test template created', { id, title: data.title });
  return templateData;
}

export async function updateTemplate(id: string, userId: string, data: Partial<{
  title: string; description: string; config: TemplateConfig;
  source: string; questionPaperId: string; selectionConfig: SelectionConfig;
  status: 'draft' | 'active' | 'archived';
}>) {
  const { exists, data: existing } = await nGet(TMPL, id);
  if (!exists || !existing) throw new NotFoundError('Template not found');
  if (existing.createdBy !== userId) throw new ForbiddenError('Not your template');

  const updates: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() };
  Object.keys(updates).forEach((k) => { if (updates[k] === undefined) delete updates[k]; });
  await nUpdate(TMPL, id, updates);
  const updated = await nGet(TMPL, id);
  return { id, ...updated.data };
}

export async function deleteTemplate(id: string, userId: string) {
  const { exists, data: existing } = await nGet(TMPL, id);
  if (!exists || !existing) throw new NotFoundError('Template not found');
  if (existing.createdBy !== userId) throw new ForbiddenError('Not your template');
  await nDelete(TMPL, id);
  logger.info('Template deleted', { id });
}

export async function getTemplate(id: string) {
  const { exists, data } = await nGet(TMPL, id);
  if (!exists || !data) throw new NotFoundError('Template not found');
  return { id, ...data };
}

export async function listTemplates(params: {
  classId?: string; subjectId?: string; createdBy?: string; status?: string;
}) {
  const filters: Record<string, unknown> = {};
  if (params.classId) filters.classId = params.classId;
  if (params.subjectId) filters.subjectId = params.subjectId;
  if (params.createdBy) filters.createdBy = params.createdBy;
  if (params.status) filters.status = params.status;
  const results = await nQuery(TMPL, filters);
  results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}

export async function compilePaper(data: {
  templateId: string;
  textbookId?: string;
  chapterId?: string;
  conceptId?: string;
  userId: string;
}) {
  const supabase = getSupabaseAdmin()!;
  const { data: template } = await nGet(TMPL, data.templateId);
  if (!template) throw new NotFoundError('Template not found');
  const t = template as any;

  const textbookId = data.textbookId || t.selectionConfig?.textbookId;
  const chapterId = data.chapterId || t.selectionConfig?.chapterId;
  const conceptId = data.conceptId || t.selectionConfig?.conceptId;
  if (!textbookId || !chapterId || !conceptId) {
    throw new Error('textbookId, chapterId, and conceptId are required to compile. Update the template with a textbook, chapter, and concept selection first.');
  }

  const targetCount = t.selectionConfig?.questionCount || 5;
  const difficultyDistribution = t.selectionConfig?.difficultyDistribution || { easy: 40, medium: 40, hard: 20 };

  const { data: conceptRow } = await supabase.from('concepts').select('*').eq('id', conceptId).maybeSingle();
  if (!conceptRow) throw new NotFoundError('Concept not found');

  const { data: questionRows } = await supabase.from('concept_questions').select('*').eq('concept_id', conceptId);
  const questionBank = (questionRows || []).map((r: any) => ({ ...r, id: r.id }));

  const selectedModels: string[] = t.selectionConfig?.selectedModels || [];
  const allowedFormats = selectedModels.length > 0
    ? selectedModels.map((m: string) =>
        m === 'multiple_choice' ? 'mcq' :
        m === 'true_false' ? 'true_false' :
        m === 'fill_blank' ? 'fill_blank' :
        m === 'matching' ? 'matching' :
        m === 'numerical' ? 'numerical' :
        m === 'descriptive' ? 'descriptive' :
        m === 'passage' ? 'passage' : m
      )
    : ['mcq', 'true_false', 'fill_blank', 'matching', 'numerical', 'descriptive', 'passage'];
  let filtered = questionBank.filter((q: any) => allowedFormats.includes(q.type));

  const adapted = filtered.map((q: any) => {
    const cloned = { ...q };
    if (cloned.type === 'mcq' && allowedFormats.includes('fill_blank') && !allowedFormats.includes('mcq')) {
      cloned.type = 'fill_blank';
      cloned.text = `${cloned.text} (Answer: ____________)`;
      delete cloned.options;
    }
    if (cloned.type === 'true_false' && allowedFormats.includes('mcq') && !allowedFormats.includes('true_false')) {
      cloned.type = 'mcq';
      cloned.text = `Is the following statement True or False: ${cloned.text}`;
      cloned.options = ['True', 'False'];
    }
    return cloned;
  });

  const easyQ = adapted.filter((q: any) => q.difficulty === 'easy');
  const mediumQ = adapted.filter((q: any) => q.difficulty === 'medium');
  const hardQ = adapted.filter((q: any) => q.difficulty === 'hard' || q.difficulty === 'hots');

  const selectedQuestions: any[] = [];
  selectedQuestions.push(...easyQ.slice(0, difficultyDistribution.easy || 0));
  selectedQuestions.push(...mediumQ.slice(0, difficultyDistribution.medium || 0));
  selectedQuestions.push(...hardQ.slice(0, difficultyDistribution.hard || 0));

  const remainingTarget = targetCount - selectedQuestions.length;
  if (remainingTarget > 0) {
    const alreadySelectedIds = new Set(selectedQuestions.map((q: any) => q.id));
    const leftovers = adapted.filter((q: any) => !alreadySelectedIds.has(q.id));
    selectedQuestions.push(...leftovers.slice(0, remainingTarget));
  }

  if (t.config?.shuffleQuestions !== false) {
    selectedQuestions.sort(() => Math.random() - 0.5);
  }

  const paperId = uuidv4();
  const now = new Date().toISOString();

  const paperData: Record<string, unknown> = {
    id: paperId, templateId: data.templateId, conceptId, chapterId, textbookId,
    questions: selectedQuestions,
    totalPoints: selectedQuestions.reduce((sum: number, q: any) => sum + (q.points || 0), 0),
    createdBy: data.userId, createdAt: now, updatedAt: now,
  };

  await nSet(QP, paperId, paperData);
  logger.info('Question paper compiled from template', { paperId, templateId: data.templateId, questionCount: selectedQuestions.length });
  return paperData;
}
