import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';
import { getCurrentAcademicYear } from './academic-year.service';

function safePct(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

async function getAssessmentData(type: 'quiz' | 'assignment' | 'exam') {
  const supabase = getSupabaseAdmin()!;
  const collectionName = type === 'quiz' ? 'quizV2' : type === 'assignment' ? 'assignmentV2' : 'examV2';
  const { data: docs, error: docsErr } = await supabase
    .from('firestore_docs')
    .select('data, doc_id')
    .eq('collection', collectionName);
  if (docsErr) throw new Error(docsErr.message);
  const assessments = (docs || []).map((d: any) => ({ ...d.data, id: d.doc_id }));
  return { assessments };
}

export async function getClassPerformance(classId: string) {
  const supabase = getSupabaseAdmin()!;

  const currentYear = await getCurrentAcademicYear();
  const yearStart = currentYear?.startDate ? new Date(currentYear.startDate as string) : null;

  const { data: students, error: getCpStudentsErr } = await supabase
    .from('users')
    .select('id, data')
    .contains('class_ids', [classId])
    .eq('role', 'student');
  if (getCpStudentsErr) throw new Error(getCpStudentsErr.message);
  const totalStudents = (students || []).length;

  const levelDist = { beginner: 0, intermediate: 0, advanced: 0 };
  (students || []).forEach((d: any) => {
    const level: string = d.data?.level || 'beginner';
    if (level in levelDist) levelDist[level as keyof typeof levelDist]++;
  });

  const assessmentPromises = ['quiz', 'assignment', 'exam'].map(async (type) => {
    const { assessments } = await getAssessmentData(type as 'quiz' | 'assignment' | 'exam');
    const classAssessments = assessments.filter((a: any) => a.classId === classId);

    if (classAssessments.length === 0) return [];

    const results = [];
    for (const a of classAssessments) {
      const attemptCollectionName = type === 'quiz' ? 'quizAttemptV2' : type === 'assignment' ? 'assignmentSubmissionV2' : 'examAttemptV2';
      const idField = type === 'quiz' ? 'quizId' : type === 'assignment' ? 'assignmentId' : 'examId';

      const { data: attempts, error: getCpAttemptsErr } = await supabase
        .from('firestore_docs')
        .select('data')
        .eq('collection', attemptCollectionName)
        .filter('data->>' + idField, 'eq', a.id);
      if (getCpAttemptsErr) throw new Error(getCpAttemptsErr.message);

      const attemptData = (attempts || []).map((d: any) => d.data).filter((at: any) => !yearStart || !at.submittedAt || new Date(at.submittedAt) >= yearStart);
      const scored = attemptData.filter((at: any) => at.percentage != null);
      const avgScore = scored.length > 0
        ? safePct(Math.round(scored.reduce((s: number, at: any) => s + at.percentage, 0) / scored.length))
        : 0;
      const passCount = scored.filter((at: any) => at.passed === true).length;

      results.push({
        id: a.id,
        type,
        title: (a as any).title,
        avgScore,
        passRate: scored.length > 0 ? safePct(Math.round((passCount / scored.length) * 100)) : 0,
        attemptCount: attemptData.length,
        released: !!(a as any).releasedAt,
      });
    }

    return results;
  });

  const allResults = (await Promise.all(assessmentPromises)).flat();
  const scoredAll = allResults.filter((r) => r.attemptCount > 0);
  const totalScored = scoredAll.reduce((s, r) => s + r.attemptCount, 0);
  const totalPassed = scoredAll.reduce((s, r) => s + Math.round((r.passRate / 100) * r.attemptCount), 0);
  const overallAvg = totalScored > 0
    ? safePct(Math.round(scoredAll.reduce((s, r) => s + (r.avgScore * r.attemptCount), 0) / totalScored))
    : 0;
  const overallPass = totalScored > 0
    ? safePct(Math.round((totalPassed / totalScored) * 100))
    : 0;

  logger.info('Class performance retrieved', { classId });

  return {
    totalStudents,
    totalAssessments: allResults.length,
    avgScore: overallAvg,
    passRate: overallPass,
    assessments: allResults,
    studentLevelDistribution: levelDist,
  };
}

export async function getStudentPerformance(studentId: string) {
  const supabase = getSupabaseAdmin()!;

  const currentYear = await getCurrentAcademicYear();
  const yearStart = currentYear?.startDate ? new Date(currentYear.startDate as string) : null;

  const { data: userDoc, error: userDocErr } = await supabase
    .from('users')
    .select('data')
    .eq('id', studentId)
    .maybeSingle();
  if (userDocErr) throw new Error(userDocErr.message);
  const userLevel = userDoc ? (userDoc.data as any)?.level || 'beginner' : 'beginner';

  const allAttempts: Array<{ type: string; title: string; percentage: number; hasScore: boolean; passed: boolean; submittedAt: string; level: string }> = [];

  for (const type of ['quiz', 'assignment', 'exam'] as const) {
    const attemptCollectionName = type === 'quiz' ? 'quizAttemptV2' : type === 'assignment' ? 'assignmentSubmissionV2' : 'examAttemptV2';
    const idField = type === 'quiz' ? 'quizId' : type === 'assignment' ? 'assignmentId' : 'examId';
    const parentCollectionName = type === 'quiz' ? 'quizV2' : type === 'assignment' ? 'assignmentV2' : 'examV2';

    const { data: attempts, error: getSpAttemptsErr } = await supabase
      .from('firestore_docs')
      .select('data, doc_id')
      .eq('collection', attemptCollectionName)
      .filter('data->>studentId', 'eq', studentId);
    if (getSpAttemptsErr) throw new Error(getSpAttemptsErr.message);

    for (const doc of (attempts || [])) {
      const at = doc.data as any;
      const parentId = at[idField];
      let title = type;

      if (parentId) {
        const { data: parent, error: parentErr } = await supabase
          .from('firestore_docs')
          .select('data')
          .eq('collection', parentCollectionName)
          .eq('doc_id', parentId)
          .maybeSingle();
        if (parentErr) throw new Error(parentErr.message);
        if (parent) title = (parent.data as any)?.title || title;
      }

      const subDate = at.submittedAt || at.startedAt;
      if (yearStart && subDate && new Date(subDate) < yearStart) continue;
      allAttempts.push({
        type,
        title,
        percentage: at.percentage ?? 0,
        // Distinguish a graded 0% attempt (must count in the average) from an
        // ungraded attempt (no percentage stored — must not drag it down).
        hasScore: at.percentage != null,
        passed: at.passed ?? false,
        submittedAt: subDate,
        level: at.level || 'beginner',
      });
    }
  }

  allAttempts.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

  // Include graded 0% attempts so the average matches the report card's overall
  // score (a 0/15 assessment counts toward the total, it is not silently dropped).
  const scored = allAttempts.filter((a) => a.hasScore);
  const overallAvg = scored.length > 0
    ? safePct(Math.round(scored.reduce((s, a) => s + a.percentage, 0) / scored.length))
    : 0;

  logger.info('Student performance retrieved', { studentId });

  return {
    studentId,
    level: userLevel,
    overallAvgScore: overallAvg,
    totalAttempts: allAttempts.length,
    quizzes: allAttempts.filter((a) => a.type === 'quiz'),
    assignments: allAttempts.filter((a) => a.type === 'assignment'),
    exams: allAttempts.filter((a) => a.type === 'exam'),
    recentActivity: allAttempts.slice(0, 10).map((a) => ({
      type: a.type,
      title: a.title,
      score: a.percentage,
      date: a.submittedAt,
    })),
  };
}

export async function getAssessmentAnalytics(assessmentId: string, type: 'quiz' | 'assignment' | 'exam') {
  const supabase = getSupabaseAdmin()!;

  const parentCollectionName = type === 'quiz' ? 'quizV2' : type === 'assignment' ? 'assignmentV2' : 'examV2';
  const { data: parentDoc, error: parentDocErr } = await supabase
    .from('firestore_docs')
    .select('data')
    .eq('collection', parentCollectionName)
    .eq('doc_id', assessmentId)
    .maybeSingle();
  if (parentDocErr) throw new Error(parentDocErr.message);

  if (!parentDoc) return null;

  const parentData = parentDoc.data as any;
  const attemptCollectionName = type === 'quiz' ? 'quizAttemptV2' : type === 'assignment' ? 'assignmentSubmissionV2' : 'examAttemptV2';
  const idField = type === 'quiz' ? 'quizId' : type === 'assignment' ? 'assignmentId' : 'examId';

  const { data: attempts, error: getAaAttemptsErr } = await supabase
    .from('firestore_docs')
    .select('data, doc_id')
    .eq('collection', attemptCollectionName)
    .filter('data->>' + idField, 'eq', assessmentId);
  if (getAaAttemptsErr) throw new Error(getAaAttemptsErr.message);

  const attemptData = (attempts || []).map((d: any) => ({ id: d.doc_id, ...d.data }));

  const scored = attemptData.filter((a: any) => a.percentage != null);
  const avgScore = scored.length > 0
    ? safePct(Math.round(scored.reduce((s: number, a: any) => s + a.percentage, 0) / scored.length))
    : 0;
  const passCount = scored.filter((a: any) => a.passed === true).length;

  const scoreDist = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  for (const a of scored) {
    const pct = a.percentage;
    if (pct <= 20) scoreDist['0-20']++;
    else if (pct <= 40) scoreDist['21-40']++;
    else if (pct <= 60) scoreDist['41-60']++;
    else if (pct <= 80) scoreDist['61-80']++;
    else scoreDist['81-100']++;
  }

  const studentIds = [...new Set(scored.map((a: any) => a.studentId))];
  const { data: studentDocs, error: studentDocsErr } = studentIds.length > 0
    ? await supabase.from('users').select('id, display_name, email, roll_no, student_id').in('id', studentIds)
    : { data: [], error: null };
  if (studentDocsErr) throw new Error(studentDocsErr.message);
  const studentMap = new Map((studentDocs || []).map((s: any) => [s.id, s]));

  logger.info('Assessment analytics retrieved', { assessmentId, type });

  return {
    id: assessmentId,
    title: parentData.title,
    attemptCount: attemptData.length,
    avgScore,
    passRate: scored.length > 0 ? safePct(Math.round((passCount / scored.length) * 100)) : 0,
    scoreDistribution: scoreDist,
    studentAttempts: scored.map((a: any) => {
      const student = studentMap.get(a.studentId);
      return {
        studentId: a.studentId,
        studentName: student?.display_name || student?.email || 'Unknown Student',
        studentRollNo: student?.roll_no || '-',
        studentCustomId: student?.student_id || '-',
        percentage: a.percentage,
        passed: a.passed,
        timeSpent: a.timeSpent,
        submittedAt: a.submittedAt,
        level: a.level,
      };
    }),
  };
}
