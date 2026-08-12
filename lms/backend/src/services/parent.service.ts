import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getCurrentAcademicYear } from './academic-year.service';

/** Normalized report-grade row shared by all aggregation helpers. */
interface ReportGrade {
  studentId: string;
  subjectId?: string | null;
  courseId?: string | null;
  classId?: string | null;
  itemName?: string | null;
  score: number;
  totalPoints: number;
  percentage: number;
  createdAt?: string | null;
}

/** Attempt collections that carry graded percentages when no formal grade exists. */
const ATTEMPT_SOURCES = [
  { collection: 'quizAttemptV2', parent: 'quizV2', idField: 'quizId' },
  { collection: 'assignmentSubmissionV2', parent: 'assignmentV2', idField: 'assignmentId' },
  { collection: 'examAttemptV2', parent: 'examV2', idField: 'examId' },
] as const;

/** Compute a percentage from any grade shape (percentage field or score/max). */
function gradePercentage(g: Record<string, unknown>): number {
  if (g.percentage != null && !Number.isNaN(Number(g.percentage))) return Number(g.percentage);
  const points = Number(g.totalPoints ?? g.total_points ?? g.maxScore ?? g.max_score ?? 0);
  const score = Number(g.score ?? 0);
  return points > 0 ? Math.round((score / points) * 100) : 0;
}

/**
 * Resolve the academic-year window from the DB-configured record (startDate /
 * endDate can be custom, e.g. April–March) instead of assuming July–June.
 *
 * Priority: the stored academicYears record matching the requested name (or the
 * current one when no name is given) → the app-convention current year → parse
 * the name with the app's July 1 convention as a last resort.
 *
 * Returns an EXCLUSIVE upper bound (yearEnd) for timestamp filtering plus the
 * inclusive endDate for date-column filters like attendance.
 */
async function academicYearWindow(supabase: any, academicYear: string): Promise<{
  yearStart: string;
  yearEnd: string;
  endDate: string;
}> {
  // 1) DB-configured academic year (by name, or the active one).
  try {
    let query = supabase.from('firestore_docs').select('data').eq('collection', 'academicYears');
    if (academicYear) {
      query = query.contains('data', { name: academicYear }).limit(1);
    } else {
      query = query.contains('data', { isCurrent: true }).limit(1);
    }
    const { data: rows } = await query;
    const rec = rows?.[0]?.data;
    if (rec && rec.startDate && rec.endDate) {
      const start = String(rec.startDate).slice(0, 10);
      const end = String(rec.endDate).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
        return { yearStart: start, yearEnd: dayAfter(end), endDate: end };
      }
    }
  } catch (err) {
    logger.warn('academicYearWindow: record lookup failed, using convention', { academicYear, error: err });
  }

  // 2) App-convention current year (Jul 1 → Jun 30).
  const current = await getCurrentAcademicYear();
  if (!academicYear || academicYear === current.name) {
    return {
      yearStart: current.startDate.slice(0, 10),
      yearEnd: dayAfter(current.endDate.slice(0, 10)),
      endDate: current.endDate.slice(0, 10),
    };
  }

  // 3) Fallback: parse the name (e.g. "2026-2027") with the July convention.
  const year = parseInt(academicYear, 10);
  if (Number.isFinite(year)) {
    const start = `${year}-07-01`;
    return { yearStart: start, yearEnd: `${year + 1}-07-01`, endDate: `${year + 1}-06-30` };
  }
  const now = new Date();
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const start = `${y}-07-01`;
  return { yearStart: start, yearEnd: `${y + 1}-07-01`, endDate: `${y + 1}-06-30` };
}

