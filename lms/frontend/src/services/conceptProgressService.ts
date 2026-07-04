import api from './api';

interface ConceptCompletionParams {
  conceptId: string;
  textbookId: string;
  chapterId: string;
  classId: string;
  teacherId: string;
}

/** Toggle completion status for a concept (teacher/class context). */
export async function toggleConceptCompletion(
  { conceptId, textbookId, chapterId, classId, teacherId }: ConceptCompletionParams
): Promise<boolean> {
     const res = await api.post('/concept-progress/toggle', {
       conceptId,
       textbookId,
       chapterId,
       classId,
     });
  return res.data.data?.completed ?? false;
}

/** Get completion status for a specific concept (teacher/class context). */
export async function getConceptCompletionStatus(
  conceptId: string,
  classId: string
): Promise<boolean> {
   const res = await api.get(`/concept-progress/status/${conceptId}/${classId}`);
  return res.data.data?.completed ?? false;
}

/** Get completion map for all concepts in a class (teacher context). */
export async function getClassCompletionStatus(
  classId: string
): Promise<Record<string, boolean>> {
   const res = await api.get(`/concept-progress/class/${classId}`);
  return res.data.data?.completionMap ?? {};
}

/** Get completion progress for a subject (teacher context). */
export async function getSubjectProgress(
  subjectId: string,
  classId: string
): Promise<{ completed: number; total: number }> {
   const res = await api.get(`/concept-progress/subject/${subjectId}/${classId}`);
  return res.data.data ?? { completed: 0, total: 0 };
}