import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { nosqlGet, nosqlUpdate } from './nosql.service';

const POINTS_BY_DIFFICULTY: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
const EAV2 = 'examAttemptV2';

async function getConceptsForChapter(_textbookId: string, chapterId: string) {
  const { data: rows, error } = await getSupabaseAdmin().from('concepts').select('*').eq('chapter_id', chapterId);
  if (error) throw error;
  return rows || [];
}

export async function logProctoringEvent(attemptId: string, studentId: string, eventData: { event: string; timestamp?: string }) {
  const attempt = (await nosqlGet(EAV2, attemptId)).data as Record<string, unknown> | null;
  if (!attempt) throw new NotFoundError('Attempt not found');
  if (attempt.studentId !== studentId) throw new ForbiddenError('Not your attempt');

  const logEntry = { id: uuidv4(), event: eventData.event, timestamp: eventData.timestamp || new Date().toISOString() };
  const logs = ((attempt.proctoringLogs as Array<Record<string, unknown>>) || []);
  logs.push(logEntry);
  await nosqlUpdate(EAV2, attemptId, { proctoringLogs: logs });
  return logEntry;
}

export async function getStudentAttempt(examId: string, studentId: string) {
  const { nosqlQuery } = await import('./nosql.service');
  const attempts = await nosqlQuery(EAV2, { examId, studentId });
  return attempts.length > 0 ? attempts[0] : null;
}

export async function getProctoringLogs(attemptId: string) {
  const attempt = (await nosqlGet(EAV2, attemptId)).data as Record<string, unknown> | null;
  if (!attempt) return [];
  return (attempt.proctoringLogs as Array<Record<string, unknown>>) || [];
}

export async function generateQuestionPaper(data: {
  textbookId: string;
  chapterId: string;
  distribution: Record<string, Record<string, number>>;
  teacherId: string;
  classId: string;
}) {
  const { textbookId, chapterId, distribution } = data;
  const concepts = await getConceptsForChapter(textbookId, chapterId);
  if (concepts.length === 0) throw new NotFoundError('No concepts found in this chapter');

  const conceptIds = concepts.map((c: any) => c.id);

  const supabase = getSupabaseAdmin();
  const { data: allQuestions, error } = await supabase!
    .from('concept_questions')
    .select('*')
    .in('concept_id', conceptIds);
  if (error) throw error;

  const selected: Array<Record<string, unknown>> = [];
  const usedIds = new Set<string>();

  for (const [difficulty, typeCounts] of Object.entries(distribution)) {
    for (const [type, count] of Object.entries(typeCounts)) {
      const candidates = (allQuestions || []).filter(
        (q: any) => q.difficulty === difficulty && q.type === type && !usedIds.has(q.id),
      );

      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      const taken = shuffled.slice(0, count as number);

      for (const q of taken) {
        selected.push({
          id: q.id,
          type: q.type,
          text: q.question || q.text,
          options: q.options,
          correctAnswer: q.correct_answer || q.correctAnswer || q.answer || '',
          explanation: q.explanation,
          difficulty: q.difficulty || 'medium',
          points: q.points || POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1,
          conceptId: q.concept_id,
          bloomLevel: q.bloom_level || null,
          hots: q.hots === true || q.hots === 'true' || false,
          topic: q.topic || null,
        });
        usedIds.add(q.id);
      }
    }
  }

  return {
    questions: selected,
    totalPoints: selected.reduce((sum, q) => sum + (q.points as number), 0),
    questionCount: selected.length,
    distribution,
  };
}