/** Inclusive date (YYYY-MM-DD) + 1 day → exclusive upper bound. */
function dayAfter(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function inWindow(created: string | undefined | null, yearStart: string, yearEnd: string): boolean {
  if (!created) return true;
  return created >= yearStart && created < yearEnd;
}

/**
 * Fetch every grade record for a student from BOTH stores:
 *  - firestore_docs collection 'grades' (auto-graded quizzes/assignments, camelCase)
 *  - physical `grades` table (teacher gradebook, snake_case)
 * Normalizes them into one list filtered by the academic-year window.
 */
async function fetchGradesForStudent(
  supabase: any,
  studentId: string,
  yearStart: string,
  yearEnd: string,
): Promise<ReportGrade[]> {
  const grades: ReportGrade[] = [];

  // Source 1: firestore_docs 'grades' collection
  const { data: docs, error: docsErr } = await supabase
    .from('firestore_docs')
    .select('data')
    .eq('collection', 'grades')
    .eq('data->>studentId', studentId)
    .limit(500);
  if (docsErr) logger.warn('fetchGradesForStudent: collection query failed', { studentId, error: docsErr.message });
  for (const row of docs || []) {
    const g = row?.data || {};
    const created = typeof g.createdAt === 'string' ? g.createdAt : '';
    if (!inWindow(created, yearStart, yearEnd)) continue;
    grades.push({
      studentId,
      subjectId: g.subjectId || null,
      courseId: g.courseId || null,
      classId: g.classId || null,
      itemName: g.itemName || g.title || 'Assessment',
      score: Number(g.score || 0),
      totalPoints: Number(g.totalPoints || g.maxScore || g.max_score || 100),
      percentage: gradePercentage(g),
      createdAt: created || null,
    });
  }

  // Source 2: physical `grades` table (teacher gradebook)
  const { data: tableRows, error: tableErr } = await supabase
    .from('grades')
    .select('*')
    .eq('student_id', studentId)
    .limit(500);
  if (tableErr) logger.warn('fetchGradesForStudent: grades table query failed', { studentId, error: tableErr.message });
  for (const row of tableRows || []) {
    const raw = row?.created_at ?? row?.createdAt;
    const created = typeof raw === 'string' ? raw : raw instanceof Date ? raw.toISOString() : '';
    if (!inWindow(created, yearStart, yearEnd)) continue;
    grades.push({
      studentId,
      subjectId: row?.subject_id || row?.subjectId || null,
      courseId: row?.course_id || row?.courseId || null,
      classId: row?.class_id || row?.classId || null,
      itemName: row?.item_name || row?.itemName || row?.comments || 'Assessment',
      score: Number(row?.score || 0),
      totalPoints: Number(row?.total_points || row?.totalPoints || row?.max_score || row?.maxScore || 100),
      percentage: gradePercentage(row || {}),
      createdAt: created || null,
    });
  }

  // Dedupe: the same assessment may exist in both stores (e.g. the legacy
  // grades view-trigger wrote to firestore_docs while the gradebook wrote to
  // the table). Keep one copy so nothing counts twice in averages/ranks.
  const seen = new Set<string>();
  const deduped: ReportGrade[] = [];
  for (const g of grades) {
    const key = [g.studentId, g.subjectId || '', g.courseId || '', g.itemName || '', g.score, g.totalPoints].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(g);
  }

  return deduped;
}

/**
 * Fallback when a student has no formal grade records: pull their graded
 * quiz/assignment/exam attempts so "progress" still shows on the report card.
 */
async function fetchAttemptsForStudent(
  supabase: any,
  studentId: string,
  yearStart: string,
  yearEnd: string,
): Promise<ReportGrade[]> {
  const out: ReportGrade[] = [];
  for (const src of ATTEMPT_SOURCES) {
    const { data: attempts, error: attemptErr } = await supabase
      .from('firestore_docs')
      .select('data')
      .eq('collection', src.collection)
      .filter('data->>studentId', 'eq', studentId)
      .limit(200);
    if (attemptErr) {
      logger.warn('fetchAttemptsForStudent failed', { studentId, collection: src.collection, error: attemptErr.message });
      continue;
    }
    for (const row of attempts || []) {
      const a = row?.data || {};
      const subDate = typeof a.submittedAt === 'string' ? a.submittedAt : typeof a.startedAt === 'string' ? a.startedAt : '';
      if (!inWindow(subDate, yearStart, yearEnd)) continue;

      let subjectId: string | null = null;
      let classId: string | null = null;
      let itemName = src.collection.replace('V2', '').replace(/([A-Z])/g, ' $1').trim();
      const parentId = a[src.idField];
      if (parentId) {
        const { data: parent } = await supabase
          .from('firestore_docs')
          .select('data')
          .eq('collection', src.parent)
          .eq('doc_id', parentId)
          .maybeSingle();
        if (parent?.data) {
          subjectId = parent.data.subjectId || parent.data.subject_id || null;
          classId = parent.data.classId || parent.data.class_id || null;
          itemName = parent.data.title || itemName;
        }
      }

      const totalPoints = Number(a.totalPoints || 0);
      out.push({
        studentId,
        subjectId,
        classId,
        itemName,
        score: Number(a.score || 0),
        totalPoints: totalPoints || 100,
        percentage: a.percentage != null ? Number(a.percentage) : 0,
        createdAt: subDate || null,
      });
    }
  }
  return out;
}

/**
 * Aggregate a list of ReportGrades into subject buckets + overall totals.
 */
function aggregateGrades(grades: ReportGrade[], subjectNameMap: Map<string, string>) {
  const subjectMap: Record<string, { scores: number[]; totalPoints: number; maxPoints: number }> = {};
  for (const g of grades) {
    const name = (g.subjectId && subjectNameMap.get(g.subjectId)) || 'General';
    if (!subjectMap[name]) subjectMap[name] = { scores: [], totalPoints: 0, maxPoints: 0 };
    subjectMap[name].scores.push(g.percentage || 0);
    subjectMap[name].totalPoints += g.score || 0;
    subjectMap[name].maxPoints += g.totalPoints || 100;
  }
  const subjectEntries = Object.entries(subjectMap);
  const overallTotal = subjectEntries.reduce((sum, [, d]) => sum + d.totalPoints, 0);
  const overallMax = subjectEntries.reduce((sum, [, d]) => sum + d.maxPoints, 0);
  const overallPercentage = overallMax > 0 ? Math.round((overallTotal / overallMax) * 100) : 0;
  return { subjectMap, subjectEntries, overallTotal, overallMax, overallPercentage };
}

export async function getParentChildrenIds(parentId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin()!;
  const { data: parentDoc } = await supabase.from('users').select('children_ids').eq('id', parentId).maybeSingle();
  if (!parentDoc) throw new NotFoundError('Parent not found');
  return (parentDoc.children_ids as string[]) ?? [];
}

export async function getChildDetails(childIds: string[]) {
  const supabase = getSupabaseAdmin()!;
  const { data: childRows } = await supabase.from('users').select('*').in('id', childIds);
  const children = await Promise.all(
    (childRows || []).map(async (row) => {
      let classInfo: { name?: string; grade?: number; section?: string } | null = null;
      if (row.class_id) {
        const { data: cls } = await supabase.from('classes').select('name, grade, section').eq('id', row.class_id).maybeSingle();
        if (cls) classInfo = cls;
      }
      const { password, ...rest } = row;
      return { id: row.id, ...rest, classInfo };
    }),
  );
  return children;
}

export async function getChildProfile(studentId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: studentRow } = await supabase.from('users').select('*').eq('id', studentId).maybeSingle();
  if (!studentRow) throw new NotFoundError('Student not found');
  const { password: _sp, ...student } = studentRow;
  return student;
}

