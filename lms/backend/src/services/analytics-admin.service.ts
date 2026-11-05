import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

export function safePct(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export async function getAdminDashboard() {
  const supabase = getSupabaseAdmin()!;

  const { count: studentsCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'student')
    .is('deleted_at', null);
  const { count: teachersCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'teacher')
    .is('deleted_at', null);
  const { count: adminsCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .is('deleted_at', null);
  const { count: parentsCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'parent')
    .is('deleted_at', null);

  const { count: totalCourses } = await supabase
    .from('courses')
    .select('id', { count: 'exact', head: true });
  const { count: publishedCourses } = await supabase
    .from('courses')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published');

  const { count: totalClasses } = await supabase
    .from('classes')
    .select('id', { count: 'exact', head: true });
  const { count: activeClasses } = await supabase
    .from('classes')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  const [quizAttemptRes, examAttemptRes, submitRes] = await Promise.all([
    supabase.from('firestore_docs').select('data').eq('collection', 'quizAttemptV2'),
    supabase.from('firestore_docs').select('data').eq('collection', 'examAttemptV2'),
    supabase.from('firestore_docs').select('data').eq('collection', 'assignmentSubmissionV2'),
  ]);

  let totalScore = 0;
  let totalPoints = 0;
  let totalAttempts = 0;
  const studentScores: Record<string, { total: number; count: number }> = {};
  const uniqueStudentIds = new Set<string>();

  for (const arr of [quizAttemptRes.data || [], examAttemptRes.data || [], submitRes.data || []]) {
    for (const a of arr) {
      const pct = a.data?.percentage;
      if (pct == null) continue;
      const studentId = a.data?.studentId;
      if (!studentId) continue;
      totalScore += pct;
      totalPoints += 100;
      totalAttempts++;
      uniqueStudentIds.add(studentId);
      if (!studentScores[studentId]) studentScores[studentId] = { total: 0, count: 0 };
      studentScores[studentId].total += pct;
      studentScores[studentId].count++;
    }
  }

  const averagePerformance = totalPoints > 0 ? safePct(Math.round((totalScore / totalPoints) * 100)) : 0;
  const totalGrades = uniqueStudentIds.size;

  let atRiskCount = 0;
  for (const s of Object.values(studentScores)) {
    const avg = s.count > 0 ? s.total / s.count : 0;
    if (avg < 40) atRiskCount++;
  }

  logger.info('Admin dashboard retrieved', { totalAttempts, uniqueStudents: totalGrades, atRiskCount });

  return {
    totalUsers: (studentsCount || 0) + (teachersCount || 0) + (adminsCount || 0) + (parentsCount || 0),
    totalStudents: studentsCount || 0,
    totalTeachers: teachersCount || 0,
    totalAdmins: adminsCount || 0,
    totalParents: parentsCount || 0,
    totalCourses: totalCourses || 0,
    publishedCourses: publishedCourses || 0,
    totalClasses: totalClasses || 0,
    activeClasses: activeClasses || 0,
    averagePerformance,
    atRiskCount,
    totalGrades,
  };
}

export async function getCourseAnalytics(courseId: string) {
  const supabase = getSupabaseAdmin()!;

  const { data: courseDoc, error: courseDocErr } = await supabase
    .from('courses')
    .select('title')
    .eq('id', courseId)
    .maybeSingle();
  if (courseDocErr) throw new Error(courseDocErr.message);

  if (!courseDoc) {
    return null;
  }

  const { count: enrolledStudents } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('courseId', courseId)
    .eq('status', 'active');

  const { count: totalLessons } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);

  const { count: totalAssignments } = await supabase
    .from('assignments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);

  const { count: totalSubmissions } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);

  const { data: grades, error: gradesErr } = await supabase
    .from('grades')
    .select('score, totalPoints')
    .eq('courseId', courseId);
  if (gradesErr) throw new Error(gradesErr.message);

  const gradesList = grades || [];
  const totalScore = gradesList.reduce((sum: number, g: { score?: number }) => sum + (g.score || 0), 0);
  const totalPoints = gradesList.reduce((sum: number, g: { totalPoints?: number }) => sum + (g.totalPoints || 1), 0);
  const averageGrade = safePct(totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0);

  const { data: lessons, error: lessonsErr } = await supabase
    .from('lessons')
    .select('id, title, completed_by')
    .eq('course_id', courseId);
  if (lessonsErr) throw new Error(lessonsErr.message);

  const completionRates: Array<{ lesson_id: string; title: string; completed_by: number }> = [];
  for (const row of lessons || []) {
    completionRates.push({
      lesson_id: row.id,
      title: row.title || '',
      completed_by: Array.isArray(row.completed_by) ? row.completed_by.length : 0,
    });
  }

  logger.info('Course analytics retrieved', { courseId });

  return {
    courseId,
    courseTitle: courseDoc.title,
    enrolledStudents: enrolledStudents || 0,
    totalLessons: totalLessons || 0,
    totalAssignments: totalAssignments || 0,
    totalSubmissions: totalSubmissions || 0,
    submissionRate: safePct((totalAssignments || 0) > 0 ? Math.round((totalSubmissions || 0) / (totalAssignments || 1) * 100) : 0),
    averageGrade,
    completionRates,
  };
}
