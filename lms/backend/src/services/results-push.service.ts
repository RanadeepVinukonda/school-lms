import { getSupabaseClient } from './supabase';
import { ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

const COLLECTION_MAP: Record<string, string> = {
  quiz: 'quizV2', assignment: 'assignmentV2', exam: 'examV2',
};

async function updateShowResults(collection: string, docId: string, data: Record<string, unknown>, now: string) {
  const supabase = getSupabaseClient()!;
  const merged = { ...data, showResults: true, updatedAt: now };
  const { error } = await supabase.from('nosql_docs').update({ data: merged, updated_at: now })
    .eq('collection', collection).eq('doc_id', docId);
  if (error) throw new Error(`Failed to update show results: ${error.message}`);
}

export async function releaseAssessmentsForClass(classId: string, teacherId: string, options?: { type?: 'quiz' | 'assignment' | 'exam' }) {
  const supabase = getSupabaseClient()!;
  const now = new Date().toISOString();
  let updatedCount = 0;

  const types: Array<'quiz' | 'assignment' | 'exam'> = options?.type ? [options.type] : ['quiz', 'assignment', 'exam'];

  for (const type of types) {
    const coll = COLLECTION_MAP[type];
    const { data: rows, error } = await supabase.from('nosql_docs').select('doc_id, data')
      .eq('collection', coll)
      .contains('data', { classId, teacherId });
    if (error) throw new Error('Failed to fetch assessments: ' + error.message);

    for (const row of rows || []) {
      const itemData = row.data as Record<string, unknown>;
      if (itemData.showResults === true) continue;
      await updateShowResults(coll, row.doc_id, itemData, now);
      updatedCount++;
    }
  }

  logger.info('Batch results released', { classId, teacherId, updatedCount });
  return { updatedCount };
}

export async function releaseSingleAssessment(assessmentId: string, type: 'quiz' | 'assignment' | 'exam', teacherId: string) {
  const supabase = getSupabaseClient()!;
  const coll = COLLECTION_MAP[type];
  const { data, error } = await supabase.from('nosql_docs').select('data')
    .eq('collection', coll).eq('doc_id', assessmentId).maybeSingle();
  if (error) throw new Error('Failed to fetch assessment: ' + error.message);

  if (!data) throw new Error(`${type} not found`);

  const itemData = data.data as Record<string, unknown>;
  if (itemData.teacherId !== teacherId) {
    throw new ForbiddenError('You do not own this assessment');
  }

  await updateShowResults(coll, assessmentId, itemData, new Date().toISOString());

  logger.info('Single assessment results released', { assessmentId, type, teacherId });
  return { id: assessmentId, type, showResults: true };
}
