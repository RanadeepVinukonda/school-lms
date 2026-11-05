import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { createBulkNotifications } from './notification.service';
import { nosqlGet, nosqlUpdate, nosqlDelete, nosqlQuery } from './nosql.service';

export const QV2 = 'quizV2';
export const QAV2 = 'quizAttemptV2';

export {
  fallbackText, TYPE_MAP, ALL_QUESTION_TYPES, resolveTypes,
  POINTS_BY_DIFFICULTY, getConcept, getConceptQuestions, upsertQuestions,
} from './quiz-v2-question.service';

export { getQuizResults } from './quiz-v2-grading.service';
export { createQuiz } from './quiz-v2-create.service';
export { gatherQuizQuestions } from './quiz-v2-ai-picker.service';

export async function updateQuiz(quizId: string, teacherId: string, data: Record<string, unknown>) {
  const { exists, data: quizData } = await nosqlGet(QV2, quizId);
  if (!exists || !quizData) throw new NotFoundError('Quiz not found');
  if (quizData.teacherId !== teacherId) throw new ForbiddenError('You do not own this quiz');

  const allowed = ['title', 'timeLimitMinutes', 'passingScore', 'maxAttempts', 'shuffleQuestions', 'showResults', 'description'];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if (data[key] !== undefined) updates[key] = data[key];
  }

  await nosqlUpdate(QV2, quizId, updates);
  const updated = await nosqlGet(QV2, quizId);
  logger.info('Quiz V2 updated', { quizId, teacherId, updates: Object.keys(updates) });
  return { id: quizId, ...updated.data };
}

export async function releaseQuiz(quizId: string, teacherId: string) {
  const { exists, data: quizData } = await nosqlGet(QV2, quizId);
  if (!exists || !quizData) throw new NotFoundError('Quiz not found');
  if (quizData.teacherId !== teacherId) throw new ForbiddenError('You do not own this quiz');

  const now = new Date().toISOString();
  await nosqlUpdate(QV2, quizId, { releasedAt: now, updatedAt: now });

  try {
    const quizTitle = (quizData.title as string) || 'Untitled Quiz';
    const publishedTo = (quizData.publishedTo as string) || 'class';
    const targetStudentIds = (quizData.targetStudentIds as string[]) || [];

    if (publishedTo === 'students' && targetStudentIds.length > 0) {
      const studentNotifs = targetStudentIds.map((sid: string) => ({
        userId: sid, type: 'quiz', title: 'New Quiz Assigned',
        body: `Your teacher assigned Quiz: ${quizTitle}.`,
        data: { quizId, link: `/quizzes/${quizId}` },
      }));
      await createBulkNotifications(studentNotifs);
    } else if (publishedTo === 'class' && quizData.classId) {
      const supabase = getSupabaseAdmin()!;
      const { data: students } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'student')
        .contains('class_ids', [(quizData.classId as string)]);
      if (students && students.length > 0) {
        const studentNotifs = students.map((s: any) => ({
          userId: s.id, type: 'quiz', title: 'New Quiz Assigned',
          body: `Your teacher assigned Quiz: ${quizTitle}.`,
          data: { quizId, link: `/quizzes/${quizId}` },
        }));
        await createBulkNotifications(studentNotifs);
      }
    }
  } catch (err) {
    logger.warn('Failed to send quiz release notifications', { quizId, error: err });
  }

  const updated = await nosqlGet(QV2, quizId);
  logger.info('Quiz V2 released', { quizId, teacherId });
  return { id: quizId, ...updated.data };
}

export async function releaseQuizGrades(quizId: string, showResults: boolean) {
  const { exists } = await nosqlGet(QV2, quizId);
  if (!exists) throw new NotFoundError('Quiz not found');
  await nosqlUpdate(QV2, quizId, { showResults, updatedAt: new Date().toISOString() });
  logger.info('Quiz V2 grades release toggled', { quizId, showResults });
  const updated = await nosqlGet(QV2, quizId);
  return { id: quizId, ...updated.data };
}

export async function getQuizById(quizId: string) {
  const { exists, data } = await nosqlGet(QV2, quizId);
  if (!exists || !data) throw new NotFoundError('Quiz not found');
  return { id: quizId, ...data };
}

