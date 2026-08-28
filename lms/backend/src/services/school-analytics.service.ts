import { getSupabaseAdmin } from './supabase';
import { getAdminDashboard } from './analytics.service';
import { computeReliability, applyRanks, DEFAULT_RELIABILITY_CONFIG, type ReliabilityConfig } from './school-analytics/reliability-scoring';

function safePct(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Output shape of the shared assessment loader. To avoid N+1 queries each
 * comparison endpoint loads the assessment docs and attempt records once,
 * then groups the same normalized records locally.
 */
interface LoadedAssessments {
  /** assessmentId -> { classId, teacherId }. classId/teacherId may be ''. */
  metaById: Map<string, { classId: string; teacherId: string }>;
  /** Normalized, valid percentage records (percentage is a number). */
  records: {
    assessmentId: string;
    pct: number;
    studentId: string;
    classId: string;
    teacherId: string;
  }[];
}

const ASSESSMENT_COLLECTIONS = [
  { collection: 'quizV2', idField: 'quizId' },
  { collection: 'examV2', idField: 'examId' },
  { collection: 'assignmentV2', idField: 'assignmentId' },
] as const;

/**
 * Load assessment docs and attempt records from the document store once and
 * normalize the valid percentage records for downstream grouping.
 */
async function loadAssessments(supabase: any): Promise<LoadedAssessments> {
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

  const metaById = new Map<string, { classId: string; teacherId: string }>();
  for (const res of [quizRes, examRes, assignRes]) {
    for (const d of res.data || []) {
      const data = d.data || {};
      metaById.set(d.doc_id, {
        classId: data.classId || data.class_id || '',
        teacherId: data.teacherId || data.teacher_id || '',
      });
    }
  }

  const records: LoadedAssessments['records'] = [];
  const attemptArrays: { data: any[] }[] = [quizAttemptRes, examAttemptRes, submitRes];
  const idFields = ASSESSMENT_COLLECTIONS.map((c) => c.idField);

  attemptArrays.forEach((res, index) => {
    const idField = idFields[index];
    for (const a of res.data || []) {
      const pct = a.data?.percentage;
      if (pct == null) continue;
      const assessmentId = a.data?.[idField];
      if (!assessmentId) continue;
      const meta = metaById.get(assessmentId);
      if (!meta) continue;
      records.push({
        assessmentId,
        pct,
        studentId: a.data?.studentId || '',
        classId: meta.classId,
        teacherId: meta.teacherId,
      });
    }
  });

  return { metaById, records };
}

async function loadClassMeta(supabase: any): Promise<{ nameMap: Map<string, string>; gradeMap: Map<string, string>; sectionMap: Map<string, string> }> {
  const nameMap = new Map<string, string>();
  const gradeMap = new Map<string, string>();
  const sectionMap = new Map<string, string>();

  const { data: fsClasses } = await supabase
    .from('firestore_docs')
    .select('doc_id, data')
    .eq('collection', 'classes');
  for (const c of (fsClasses || [])) {
    const d = c.data || {};
    const name = d.name || d.className || '';
    const sectionRaw = d.section || '';
    const section = sectionRaw ? ` ${sectionRaw}` : '';
    const code = d.code || '';
    nameMap.set(c.doc_id, `${name}${section}`.trim() || code || c.doc_id);
    gradeMap.set(c.doc_id, d.grade || d.gradeLevel || '');
    if (sectionRaw) sectionMap.set(c.doc_id, String(sectionRaw));
  }

  const { data: viewClasses } = await supabase.from('classes').select('id, name, grade, section, code');
  for (const c of (viewClasses || [])) {
    if (!nameMap.has(c.id)) {
      const sectionRaw = c.section || '';
      const section = sectionRaw ? ` ${sectionRaw}` : '';
      const grade = c.grade != null ? String(c.grade) : '';
      nameMap.set(c.id, `${c.name || ''}${section}`.trim() || c.code || c.id);
      gradeMap.set(c.id, grade);
      if (sectionRaw) sectionMap.set(c.id, String(sectionRaw));
      continue;
    }
    // Also merge any fields the firestore_docs doc may be missing (e.g. section).
    const grade = c.grade != null ? String(c.grade) : '';
    if (!gradeMap.get(c.id) && grade) gradeMap.set(c.id, grade);
    if (!sectionMap.get(c.id) && c.section) sectionMap.set(c.id, String(c.section));
  }

  return { nameMap, gradeMap, sectionMap };
}

/** Wrapper so async loaders match the shape used by callers. */
async function loadMeta(supabase: any) {
  return loadClassMeta(supabase);
}

export async function getGradeComparison(_schoolId?: string, config: ReliabilityConfig = DEFAULT_RELIABILITY_CONFIG) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];

  const [{ nameMap, gradeMap, sectionMap }, { records }] = await Promise.all([
    loadMeta(supabase),
    loadAssessments(supabase),
  ]);

  // group records by class -> grade. Distinct exams tracked per class.
  const classAgg: Record<string, { totalScore: number; totalPoints: number; studentIds: Set<string>; count: number; exams: Set<string> }> = {};
  for (const r of records) {
    if (!r.classId) continue;
    if (!classAgg[r.classId]) classAgg[r.classId] = { totalScore: 0, totalPoints: 0, studentIds: new Set(), count: 0, exams: new Set() };
    const c = classAgg[r.classId];
    c.totalScore += r.pct;
    c.totalPoints += 100;
    if (r.studentId) c.studentIds.add(r.studentId);
    c.count++;
    c.exams.add(r.assessmentId);
  }

  // Grade label keeps the section beside the grade number (e.g. "5 A").
  function gradeLabel(classId: string): string {
    const rawGrade = gradeMap.get(classId);
    const grade = rawGrade && rawGrade.trim ? rawGrade.trim() : '';
    const section = sectionMap.get(classId) || '';
    const basis = grade || nameMap.get(classId) || classId;
    return section ? `${basis} ${section}`.trim() : basis;
  }

  const gradeAgg: Record<string, { totalScore: number; totalPoints: number; count: number; studentCount: number; examCount: number }> = {};
  for (const [classId, data] of Object.entries(classAgg)) {
    const gradeKey = gradeLabel(classId);
    if (!gradeAgg[gradeKey]) gradeAgg[gradeKey] = { totalScore: 0, totalPoints: 0, count: 0, studentCount: 0, examCount: 0 };
    const g = gradeAgg[gradeKey];
    g.totalScore += data.totalScore;
    g.totalPoints += data.totalPoints;
    g.count += data.count;
    g.studentCount += data.studentIds.size;
    g.examCount += data.exams.size;
  }

  const totalRecords = gradeAgg ? Object.values(gradeAgg).reduce((s, g) => s + g.count, 0) : 0;
  const totalScore = gradeAgg ? Object.values(gradeAgg).reduce((s, g) => s + g.totalScore, 0) : 0;
  const schoolReference = totalRecords > 0 ? safePct(totalScore / totalRecords) : 0;

  const groups = Object.entries(gradeAgg).map(([grade, data]) => ({
    id: grade,
    grade,
    studentCount: data.studentCount,
    totalPoints: data.totalPoints,
    examCount: data.examCount,
    reliability: computeReliability({ totalScore: data.totalScore, examCount: data.count }, schoolReference, config),
  }));

  return applyRanks(groups).map(({ reliability, ...rest }) => ({
    ...rest,
    averageScore: reliability.rawAverage,
    rawAverage: reliability.rawAverage,
    adjustedScore: reliability.adjustedScore,
    confidence: reliability.confidence,
    rank: rest.rank,
  }));
}