export async function getChildClassName(classId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin()!;
  const { data: cls } = await supabase.from('classes').select('name').eq('id', classId).maybeSingle();
  return cls?.name ?? null;
}

export async function getChildDisplayName(studentId: string): Promise<string> {
  const supabase = getSupabaseAdmin()!;
  const { data: studentRow } = await supabase.from('users').select('display_name').eq('id', studentId).maybeSingle();
  return studentRow?.display_name || 'Student';
}

export async function verifyChildOwnership(parentId: string, studentId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()!;
  const { data: parentDoc } = await supabase.from('users').select('children_ids').eq('id', parentId).maybeSingle();
  const childrenIds: string[] = (parentDoc?.children_ids as string[]) ?? [];
  return childrenIds.includes(studentId);
}

export async function getChildDisplayNames(childIds: string[]): Promise<Map<string, string>> {
  const supabase = getSupabaseAdmin()!;
  const nameMap = new Map<string, string>();
  for (const childId of childIds) {
    const { data: studentRow } = await supabase.from('users').select('display_name').eq('id', childId).maybeSingle();
    if (studentRow) nameMap.set(childId, studentRow.display_name || 'Student');
  }
  return nameMap;
}

/**
 * Lightweight overall score for a student using the SAME grade sources and
 * math as the report card (merged stores + attempt fallback + academic-year
 * window). Used by the recommendations engine so its "Avg" always matches the
 * report card's "Overall Score" — including zero-scored assessments.
 */
export async function getStudentOverallScore(
  studentId: string,
  academicYear?: string,
): Promise<{ overallPercentage: number; totalAssessments: number }> {
  const supabase = getSupabaseAdmin()!;
  const current = await getCurrentAcademicYear();
  const year = academicYear || current.name;
  const { yearStart, yearEnd } = await academicYearWindow(supabase, year);

  let reportGrades = await fetchGradesForStudent(supabase, studentId, yearStart, yearEnd);
  if (reportGrades.length === 0) {
    reportGrades = await fetchAttemptsForStudent(supabase, studentId, yearStart, yearEnd);
  }
  const { overallPercentage } = aggregateGrades(reportGrades, new Map());
  return { overallPercentage, totalAssessments: reportGrades.length };
}