export async function listQuizzesForClass(classId: string, _schoolId?: string, studentId?: string): Promise<any[]> {
  const supabase = getSupabaseAdmin()!;
  let items = await nosqlQuery(QV2, { classId });

  if (studentId) {
    items = items.filter((q: any) => {
      if (!q.publishedTo || q.publishedTo === 'class') return true;
      if (q.publishedTo === 'students') return (q.targetStudentIds || []).includes(studentId);
      return true;
    });
  }

  const resolvedItems = await Promise.all(
    items.map(async (item: any) => {
      if (!item.subjectId && item.textbookId) {
        try {
          const { data: tb } = await supabase.from('textbooks').select('subject_id').eq('id', item.textbookId).maybeSingle();
          if (tb) item.subjectId = tb.subject_id;
        } catch (err) { logger.error('Failed to resolve fallback subjectId for quiz', { quizId: item.id, err }); }
      }
      if (item.subjectId) {
        try {
          const { data: sub } = await supabase.from('subjects').select('name').eq('id', item.subjectId).maybeSingle();
          if (sub) item.subjectName = sub.name;
        } catch (err) { logger.error('Failed to resolve subject name', { quizId: item.id, subjectId: item.subjectId, err }); }
      }
      return item;
    })
  );

  const chapterIds = [...new Set(resolvedItems.map((q: any) => q.chapterId).filter(Boolean))];
  const conceptIds = [...new Set(resolvedItems.map((q: any) => q.conceptId).filter(Boolean))];
  const chapterMap = new Map<string, string>();
  const conceptMap = new Map<string, string>();

  if (chapterIds.length > 0) {
    const { data } = await supabase.from('chapters').select('id, title').in('id', chapterIds);
    (data || []).forEach((r: any) => chapterMap.set(r.id, r.title));
  }
  if (conceptIds.length > 0) {
    const { data } = await supabase.from('concepts').select('id, title').in('id', conceptIds);
    (data || []).forEach((r: any) => conceptMap.set(r.id, r.title));
  }

  for (const q of resolvedItems) {
    if (q.chapterId && chapterMap.has(q.chapterId)) q.chapterTitle = chapterMap.get(q.chapterId);
    if (q.conceptId && conceptMap.has(q.conceptId)) q.conceptTitle = conceptMap.get(q.conceptId);
  }

  return resolvedItems.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listQuizzesForTeacher(teacherId: string, _schoolId?: string): Promise<any[]> {
  const items = await nosqlQuery(QV2, { teacherId });
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getQuizForConcept(conceptId: string) {
  const items = await nosqlQuery(QV2, { conceptId });
  return items.map((d: any) => ({ id: d.id, ...d }));
}

export async function republishQuiz(quizId: string, teacherId: string) {
  const { exists, data: quizData } = await nosqlGet(QV2, quizId);
  if (!exists || !quizData) throw new NotFoundError('Quiz not found');
  if (quizData.teacherId !== teacherId) throw new ForbiddenError('You do not own this quiz');

  const now = new Date().toISOString();
  await nosqlUpdate(QV2, quizId, { isRepublished: true, updatedAt: now });
  const updated = await nosqlGet(QV2, quizId);
  logger.info('Quiz V2 republished (interactive mode enabled)', { quizId, teacherId });
  return { id: quizId, ...updated.data };
}

export async function deleteQuiz(quizId: string, teacherId: string) {
  const { exists, data: quizData } = await nosqlGet(QV2, quizId);
  if (!exists || !quizData) throw new NotFoundError('Quiz not found');
  if (quizData.teacherId !== teacherId) throw new ForbiddenError('You do not own this quiz');

  const attempts = await nosqlQuery(QAV2, { quizId });
  for (const a of attempts) {
    await nosqlDelete(QAV2, (a as any).id);
  }
  await nosqlDelete(QV2, quizId);
  logger.info('Quiz V2 deleted', { quizId, teacherId, attemptsDeleted: attempts.length });
}

export { startQuizAttempt, submitQuizAttempt, getQuizAttemptsForStudent } from './quiz-v2-attempt.service';
