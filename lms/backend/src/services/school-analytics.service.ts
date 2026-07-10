import { getSupabaseAdmin } from './supabase';
import { getAdminDashboard } from './analytics.service';

function safePct(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

async function loadClassNameMap(supabase: any): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data: fsClasses } = await supabase
    .from('firestore_docs')
    .select('doc_id, data')
    .eq('collection', 'classes');
  for (const c of (fsClasses || [])) {
    const d = c.data || {};
    const name = d.name || d.className || '';
    const section = d.section ? ` ${d.section}` : '';
    const code = d.code || '';
    map.set(c.doc_id, `${name}${section}`.trim() || code || c.doc_id);
  }
  return map;
}

export async function getGradeComparison(schoolId?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];

  const [fsClassNameMap] = await Promise.all([loadClassNameMap(supabase)]);

  const [quizRes, examRes, assignRes] = await Promise.all([
    supabase.from('firestore_docs').select('doc_id, data').eq('collection', 'quizV2'),
    supabase.from('firestore_docs').select('doc_id, data').eq('collection', 'examV2'),
    supabase.from('firestore_docs').select('doc_id, data').eq('collection', 'assignmentV2'),
  ]);

  const [quizAttemptRes, examAttemptRes, submitRes] = await Promise.all([
    supabase.from('firestore_docs').select('data').eq('collection', 'quizAttemptV2'),
    supabase.from('firestore_docs').select('data').eq('collection', 'examAttemptV2'),
    supabase.from('firestore_docs').select('data').eq('collection', 'assignmentSubmissionV2'),
  ]);

  const classMap: Record<string, { totalScore: number; totalPoints: number; studentIds: Set<string>; count: number }> = {};

  function processAttempts(attempts: any[], idField: string, assessments: any[]) {
    const docById = new Map(assessments.map((d: any) => [d.doc_id, d.data]));
    for (const a of attempts) {
      const pct = a.data?.percentage;
      if (pct == null) continue;
      const doc = docById.get(a.data?.[idField]);
      if (!doc) continue;
      const classId = doc.classId || doc.class_id || '';
      if (!classId) continue;
      if (!classMap[classId]) classMap[classId] = { totalScore: 0, totalPoints: 0, studentIds: new Set(), count: 0 };
      classMap[classId].totalScore += pct;
      classMap[classId].totalPoints += 100;
      classMap[classId].studentIds.add(a.data?.studentId);
      classMap[classId].count++;
    }
  }

  processAttempts(quizAttemptRes.data || [], 'quizId', quizRes.data || []);
  processAttempts(examAttemptRes.data || [], 'examId', examRes.data || []);
  processAttempts(submitRes.data || [], 'assignmentId', assignRes.data || []);

  const gradeMap: Record<string, { totalScore: number; totalPoints: number; count: number; studentCount: number }> = {};
  for (const [classId, data] of Object.entries(classMap)) {
    const name = fsClassNameMap.get(classId);
    const gradeKey = name || classId;
    if (!gradeMap[gradeKey]) gradeMap[gradeKey] = { totalScore: 0, totalPoints: 0, count: 0, studentCount: 0 };
    gradeMap[gradeKey].totalScore += data.totalScore;
    gradeMap[gradeKey].totalPoints += data.totalPoints;
    gradeMap[gradeKey].count += data.count;
    gradeMap[gradeKey].studentCount += data.studentIds.size;
  }

  return Object.entries(gradeMap).map(([grade, data]) => ({
    grade,
    averageScore: data.totalPoints > 0 ? safePct(Math.round((data.totalScore / data.totalPoints) * 100)) : 0,
    studentCount: data.studentCount,
    totalPoints: data.totalPoints,
  }));
}

export async function getTeacherComparison(schoolId?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];

  const [fsClassNameMap] = await Promise.all([loadClassNameMap(supabase)]);

  let classesQuery = supabase.from('classes').select('*');
  if (schoolId) classesQuery = classesQuery.eq('school_id', schoolId);
  const { data: classes } = await classesQuery;

  let usersQuery = supabase.from('users').select('*');
  if (schoolId) usersQuery = usersQuery.eq('school_id', schoolId);
  const { data: users } = await usersQuery;

  const [quizRes, examRes, assignRes] = await Promise.all([
    supabase.from('firestore_docs').select('doc_id, data').eq('collection', 'quizV2'),
    supabase.from('firestore_docs').select('doc_id, data').eq('collection', 'examV2'),
    supabase.from('firestore_docs').select('doc_id, data').eq('collection', 'assignmentV2'),
  ]);

  const [quizAttemptRes, examAttemptRes, submitRes] = await Promise.all([
    supabase.from('firestore_docs').select('data').eq('collection', 'quizAttemptV2'),
    supabase.from('firestore_docs').select('data').eq('collection', 'examAttemptV2'),
    supabase.from('firestore_docs').select('data').eq('collection', 'assignmentSubmissionV2'),
  ]);

  const teacherMap: Record<string, { totalScore: number; totalPoints: number; count: number; classIds: Set<string> }> = {};
  const teachers = (users || []).filter((u: any) => u.role === 'teacher');
  for (const t of teachers) {
    const tClassIds = t.class_ids || (t.class_id ? [t.class_id] : []);
    teacherMap[t.id] = { totalScore: 0, totalPoints: 0, count: 0, classIds: new Set(tClassIds) };
  }

  function processAttempts(attempts: any[], idField: string, assessments: any[]) {
    const docById = new Map(assessments.map((d: any) => [d.doc_id, d.data]));
    for (const a of attempts) {
      const pct = a.data?.percentage;
      if (pct == null) continue;
      const doc = docById.get(a.data?.[idField]);
      if (!doc) continue;
      const classId = doc.classId || doc.class_id || '';
      if (!classId) continue;
      for (const [tid, data] of Object.entries(teacherMap)) {
        if (data.classIds.has(classId)) {
          data.totalScore += pct;
          data.totalPoints += 100;
          data.count++;
        }
      }
    }
  }

  processAttempts(quizAttemptRes.data || [], 'quizId', quizRes.data || []);
  processAttempts(examAttemptRes.data || [], 'examId', examRes.data || []);
  processAttempts(submitRes.data || [], 'assignmentId', assignRes.data || []);

  return Object.entries(teacherMap).map(([teacherId, data]) => {
    const teacher = (users || []).find((u: any) => u.id === teacherId);
    return {
      teacherId,
      teacherName: teacher?.display_name || teacher?.displayName || 'Unknown',
      averageScore: data.totalPoints > 0 ? safePct(Math.round((data.totalScore / data.totalPoints) * 100)) : 0,
      studentCount: data.count,
      classCount: data.classIds.size,
    };
  });
}