export async function getYearlyReport(studentId: string, academicYear: string): Promise<any> {
  const supabase = getSupabaseAdmin()!;

  const { data: student } = await supabase.from('users').select('display_name, email, class_ids, school_id').eq('id', studentId).maybeSingle();

  const { yearStart, yearEnd, endDate } = await academicYearWindow(supabase, academicYear);

  // 1) Grades from both stores; fall back to attempt data when none exist.
  let reportGrades = await fetchGradesForStudent(supabase, studentId, yearStart, yearEnd);
  if (reportGrades.length === 0) {
    reportGrades = await fetchAttemptsForStudent(supabase, studentId, yearStart, yearEnd);
  }

  const subjectIds = [...new Set(reportGrades.map(g => g.subjectId).filter(Boolean))] as string[];
  let subjectNameMap = new Map<string, string>();
  if (subjectIds.length > 0) {
    const { data: subjects } = await supabase.from('subjects').select('id, name').in('id', subjectIds);
    subjectNameMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));
  }

  const { subjectMap, overallPercentage } = aggregateGrades(reportGrades, subjectNameMap);

  const subjects = Object.entries(subjectMap).map(([name, data]) => ({
    name,
    averagePercentage: Math.round((data.totalPoints / data.maxPoints) * 100),
    grade: getLetterGrade((data.totalPoints / data.maxPoints) * 100),
    assessmentsCount: data.scores.length,
  }));

  const gpa = (overallPercentage / 25).toFixed(1);

  const { data: attendance } = await supabase.from('attendance')
    .select('status')
    .eq('student_id', studentId)
    .gte('date', yearStart)
    .lte('date', endDate);

  const totalDays = attendance?.length || 0;
  const presentDays = attendance?.filter(a => a.status === 'present').length || 0;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const { data: conceptMastery } = await supabase.from('concept_mastery')
    .select('concept_id, concept_title, mastery_score')
    .eq('student_id', studentId)
    .lt('mastery_score', 0.7)
    .order('mastery_score')
    .limit(5);

  const { data: gamification } = await supabase.from('firestore_docs')
    .select('data')
    .eq('collection', 'gamificationProfiles')
    .eq('doc_id', studentId)
    .maybeSingle();
  const gamificationData = (gamification?.data as any) || {};

  const classId = student?.class_ids?.[0];
  const { globalRank, classRank, totalStudents, classTotalStudents } = await computeRanks(studentId, student?.school_id, classId, academicYear);

  return {
    student: { name: student?.display_name, id: studentId, class: classId },
    academicYear,
    overallPercentage,
    gpa: parseFloat(gpa),
    letterGrade: getLetterGrade(overallPercentage),
    subjects,
    attendance: { totalDays, presentDays, percentage: attendancePercentage },
    weakConcepts: (conceptMastery || []).map(c => ({
      conceptId: c.concept_id,
      name: c.concept_title || 'Unknown',
      masteryScore: Math.round(c.mastery_score * 100),
    })),
    gamification: {
      xp: gamificationData.xp || 0,
      level: gamificationData.level || 1,
      badges: gamificationData.badges?.length || 0,
      streak: gamificationData.streak || 0,
    },
    totalAssessments: reportGrades.length,
    rank: globalRank || null,
    globalRank: globalRank || null,
    classRank: classRank || null,
    totalStudents: totalStudents || 0,
    classTotalStudents: classTotalStudents || 0,
    generatedAt: new Date().toISOString(),
  };
}