export async function getTeacherComparison(schoolId?: string, config: ReliabilityConfig = DEFAULT_RELIABILITY_CONFIG) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];

  let usersQuery = supabase.from('users').select('*');
  if (schoolId) usersQuery = usersQuery.eq('school_id', schoolId);
  const { data: users } = await usersQuery;

  const loaded = await loadAssessments(supabase);
  const { records } = loaded;

  const teacherMap: Record<string, { totalScore: number; totalPoints: number; count: number; classIds: Set<string>; exams: Set<string> }> = {};
  const teachers = (users || []).filter((u: any) => u.role === 'teacher');
  for (const t of teachers) {
    teacherMap[t.id] = { totalScore: 0, totalPoints: 0, count: 0, classIds: new Set(), exams: new Set() };
  }

  for (const r of records) {
    if (!r.teacherId || !teacherMap[r.teacherId]) continue;
    const t = teacherMap[r.teacherId];
    t.totalScore += r.pct;
    t.totalPoints += 100;
    t.count++;
    if (r.classId) t.classIds.add(r.classId);
    t.exams.add(r.assessmentId);
  }

  const populated = Object.entries(teacherMap)
    .filter(([, d]) => d.count > 0)
    .map(([teacherId, d]) => ({ teacherId, d }));

  const totalRecords = populated.reduce((s, p) => s + p.d.count, 0);
  const totalScore = populated.reduce((s, p) => s + p.d.totalScore, 0);
  const schoolReference = totalRecords > 0 ? safePct(totalScore / totalRecords) : 0;

  const scorable = populated
    .map(({ teacherId, d }) => {
      const teacher = (users || []).find((u: any) => u.id === teacherId);
      return {
        id: teacherId,
        teacherId,
        teacherName: teacher?.display_name || teacher?.displayName || 'Unknown',
        studentCount: d.count,
        classCount: d.classIds.size,
        examCount: d.exams.size,
        reliability: computeReliability({ totalScore: d.totalScore, examCount: d.count }, schoolReference, config),
      };
    });

  return applyRanks(scorable).map(({ reliability, ...rest }) => ({
    ...rest,
    averageScore: reliability.rawAverage,
    rawAverage: reliability.rawAverage,
    adjustedScore: reliability.adjustedScore,
    confidence: reliability.confidence,
    rank: rest.rank,
  }));
}

