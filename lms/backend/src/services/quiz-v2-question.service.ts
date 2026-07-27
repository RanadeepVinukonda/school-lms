import { getSupabaseAdmin } from './supabase';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const POINTS_BY_DIFFICULTY: Record<string, number> = { easy: 1, medium: 2, hard: 3, hots: 4 };

export const TYPE_MAP: Record<string, string[]> = {
  multiple_choice: ['mcq', 'multiple_choice'],
  true_false: ['true_false'],
  fill_blank: ['fill_blank'],
  short_answer: ['short_answer'],
  matching: ['matching'],
};

export const ALL_QUESTION_TYPES = ['mcq', 'multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'matching'];

export function fallbackText(type: string, _options: any): string {
  if (type === 'mcq') return 'Choose the correct answer';
  if (type === 'true_false') return 'State whether true or false';
  if (type === 'fill_blank') return 'Fill in the blank';
  if (type === 'matching') return 'Match the following items';
  if (type === 'numerical') return 'Calculate the answer';
  return 'Answer the following question';
}

export function resolveTypes(selectedModels: string[]): string[] {
  if (!selectedModels || selectedModels.length === 0) return [];
  return selectedModels.flatMap((m) => TYPE_MAP[m] || [m]);
}

export async function getConcept(_textbookId: string, _chapterId: string, conceptId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: c, error } = await supabase.from('concepts').select('*').eq('id', conceptId).maybeSingle();
  if (error) {
    logger.error('getConcept failed', { conceptId, error: error.message, details: error.details, hint: error.hint, code: error.code });
    throw new AppError(500, `Failed to fetch concept: ${error.message}`);
  }
  return c;
}

export async function getConceptQuestions(conceptId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new AppError(500, 'Supabase admin not configured');
  const { data: rows, error } = await supabase.from('concept_questions').select('*').eq('concept_id', conceptId);
  if (error) {
    logger.error('getConceptQuestions failed', { conceptId, error: error.message, details: error.details, hint: error.hint, code: error.code });
    throw new AppError(500, `Failed to fetch concept questions: ${error.message}`);
  }
  return rows || [];
}

export async function upsertQuestions(questions: Array<Record<string, unknown>>, conceptId: string, textbookId?: string, chapterId?: string) {
  const supabase = getSupabaseAdmin()!;
  for (const q of questions) {
    const { error } = await supabase.from('concept_questions').upsert({
      id: q.id as string,
      concept_id: conceptId,
      textbook_id: textbookId || (q.textbook_id as string) || '',
      chapter_id: chapterId || (q.chapter_id as string) || '',
      type: q.type as string,
      question: (q.question || q.text) as string,
      options: q.options || null,
      answer: (q.answer || q.correctAnswer) as string,
      explanation: q.explanation || null,
      difficulty: (q.difficulty as string) || 'medium',
      points: (q.points as number) || 1,
      bloom_level: (q.bloomLevel as string) || null,
      hots: q.hots === true || q.hots === 'true' || false,
      topic: (q.topic as string) || null,
      source: (q.source as string) || 'AI Quiz Generation',
      data: q,
    }, { onConflict: 'id' });
    if (error) {
      logger.error('upsertQuestions failed', { conceptId, questionId: q.id, error: error.message, details: error.details, hint: error.hint, code: error.code });
      throw new AppError(500, `Failed to save question: ${error.message}`);
    }
  }
}