async function computeRanks(
  studentId: string,
  schoolId: string | undefined,
  classId: string | undefined,
  academicYear: string,
): Promise<{ globalRank: number | null; classRank: number | null; totalStudents: number; classTotalStudents: number }> {
  const supabase = getSupabaseAdmin()!;
  const { yearStart, yearEnd } = await academicYearWindow(supabase, academicYear);

  let studentQuery = supabase.from('users').select('id, class_ids').eq('role', 'student');
  if (schoolId) studentQuery = studentQuery.eq('school_id', schoolId);
  const { data: students } = await studentQuery.limit(2000);
  if (!students || students.length === 0) return { globalRank: null, classRank: null, totalStudents: 0, classTotalStudents: 0 };

  const ids = new Set(students.map((s: any) => s.id));

  // Per-student totals from BOTH grade stores, filtered to the school's students.
  const perStudent: Record<string, { totalPoints: number; maxPoints: number }> = {};

  const { data: allDocs } = await supabase
    .from('firestore_docs')
    .select('data')
    .eq('collection', 'grades')
    .limit(5000);
  for (const row of allDocs || []) {
    const g = row?.data as Record<string, unknown> | null;
    if (!g || !g.studentId || !ids.has(g.studentId as string)) continue;
    const created = typeof g.createdAt === 'string' ? g.createdAt : '';
    if (!inWindow(created, yearStart, yearEnd)) continue;
    if (!perStudent[g.studentId as string]) perStudent[g.studentId as string] = { totalPoints: 0, maxPoints: 0 };
    perStudent[g.studentId as string].totalPoints += Number(g.score || 0);
    perStudent[g.studentId as string].maxPoints += Number(g.totalPoints || g.maxScore || g.max_score || 100);
  }

  const { data: allTableGrades } = await supabase
    .from('grades')
    .select('student_id, score, total_points, max_score, created_at, createdAt')
    .limit(5000);
  for (const row of allTableGrades || []) {
    if (!row?.student_id || !ids.has(row.student_id)) continue;
    const raw = row.created_at ?? row.createdAt;
    const created = typeof raw === 'string' ? raw : raw instanceof Date ? raw.toISOString() : '';
    if (!inWindow(created, yearStart, yearEnd)) continue;
    if (!perStudent[row.student_id]) perStudent[row.student_id] = { totalPoints: 0, maxPoints: 0 };
    perStudent[row.student_id].totalPoints += Number(row.score || 0);
    perStudent[row.student_id].maxPoints += Number(row.total_points || row.max_score || 100);
  }

  // Students with only attempts (no formal grades) still count toward ranking.
  // Fetch all and filter in JS — an in() over 2000 UUIDs would blow the URL limit.
  for (const src of ATTEMPT_SOURCES) {
    const { data: attempts } = await supabase
      .from('firestore_docs')
      .select('data')
      .eq('collection', src.collection)
      .limit(5000);
    for (const row of attempts || []) {
      const a = row?.data as Record<string, unknown> | null;
      if (!a || !a.studentId || !ids.has(a.studentId as string)) continue;
      const subDate = typeof a.submittedAt === 'string' ? a.submittedAt : typeof a.startedAt === 'string' ? a.startedAt : '';
      if (!inWindow(subDate, yearStart, yearEnd)) continue;
      if (!perStudent[a.studentId as string]) perStudent[a.studentId as string] = { totalPoints: 0, maxPoints: 0 };
      perStudent[a.studentId as string].totalPoints += Number(a.score || 0);
      perStudent[a.studentId as string].maxPoints += Number(a.totalPoints || 100);
    }
  }

  const scored = Object.entries(perStudent).map(([id, s]) => ({
    id,
    pct: s.maxPoints > 0 ? Math.round((s.totalPoints / s.maxPoints) * 100) : 0,
  })).sort((a, b) => b.pct - a.pct || a.id.localeCompare(b.id));

  const self = perStudent[studentId];
  const selfPct = self && self.maxPoints > 0
    ? Math.round((self.totalPoints / self.maxPoints) * 100)
    : null;

  let globalRank: number | null = null;
  if (selfPct != null && scored.length > 0) {
    const selfIndex = scored.findIndex(s => s.id === studentId);
    if (selfIndex >= 0) {
      let r = selfIndex + 1;
      while (r > 1 && scored[r - 2].pct === selfPct) r--;
      globalRank = r;
    }
  }

  let classRank: number | null = null;
  let classTotalStudents = 0;
  if (classId && selfPct != null) {
    const classIds = new Set(students.filter((s: any) => (s.class_ids || []).includes(classId)).map((s: any) => s.id));
    classTotalStudents = classIds.size;
    const classScored = scored.filter(s => classIds.has(s.id));
    const selfIndex = classScored.findIndex(s => s.id === studentId);
    if (selfIndex >= 0) {
      let r = selfIndex + 1;
      while (r > 1 && classScored[r - 2].pct === selfPct) r--;
      classRank = r;
    }
  }

  return { globalRank, classRank, totalStudents: scored.length, classTotalStudents };
}

function getLetterGrade(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}
