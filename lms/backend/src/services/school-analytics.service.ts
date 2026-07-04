import { getSupabaseAdmin } from './supabase';
import { getAdminDashboard } from './analytics.service';

function safePct(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export async function getGradeComparison(schoolId?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];

  let usersQuery = supabase.from('users').select('*');
  if (schoolId) usersQuery = usersQuery.eq('school_id', schoolId);
  const { data: users } = await usersQuery;

  let classesQuery = supabase.from('classes').select('*');
  if (schoolId) classesQuery = classesQuery.eq('school_id', schoolId);
  const { data: classes } = await classesQuery;

  let gradesQuery = supabase.from('grades').select('*');
  if (schoolId) gradesQuery = gradesQuery.eq('school_id', schoolId);
  const { data: grades } = await gradesQuery;

  const gradeMap: Record<string, { totalScore: number; totalPoints: number; count: number }> = {};

  for (const g of (grades || [])) {
    const student = (users || []).find((u: any) => u.id === g.student_id);
    if (!student) continue;
    const cls = (classes || []).find((c: any) => c.id === student.class_id || (student.class_ids && student.class_ids.includes(c.id)));
    const gradeKey = cls?.grade || 'Unknown';
    if (!gradeMap[gradeKey]) gradeMap[gradeKey] = { totalScore: 0, totalPoints: 0, count: 0 };
    gradeMap[gradeKey].totalScore += g.score || 0;
    gradeMap[gradeKey].totalPoints += g.total_points || 0;
    gradeMap[gradeKey].count++;
  }

  return Object.entries(gradeMap).map(([grade, data]) => ({
    grade,
    averageScore: data.totalPoints > 0 ? safePct(Math.round((data.totalScore / data.totalPoints) * 100)) : 0,
    studentCount: data.count,
    totalPoints: data.totalPoints,
  }));
}

export async function getTeacherComparison(schoolId?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];

  let usersQuery = supabase.from('users').select('*');
  if (schoolId) usersQuery = usersQuery.eq('school_id', schoolId);
  const { data: users } = await usersQuery;

  let classesQuery = supabase.from('classes').select('*');
  if (schoolId) classesQuery = classesQuery.eq('school_id', schoolId);
  const { data: classes } = await classesQuery;

  let gradesQuery = supabase.from('grades').select('*');
  if (schoolId) gradesQuery = gradesQuery.eq('school_id', schoolId);
  const { data: grades } = await gradesQuery;

  const teacherMap: Record<string, { totalScore: number; totalPoints: number; count: number; classIds: Set<string> }> = {};

  for (const cls of (classes || [])) {
    if (cls.teacher_ids) {
      for (const tid of cls.teacher_ids) {
        if (!teacherMap[tid]) teacherMap[tid] = { totalScore: 0, totalPoints: 0, count: 0, classIds: new Set() };
        teacherMap[tid].classIds.add(cls.id);
      }
    }
  }

  for (const g of (grades || [])) {
    const cls = (classes || []).find((c: any) => c.id === g.class_id);
    if (!cls || !cls.teacher_ids) continue;
    for (const tid of cls.teacher_ids) {
      const data = teacherMap[tid];
      if (data) {
        data.totalScore += g.score || 0;
        data.totalPoints += g.total_points || 0;
        data.count++;
      }
    }
  }

  return Object.entries(teacherMap).map(([teacherId, data]) => {
    const teacher = (users || []).find((u: any) => u.id === teacherId);
    return {
      teacherId,
      teacherName: teacher?.display_name || 'Unknown',
      averageScore: data.totalPoints > 0 ? safePct(Math.round((data.totalScore / data.totalPoints) * 100)) : 0,
      studentCount: data.count,
      classCount: data.classIds.size,
    };
  });
}

export async function getClassComparison(schoolId?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];

  let classesQuery = supabase.from('classes').select('*');
  if (schoolId) classesQuery = classesQuery.eq('school_id', schoolId);
  const { data: classes } = await classesQuery;

  let gradesQuery = supabase.from('grades').select('*');
  if (schoolId) gradesQuery = gradesQuery.eq('school_id', schoolId);
  const { data: grades } = await gradesQuery;

  const classMap: Record<string, { totalScore: number; totalPoints: number; count: number }> = {};

  for (const g of (grades || [])) {
    const clsId = g.class_id;
    if (!clsId) continue;
    if (!classMap[clsId]) classMap[clsId] = { totalScore: 0, totalPoints: 0, count: 0 };
    classMap[clsId].totalScore += g.score || 0;
    classMap[clsId].totalPoints += g.total_points || 0;
    classMap[clsId].count++;
  }

  return Object.entries(classMap).map(([classId, data]) => {
    const cls = (classes || []).find((c: any) => c.id === classId);
    return {
      classId,
      className: cls?.name || 'Unknown',
      grade: cls?.grade || '',
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

  let query = supabase.from('grades').select('*');
  if (schoolId) query = query.eq('school_id', schoolId);
  const { data: grades } = await query;

  const monthMap: Record<string, { totalScore: number; totalPoints: number; count: number }> = {};

  for (const g of (grades || [])) {
    const date = g.exam_date || g.created_at || g.updated_at;
    if (!date) continue;
    const month = date.substring(0, 7);
    if (!monthMap[month]) monthMap[month] = { totalScore: 0, totalPoints: 0, count: 0 };
    monthMap[month].totalScore += g.score || 0;
    monthMap[month].totalPoints += g.total_points || 0;
    monthMap[month].count++;
  }

  return Object.entries(monthMap)
    .map(([month, data]) => ({
      month,
      averageScore: data.totalPoints > 0 ? safePct(Math.round((data.totalScore / data.totalPoints) * 100)) : 0,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
