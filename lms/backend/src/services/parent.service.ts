import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';

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

export async function getYearlyReport(studentId: string, academicYear: string): Promise<any> {
  const supabase = getSupabaseAdmin()!;

  const { data: student } = await supabase.from('users').select('display_name, email, class_ids, school_id').eq('id', studentId).maybeSingle();

  const year = parseInt(academicYear, 10) || new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year + 1}-01-01`;

  const { data: grades } = await supabase.from('firestore_docs')
    .select('data')
    .eq('collection', 'grades')
    .eq('data->>studentId', studentId)
    .limit(500);

  const allGrades = (grades || []).map(g => g.data as any);
  const yearGrades = allGrades.filter(g => {
    const created = (g.createdAt as string) || '';
    return !created || (created >= yearStart && created < yearEnd);
  });

  const subjectIds = [...new Set(yearGrades.map(g => g.subjectId).filter(Boolean))];
  let subjectNameMap = new Map<string, string>();
  if (subjectIds.length > 0) {
    const { data: subjects } = await supabase.from('subjects').select('id, name').in('id', subjectIds);
    subjectNameMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));
  }

  const subjectMap: Record<string, { scores: number[]; totalPoints: number; maxPoints: number }> = {};
  for (const g of yearGrades) {
    const name = subjectNameMap.get(g.subjectId) || 'General';
    if (!subjectMap[name]) subjectMap[name] = { scores: [], totalPoints: 0, maxPoints: 0 };
    subjectMap[name].scores.push(g.percentage || 0);
    subjectMap[name].totalPoints += g.score || 0;
    subjectMap[name].maxPoints += g.totalPoints || g.maxScore || 100;
  }

  const subjects = Object.entries(subjectMap).map(([name, data]) => ({
    name,
    averagePercentage: Math.round((data.totalPoints / data.maxPoints) * 100),
    grade: getLetterGrade((data.totalPoints / data.maxPoints) * 100),
    assessmentsCount: data.scores.length,
  }));

  const overallPercentage = subjects.length > 0
    ? Math.round(subjects.reduce((sum, s) => sum + s.averagePercentage, 0) / subjects.length)
    : 0;
  const gpa = (overallPercentage / 25).toFixed(1);

  const { data: attendance } = await supabase.from('attendance')
    .select('status')
    .eq('student_id', studentId)
    .gte('date', `${academicYear}-01-01`)
    .lte('date', `${academicYear}-12-31`);

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
    totalAssessments: yearGrades.length,
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

  const year = parseInt(academicYear, 10) || new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year + 1}-01-01`;

  let studentQuery = supabase.from('users').select('id, class_ids').eq('role', 'student');
  if (schoolId) studentQuery = studentQuery.eq('school_id', schoolId);
  const { data: students } = await studentQuery.limit(2000);
  if (!students || students.length === 0) return { globalRank: null, classRank: null, totalStudents: 0, classTotalStudents: 0 };

  const ids = students.map((s: any) => s.id);
  const { data: allGrades } = await supabase
    .from('firestore_docs')
    .select('data')
    .eq('collection', 'grades')
    .limit(5000);

  const perStudent: Record<string, { totalPoints: number; maxPoints: number }> = {};
  (allGrades || []).forEach((row: any) => {
    const g = row.data as any;
    if (!g || !g.studentId || !ids.includes(g.studentId)) return;
    const created = (g.createdAt as string) || '';
    if (created && (created < yearStart || created >= yearEnd)) return;
    if (!perStudent[g.studentId]) perStudent[g.studentId] = { totalPoints: 0, maxPoints: 0 };
    perStudent[g.studentId].totalPoints += g.score || 0;
    perStudent[g.studentId].maxPoints += g.totalPoints || g.maxScore || 100;
  });

  const scored = Object.entries(perStudent).map(([id, s]) => ({
    id,
    pct: s.maxPoints > 0 ? Math.round((s.totalPoints / s.maxPoints) * 100) : 0,
  })).sort((a, b) => b.pct - a.pct || a.id.localeCompare(b.id));

  const selfPct = perStudent[studentId]?.maxPoints > 0
    ? Math.round((perStudent[studentId].totalPoints / perStudent[studentId].maxPoints) * 100)
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
