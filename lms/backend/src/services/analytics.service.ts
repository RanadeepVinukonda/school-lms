import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';
import { getCurrentAcademicYear } from './academic-year.service';
import { safePct } from './analytics-admin.service';

export {
  getClassPerformance,
  getStudentPerformance,
  getAssessmentAnalytics,
} from './analytics-report.service';

export {
  getConceptsForClass,
  getConceptOversight,
  getConductedTests,
} from './analytics-charts.service';

export { getAdminDashboard, getCourseAnalytics } from './analytics-admin.service';

export async function getStudentDashboard(studentId: string) {
  const supabase = getSupabaseAdmin()!;

  const currentYear = await getCurrentAcademicYear();
  const yearStart = currentYear?.startDate ? new Date(currentYear.startDate as string) : null;

  let enrollments: { courseId: string }[] = [];
  try {
    const { data, error } = await supabase
      .from('enrollments')
      .select('courseId')
      .eq('studentId', studentId)
      .eq('status', 'active');
    if (error) logger.error('getStudentDashboard enrollments error', { studentId, error: error.message });
    else enrollments = (data || []) as { courseId: string }[];
  } catch (e: any) { logger.error('getStudentDashboard enrollments exception', { studentId, error: e.message }); }

  const courseIds = enrollments.map((e) => e.courseId);
  const totalCourses = courseIds.length;

  let unreadNotificationsCount = 0;
  try {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', studentId)
      .eq('read', false);
    unreadNotificationsCount = count || 0;
  } catch (e: any) { logger.error('getStudentDashboard notifications error', { studentId, error: e.message }); }

  let gradesList: any[] = [];
  const fetchGrades = async (idColumn: string, createdAtColumn: string): Promise<any[]> => {
    let gradeQuery = supabase
      .from('grades')
      .select('*')
      .eq(idColumn, studentId);
    if (yearStart) gradeQuery = gradeQuery.gte(createdAtColumn, yearStart.toISOString());
    const { data, error } = await gradeQuery;
    if (error) throw error;
    return (data || []) as any[];
  };
  try {
    try {
      gradesList = await fetchGrades('student_id', 'created_at');
    } catch (e: any) {
      if (/student_id|created_at/.test(e.message || '')) gradesList = await fetchGrades('studentId', 'createdAt');
      else throw e;
    }
  } catch (e: any) { logger.error('getStudentDashboard grades error', { studentId, error: e.message }); }

  const gradePct = (g: any): number | null => {
    if (g.percentage != null) return Number(g.percentage);
    const points = (g.totalPoints ?? g.total_points ?? g.maxScore ?? g.max_score) || 0;
    const sc = g.score ?? 0;
    if (points > 0) return Math.round((sc / points) * 100);
    return null;
  };
  const totalScore = gradesList.reduce((sum: number, g: any) => sum + (g.score || 0), 0);
  const totalPoints = gradesList.reduce(
    (sum: number, g: any) => sum + ((g.totalPoints ?? g.total_points ?? g.maxScore ?? g.max_score) || 1),
    0,
  );
  const overallGrade = safePct(totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0);

  let quizAttempts: any[] = [];
  try {
    const { data } = await supabase
      .from('firestore_docs')
      .select('data')
      .eq('collection', 'quizAttemptV2')
      .eq('data->>studentId', studentId);
    quizAttempts = ((data || []) as any[]).filter((a) => (a.data as any)?.percentage != null);
  } catch (e: any) { logger.error('getStudentDashboard quizAttempts error', { studentId, error: e.message }); }

  let assignAttempts: any[] = [];
  try {
    const { data } = await supabase
      .from('firestore_docs')
      .select('data')
      .eq('collection', 'assignmentSubmissionV2')
      .eq('data->>studentId', studentId);
    assignAttempts = ((data || []) as any[]).filter((a) => (a.data as any)?.percentage != null);
  } catch (e: any) { logger.error('getStudentDashboard assignAttempts error', { studentId, error: e.message }); }

  const allPercentages: number[] = [];
  for (const g of gradesList) { const pct = gradePct(g); if (pct != null && pct > 0) allPercentages.push(pct); }
  for (const a of quizAttempts) { const pct = (a.data as any)?.percentage; const subDate = (a.data as any)?.submittedAt; if (pct > 0 && (!yearStart || !subDate || new Date(subDate) >= yearStart)) allPercentages.push(pct); }
  for (const a of assignAttempts) { const pct = (a.data as any)?.percentage; const subDate = (a.data as any)?.submittedAt; if (pct > 0 && (!yearStart || !subDate || new Date(subDate) >= yearStart)) allPercentages.push(pct); }

  const totalAssessments = gradesList.length + quizAttempts.length + assignAttempts.length;
  const avgGrade = allPercentages.length > 0
    ? Math.round(allPercentages.reduce((s, p) => s + p, 0) / allPercentages.length) : 0;

  const now = new Date().toISOString();

  let pendingAssignments = 0;
  let upcomingExams = 0;
  try {
    const { count } = await supabase
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .in('course_id', courseIds.length > 0 ? courseIds : [])
      .gte('due_date', now);
    pendingAssignments = count || 0;
  } catch (e: any) { logger.error('getStudentDashboard pendingAssignments error', { studentId, error: e.message }); }

  try {
    const { count } = await supabase
      .from('exams')
      .select('id', { count: 'exact', head: true })
      .in('course_id', courseIds.length > 0 ? courseIds : [])
      .gte('start_date', now);
    upcomingExams = count || 0;
  } catch (e: any) { logger.error('getStudentDashboard upcomingExams error', { studentId, error: e.message }); }

  logger.info('Student dashboard retrieved', { studentId });

  return {
    totalCourses,
    unreadNotifications: unreadNotificationsCount,
    overallGrade,
    averageScore: avgGrade,
    totalAssessments,
    pendingAssignments,
    upcomingExams,
    recentActivity: [],
  };
}

export async function getTeacherDashboard(teacherId: string) {
  const supabase = getSupabaseAdmin()!;

  const { data: courses, error: coursesErr } = await supabase
    .from('courses')
    .select('id, enrollment_count')
    .eq('teacher_id', teacherId);
  if (coursesErr) throw new Error(coursesErr.message);

  const totalCourses = (courses || []).length;

  let totalStudents = 0;
  let pendingGrading = 0;
  
  if (courses && courses.length > 0) {
    const courseIds = courses.map((c: { id: string }) => c.id);
    
    const { count: submissionsCount } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .in('course_id', courseIds)
      .eq('status', 'submitted');
    
    pendingGrading = submissionsCount || 0;
    totalStudents = courses.reduce((sum: number, c: { enrollment_count?: number }) => sum + (c.enrollment_count || 0), 0);
  }

  const { count: unreadNotificationsCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', teacherId)
    .eq('read', false);

  logger.info('Teacher dashboard retrieved', { teacherId });

  return {
    totalCourses,
    totalStudents,
    pendingGrading,
    unreadNotifications: unreadNotificationsCount || 0,
  };
}
