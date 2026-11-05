import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { nosqlGet, nosqlUpdate, nosqlQuery } from './nosql.service';

const QV2 = 'quizV2';
const QAV2 = 'quizAttemptV2';

export async function getTestResults(testId: string, studentId: string, isPrivileged = false): Promise<any[]> {
  const nq = await nosqlGet(QV2, testId);
  const testData = nq.data as Record<string, unknown> | null;
  if (!testData) throw new NotFoundError('Test not found');

  const resultsGated = !(testData.showResults as boolean);
  const attempts = await (isPrivileged ? nosqlQuery(QAV2, { quizId: testId }) : nosqlQuery(QAV2, { quizId: testId, studentId }));
  const sorted = attempts.sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const studentNames = new Map<string, string>();
  if (isPrivileged) {
    const studentIds = [...new Set(sorted.map((a: any) => a.studentId))] as string[];
    const { data: rows } = await getSupabaseAdmin().from('users').select('id, display_name, email').in('id', studentIds);
    if (rows) { for (const r of rows) studentNames.set(r.id, r.display_name || r.email || 'Unknown'); }
  }

  return sorted.map((data: any) => {
    const enriched = { ...data, studentName: studentNames.get(data.studentId) || null };
    if (!isPrivileged && resultsGated && data.status === 'completed') {
      return {
        id: data.id, quizId: data.quizId, studentId: data.studentId, studentName: null,
        testType: data.testType, score: data.score, totalPoints: data.totalPoints,
        percentage: data.percentage, passed: data.passed, timeSpent: data.timeSpent,
        startedAt: data.startedAt, submittedAt: data.submittedAt, status: data.status,
        level: data.level,
        answers: (data.answers || []).map((a: { questionId: string; pointsEarned: number }) => ({ questionId: a.questionId, pointsEarned: a.pointsEarned })),
      };
    }
    return enriched;
  });
}

export async function getTestAttemptsForStudent(studentId: string): Promise<any[]> {
  const attempts = await nosqlQuery(QAV2, { studentId });
  const testIds = [...new Set(attempts.map((a: any) => a.quizId))] as string[];

  const testMeta = new Map<string, { title: string; subjectName: string; subjectId: string }>();
  for (const tid of testIds) {
    const nq2 = await nosqlGet(QV2, tid);
    const data = nq2.data as Record<string, unknown> | null;
    if (data) {
      const d = data as any;
      testMeta.set(tid, { title: d.title || 'Untitled', subjectName: d.subjectName || d.subjectId || 'Unknown', subjectId: d.subjectId || '' });
    }
  }

  return attempts.map((a: any) => {
    const meta = testMeta.get(a.quizId) || { title: 'Untitled', subjectName: 'Unknown', subjectId: '' };
    return { ...a, testTitle: meta.title, subjectName: meta.subjectName, subjectId: meta.subjectId };
  }).sort((a: any, b: any) => new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime());
}

export async function getClassAttempts(classId: string): Promise<any[]> {
  const items = await nosqlQuery(QV2, { classId });
  const testTitles = new Map(items.map((t: any) => [t.id, t.title || 'Untitled']));
  const testIds = items.map((t: any) => t.id);

  if (testIds.length === 0) return [];

  const allAttempts: any[] = [];
  for (const testId of testIds) {
    const attempts = await nosqlQuery(QAV2, { quizId: testId });
    for (const a of attempts) {
      allAttempts.push({ ...a, testTitle: testTitles.get(testId) || 'Untitled' });
    }
  }

  const studentIds = [...new Set(allAttempts.map((a: any) => a.studentId))] as string[];
  const { data: rows } = await getSupabaseAdmin().from('users').select('id, display_name, email').in('id', studentIds);
  const studentNames = new Map<string, string>();
  if (rows) { for (const r of rows) studentNames.set(r.id, r.display_name || r.email || 'Unknown'); }

  return allAttempts.map((a: any) => ({
    ...a, studentName: studentNames.get(a.studentId) || null,
  })).sort((a: any, b: any) => new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime());
}

export async function releaseResults(testId: string, showResults: boolean, teacherId?: string) {
  const { exists, data: existing } = await nosqlGet(QV2, testId);
  if (!exists || !existing) throw new NotFoundError('Test not found');
  if (teacherId && existing.teacherId !== teacherId) throw new NotFoundError('Not your test');

  await nosqlUpdate(QV2, testId, { showResults, updatedAt: new Date().toISOString() });
  const updated = await nosqlGet(QV2, testId);
  return { id: testId, ...updated.data };
}