export async function getClassComparison(_schoolId?: string, config: ReliabilityConfig = DEFAULT_RELIABILITY_CONFIG) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];

  const [{ nameMap, gradeMap }, loaded] = await Promise.all([
    loadMeta(supabase),
    loadAssessments(supabase),
  ]);
  const { records } = loaded;

  const classAgg: Record<string, { totalScore: number; totalPoints: number; count: number; exams: Set<string>; students: Set<string> }> = {};
  for (const r of records) {
    if (!r.classId) continue;
    if (!classAgg[r.classId]) classAgg[r.classId] = { totalScore: 0, totalPoints: 0, count: 0, exams: new Set(), students: new Set() };
    const c = classAgg[r.classId];
    c.totalScore += r.pct;
    c.totalPoints += 100;
    c.count++;
    c.exams.add(r.assessmentId);
    if (r.studentId) c.students.add(r.studentId);
  }

  const totalRecords = Object.values(classAgg).reduce((s, c) => s + c.count, 0);
  const totalScore = Object.values(classAgg).reduce((s, c) => s + c.totalScore, 0);
  const schoolReference = totalRecords > 0 ? safePct(totalScore / totalRecords) : 0;

  const scorable = Object.entries(classAgg)
    .filter(([, c]) => c.count > 0)
    .map(([classId, c]) => {
      const name = nameMap.get(classId);
      const grade = gradeMap.get(classId) || '';
      return {
        id: classId,
        classId,
        className: name || classId,
        grade,
        studentCount: c.students.size,
        examCount: c.exams.size,
        reliability: computeReliability({ totalScore: c.totalScore, examCount: c.count }, schoolReference, config),
      };
    });

  return applyRanks(scorable).map(({ reliability, ...rest }) => ({
    ...rest,
    averageScore: reliability.rawAverage,
    rawAverage: reliability.rawAverage,
    adjustedScore: reliability.adjustedScore,
    confidence: reliability.confidence,
    rank: rest.rank,
  }));
}

