import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { nosqlGet, nosqlQuery } from './nosql.service';

export {
  startExamAttempt,
  submitExamAttempt,
  releaseExamGrades,
  getExamResults,
} from './exam-v2-grading.service';

export {
  logProctoringEvent,
  getStudentAttempt,
  getProctoringLogs,
  generateQuestionPaper,
} from './exam-v2-seating.service';

export { createExam, releaseExam } from './exam-v2-create.service';

const EV2 = 'examV2';

async function getConceptsForChapter(_textbookId: string, chapterId: string) {
  const { data: rows, error } = await getSupabaseAdmin().from('concepts').select('*').eq('chapter_id', chapterId);
  if (error) throw error;
  return rows || [];
}

export async function getAvailableTypesForChapter(textbookId: string, chapterId: string) {
  const concepts = await getConceptsForChapter(textbookId, chapterId);
  const conceptIds = concepts.map((c: any) => c.id);
  if (conceptIds.length === 0) return [];
  const { data: rows, error } = await getSupabaseAdmin()
    .from('concept_questions')
    .select('type')
    .in('concept_id', conceptIds);
  if (error) throw error;
  const types = new Set((rows || []).map((r: any) => r.type));
  return Array.from(types);
}

export async function getAvailableTypesForConcept(conceptId: string) {
  const { data: rows, error } = await getSupabaseAdmin()
    .from('concept_questions')
    .select('type')
    .eq('concept_id', conceptId);
  if (error) throw error;
  const types = new Set((rows || []).map((r: any) => r.type));
  return Array.from(types);
}

export async function getExamById(examId: string) {
  const { exists, data } = await nosqlGet(EV2, examId);
  if (!exists || !data) throw new NotFoundError('Exam not found');
  const exam: any = { id: examId, ...data };
  if (!exam.questionCount) {
    if (exam.questions?.length) {
      exam.questionCount = exam.questions.length;
    } else if (exam.questionCountPerConcept && exam.textbookId && exam.chapterId) {
      const concepts = await getConceptsForChapter(exam.textbookId, exam.chapterId);
      exam.questionCount = (exam.questionCountPerConcept as number) * concepts.length;
    }
  }
  return exam;
}

export async function listExamsForClass(classId: string, _schoolId?: string, studentId?: string): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  let items = await nosqlQuery(EV2, { classId });

  if (studentId) {
    items = items.filter((q: any) => {
      if (!q.publishedTo || q.publishedTo === 'class') return true;
      if (q.publishedTo === 'students') return (q.targetStudentIds || []).includes(studentId);
      return true;
    });
  }

  for (const exam of items as any[]) {
    if (!exam.questionCount && exam.questionCountPerConcept && exam.textbookId && exam.chapterId) {
      try {
        const concepts = await getConceptsForChapter(exam.textbookId, exam.chapterId);
        exam.questionCount = (exam.questionCountPerConcept as number) * concepts.length;
      } catch { /* skip */ }
    }
  }

  const chapterIds = [...new Set((items as any[]).map((e: any) => e.chapterId).filter(Boolean))];
  const conceptIds = [...new Set((items as any[]).map((e: any) => e.conceptId).filter(Boolean))];
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

  for (const exam of items as any[]) {
    if (exam.chapterId && chapterMap.has(exam.chapterId)) exam.chapterTitle = chapterMap.get(exam.chapterId);
    if (exam.conceptId && conceptMap.has(exam.conceptId)) exam.conceptTitle = conceptMap.get(exam.conceptId);
  }

  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listExamsForTeacher(teacherId: string, _schoolId?: string): Promise<any[]> {
  const items = await nosqlQuery(EV2, { teacherId });
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
