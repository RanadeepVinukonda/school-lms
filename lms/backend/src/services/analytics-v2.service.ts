import { collections } from '../firebase/firestore';
import { logger } from '../utils/logger';

async function getAssessmentData(type: 'quiz' | 'assignment' | 'exam') {
  if (type === 'quiz') {
    const assessments = await collections.quizV2().get();
    return { assessments: assessments.docs.map((d) => ({ ...d.data(), id: d.id } as any)), attemptCollection: collections.quizAttemptV2() };
  }
  if (type === 'assignment') {
    const assessments = await collections.assignmentV2().get();
    return { assessments: assessments.docs.map((d) => ({ ...d.data(), id: d.id } as any)), attemptCollection: collections.assignmentSubmissionV2() };
  }
  const assessments = await collections.examV2().get();
  return { assessments: assessments.docs.map((d) => ({ ...d.data(), id: d.id } as any)), attemptCollection: collections.examAttemptV2() };
}

export async function getClassPerformance(classId: string) {
  const studentsSnapshot = await collections.users()
    .where('classIds', 'array-contains', classId)
    .where('role', '==', 'student')
    .get();
  const totalStudents = studentsSnapshot.docs.length;

  const levelDist = { beginner: 0, intermediate: 0, advanced: 0 };
  studentsSnapshot.docs.forEach((d) => {
    const data = d.data();
    const level: string = data.level || 'beginner';
    if (level in levelDist) levelDist[level as keyof typeof levelDist]++;
  });

  const assessmentPromises = ['quiz', 'assignment', 'exam'].map(async (type) => {
    const { assessments } = await getAssessmentData(type as any);
    const classAssessments = assessments.filter((a: any) => a.classId === classId);

    if (classAssessments.length === 0) return [];

    const results = [];
    for (const a of classAssessments) {
      const { attemptCollection } = await getAssessmentData(type as any);
      const attemptsSnap = await attemptCollection
        .where((type === 'quiz' ? 'quizId' : type === 'assignment' ? 'assignmentId' : 'examId'), '==', a.id)
        .get();

      const attempts = attemptsSnap.docs.map((d) => d.data());
      const scored = attempts.filter((at: any) => at.percentage != null);
      const avgScore = scored.length > 0
        ? Math.round(scored.reduce((s: number, at: any) => s + at.percentage, 0) / scored.length)
        : 0;
      const passCount = scored.filter((at: any) => at.passed === true).length;

      results.push({
        id: a.id,
        type,
        title: a.title,
        avgScore,
        passRate: scored.length > 0 ? Math.round((passCount / scored.length) * 100) : 0,
        attemptCount: attempts.length,
        released: !!a.releasedAt,
      });
    }

    return results;
  });

  const allResults = (await Promise.all(assessmentPromises)).flat();
  const scoredAll = allResults.filter((r) => r.attemptCount > 0);
  const overallAvg = scoredAll.length > 0
    ? Math.round(scoredAll.reduce((s, r) => s + r.avgScore, 0) / scoredAll.length)
    : 0;
  const overallPass = scoredAll.length > 0
    ? Math.round(scoredAll.reduce((s, r) => s + r.passRate, 0) / scoredAll.length)
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
  const userDoc = await collections.users().doc(studentId).get();
  const userLevel = userDoc.exists ? (userDoc.data()?.level as string) || 'beginner' : 'beginner';

  const allAttempts: Array<{ type: string; title: string; percentage: number; passed: boolean; submittedAt: string; level: string }> = [];

  for (const type of ['quiz', 'assignment', 'exam'] as const) {
    const { attemptCollection } = await getAssessmentData(type);
    const idField = type === 'quiz' ? 'quizId' : type === 'assignment' ? 'assignmentId' : 'examId';
    const attemptsSnap = await attemptCollection.where('studentId', '==', studentId).get();

    for (const doc of attemptsSnap.docs) {
      const at = doc.data();
      const parentId = at[idField];
      let title = type;

      try {
        const parentCollection = type === 'quiz' ? collections.quizV2() : type === 'assignment' ? collections.assignmentV2() : collections.examV2();
        const parentDoc = await parentCollection.doc(parentId).get();
        if (parentDoc.exists) title = parentDoc.data()!.title || title;
      } catch {}

      allAttempts.push({
        type,
        title,
        percentage: at.percentage ?? 0,
        passed: at.passed ?? false,
        submittedAt: at.submittedAt || at.startedAt,
        level: at.level || 'beginner',
      });
    }
  }

  allAttempts.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const scored = allAttempts.filter((a) => a.percentage > 0);
  const overallAvg = scored.length > 0
    ? Math.round(scored.reduce((s, a) => s + a.percentage, 0) / scored.length)
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
  const parentCollection = type === 'quiz' ? collections.quizV2() : type === 'assignment' ? collections.assignmentV2() : collections.examV2();
  const parentDoc = await parentCollection.doc(assessmentId).get();

  if (!parentDoc.exists) return null;

  const parentData = parentDoc.data()!;
  const { attemptCollection } = await getAssessmentData(type);
  const idField = type === 'quiz' ? 'quizId' : type === 'assignment' ? 'assignmentId' : 'examId';

  const attemptsSnap = await attemptCollection.where(idField, '==', assessmentId).get();
  const attempts = attemptsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

  const scored = attempts.filter((a) => a.percentage != null);
  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((s, a) => s + a.percentage, 0) / scored.length)
    : 0;
  const passCount = scored.filter((a) => a.passed === true).length;

  const scoreDist = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  for (const a of scored) {
    const pct = a.percentage;
    if (pct <= 20) scoreDist['0-20']++;
    else if (pct <= 40) scoreDist['21-40']++;
    else if (pct <= 60) scoreDist['41-60']++;
    else if (pct <= 80) scoreDist['61-80']++;
    else scoreDist['81-100']++;
  }

  logger.info('Assessment analytics retrieved', { assessmentId, type });

  return {
    id: assessmentId,
    title: parentData.title,
    attemptCount: attempts.length,
    avgScore,
    passRate: scored.length > 0 ? Math.round((passCount / scored.length) * 100) : 0,
    scoreDistribution: scoreDist,
    studentAttempts: scored.map((a) => ({
      studentId: a.studentId,
      percentage: a.percentage,
      passed: a.passed,
      timeSpent: a.timeSpent,
      submittedAt: a.submittedAt,
      level: a.level,
    })),
  };
}