export async function getClassComparison(schoolId?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];

  const [fsClassNameMap] = await Promise.all([loadClassNameMap(supabase)]);

  const [quizRes, examRes, assignRes] = await Promise.all([
    supabase.from('firestore_docs').select('doc_id, data').eq('collection', 'quizV2'),
    supabase.from('firestore_docs').select('doc_id, data').eq('collection', 'examV2'),
    supabase.from('firestore_docs').select('doc_id, data').eq('collection', 'assignmentV2'),
  ]);

  const [quizAttemptRes, examAttemptRes, submitRes] = await Promise.all([
    supabase.from('firestore_docs').select('data').eq('collection', 'quizAttemptV2'),
    supabase.from('firestore_docs').select('data').eq('collection', 'examAttemptV2'),
    supabase.from('firestore_docs').select('data').eq('collection', 'assignmentSubmissionV2'),
  ]);

  const classMap: Record<string, { totalScore: number; totalPoints: number; count: number }> = {};

  function processAttempts(attempts: any[], idField: string, assessments: any[]) {
    const docById = new Map(assessments.map((d: any) => [d.doc_id, d.data]));
    for (const a of attempts) {
      const pct = a.data?.percentage;
      if (pct == null) continue;
      const doc = docById.get(a.data?.[idField]);
      if (!doc) continue;
      const clsId = doc.classId || doc.class_id || '';
      if (!clsId) continue;
      if (!classMap[clsId]) classMap[clsId] = { totalScore: 0, totalPoints: 0, count: 0 };
      classMap[clsId].totalScore += pct;
      classMap[clsId].totalPoints += 100;
      classMap[clsId].count++;
    }
  }

  processAttempts(quizAttemptRes.data || [], 'quizId', quizRes.data || []);
  processAttempts(examAttemptRes.data || [], 'examId', examRes.data || []);
  processAttempts(submitRes.data || [], 'assignmentId', assignRes.data || []);

  return Object.entries(classMap).map(([classId, data]) => {
    const name = fsClassNameMap.get(classId);
    return {
      classId,
      className: name || classId,
      grade: '',
      averageScore: data.totalPoints > 0 ? safePct(Math.round((data.totalScore / data.totalPoints) * 100)) : 0,
      studentCount: data.count,
    };
  }).sort((a, b) => b.averageScore - a.averageScore);
}

/** @deprecated Use analytics.service.ts::getAdminDashboard for full school stats. Delegates to it. */
export async function getSchoolOverview() {
  return getAdminDashboard();
}

export async function getPerformanceTrends(schoolId?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];

  const [quizAttemptRes, examAttemptRes, submitRes] = await Promise.all([
    supabase.from('firestore_docs').select('data').eq('collection', 'quizAttemptV2'),
    supabase.from('firestore_docs').select('data').eq('collection', 'examAttemptV2'),
    supabase.from('firestore_docs').select('data').eq('collection', 'assignmentSubmissionV2'),
  ]);

  const monthMap: Record<string, { totalScore: number; totalPoints: number; count: number }> = {};

  for (const arr of [quizAttemptRes.data || [], examAttemptRes.data || [], submitRes.data || []]) {
    for (const a of arr) {
      const pct = a.data?.percentage;
      if (pct == null) continue;
      const date = a.data?.createdAt || a.data?.submittedAt || a.data?.examDate || (a as any).created_at;
      if (!date) continue;
      const month = date.substring(0, 7);
      if (!monthMap[month]) monthMap[month] = { totalScore: 0, totalPoints: 0, count: 0 };
      monthMap[month].totalScore += pct;
      monthMap[month].totalPoints += 100;
      monthMap[month].count++;
    }
  }

  return Object.entries(monthMap)
    .map(([month, data]) => ({
      month,
      averageScore: data.totalPoints > 0 ? safePct(Math.round((data.totalScore / data.totalPoints) * 100)) : 0,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