export async function getStudentComparison(schoolId?: string, config: ReliabilityConfig = DEFAULT_RELIABILITY_CONFIG) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];

  let usersQuery = supabase.from('users').select('*');
  if (schoolId) usersQuery = usersQuery.eq('school_id', schoolId);
  const { data: users } = await usersQuery;

  const [{ nameMap, gradeMap }, loaded] = await Promise.all([
    loadMeta(supabase),
    loadAssessments(supabase),
  ]);
  const { records } = loaded;

  // studentId -> classId, grade derived from that class
  const studentToClass: Record<string, string> = {};
  const studentToName: Record<string, string> = {};
  const students = (users || []).filter((u: any) => u.role === 'student');
  for (const s of students) {
    studentToName[s.id] = s.display_name || s.displayName || 'Unknown';
    const classIds = Array.isArray(s.class_ids) ? s.class_ids : s.class_id ? [s.class_id] : [];
    if (classIds.length > 0) studentToClass[s.id] = String(classIds[0]);
  }

  const studentAgg: Record<string, { totalScore: number; count: number; exams: Set<string>; classId: string }> = {};
  for (const r of records) {
    if (!r.studentId) continue;
    if (!studentAgg[r.studentId]) {
      studentAgg[r.studentId] = { totalScore: 0, count: 0, exams: new Set(), classId: studentToClass[r.studentId] || r.classId || '' };
    }
    const s = studentAgg[r.studentId];
    s.totalScore += r.pct;
    s.count++;
    s.exams.add(r.assessmentId);
  }

  const populated = Object.entries(studentAgg).filter(([, s]) => s.count > 0);

  const schoolTotalRecords = populated.reduce((sum, [, s]) => sum + s.count, 0);
  const schoolTotalScore = populated.reduce((sum, [, s]) => sum + s.totalScore, 0);
  const schoolReference = schoolTotalRecords > 0 ? safePct(schoolTotalScore / schoolTotalRecords) : 0;

  // Per-grade reference averages from the same filtered population.
  const gradeTotals: Record<string, { score: number; count: number }> = {};
  for (const [, s] of populated) {
    const grade = (s.classId ? gradeMap.get(s.classId) : '') || '';
    const key = grade || 'ungraded';
    if (!gradeTotals[key]) gradeTotals[key] = { score: 0, count: 0 };
    gradeTotals[key].score += s.totalScore;
    gradeTotals[key].count += s.count;
  }
  const gradeReference = (grade: string): number => {
    const key = grade || 'ungraded';
    const gt = gradeTotals[key];
    if (!gt || gt.count === 0) return schoolReference;
    return safePct(gt.score / gt.count);
  };

  const scorable = populated.map(([studentId, s]) => {
    const grade = (s.classId ? gradeMap.get(s.classId) : '') || '';
    const ref = gradeReference(grade);
    const className = s.classId ? (nameMap.get(s.classId) || s.classId) : '';
    return {
      id: studentId,
      studentId,
      studentName: studentToName[studentId] || 'Unknown',
      className,
      grade,
      examCount: s.exams.size,
      reliability: computeReliability({ totalScore: s.totalScore, examCount: s.count }, ref, config),
    };
  });

  return applyRanks(scorable).map(({ reliability, ...rest }) => ({
    ...rest,
    averageScore: reliability.rawAverage,
    rawAverage: reliability.rawAverage,
    adjustedScore: reliability.adjustedScore,
    confidence: reliability.confidence,
    rank: rest.rank,
  }));
}

/** @deprecated Use analytics.service.ts::getAdminDashboard for full school stats. Delegates to it. */
export async function getSchoolOverview() {
  return getAdminDashboard();
}

export async function getPerformanceTrends(_schoolId?: string) {
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
