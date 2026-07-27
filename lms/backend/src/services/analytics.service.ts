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
  
  const { data: enrollments, error: enrollmentsErr } = await supabase
    .from('enrollments')
    .select('courseId')
    .eq('studentId', studentId)
    .eq('status', 'active');
  if (enrollmentsErr) throw new Error(enrollmentsErr.message);
  
  const courseIds = (enrollments || []).map((e: { courseId: string }) => e.courseId);
  const totalCourses = courseIds.length;

  const { count: unreadNotificationsCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', studentId)
    .eq('read', false);

  let gradeQuery = supabase
    .from('grades')
    .select('score, totalPoints, percentage, createdAt')
    .eq('studentId', studentId);
  if (yearStart) {
    gradeQuery = gradeQuery.gte('createdAt', yearStart.toISOString());
  }
  const { data: grades, error: gradesErr } = await gradeQuery;
  if (gradesErr) throw new Error(gradesErr.message);

  const gradesList = grades || [];
  const totalScore = gradesList.reduce((sum: number, g: { score?: number }) => sum + (g.score || 0), 0);
  const totalPoints = gradesList.reduce((sum: number, g: { totalPoints?: number }) => sum + (g.totalPoints || 1), 0);
  const overallGrade = safePct(totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0);

  const { data: quizAttempts } = await supabase
    .from('firestore_docs')
    .select('data')
    .eq('collection', 'quizAttemptV2')
    .eq('data->>studentId', studentId)
    .eq('data->>status', 'completed');

  const { data: assignAttempts } = await supabase
    .from('firestore_docs')
    .select('data')
    .eq('collection', 'assignmentSubmissionV2')
    .eq('data->>studentId', studentId)
    .eq('data->>status', 'completed');

  const allPercentages: number[] = [];
  for (const g of gradesList) { if (g.percentage > 0) allPercentages.push(g.percentage); }
  for (const a of (quizAttempts || [])) { const pct = (a.data as any)?.percentage; const subDate = (a.data as any)?.submittedAt; if (pct > 0 && (!yearStart || !subDate || new Date(subDate) >= yearStart)) allPercentages.push(pct); }
  for (const a of (assignAttempts || [])) { const pct = (a.data as any)?.percentage; const subDate = (a.data as any)?.submittedAt; if (pct > 0 && (!yearStart || !subDate || new Date(subDate) >= yearStart)) allPercentages.push(pct); }

  const totalAssessments = gradesList.length + (quizAttempts?.length || 0) + (assignAttempts?.length || 0);
  const avgGrade = allPercentages.length > 0
    ? Math.round(allPercentages.reduce((s, p) => s + p, 0) / allPercentages.length) : 0;

  const now = new Date().toISOString();
  
  const { count: pendingAssignments } = await supabase
    .from('assignments')
    .select('id', { count: 'exact', head: true })
    .in('course_id', courseIds.length > 0 ? courseIds : [])
    .gte('due_date', now);
  
  const { count: upcomingExams } = await supabase
    .from('exams')
    .select('id', { count: 'exact', head: true })
    .in('course_id', courseIds.length > 0 ? courseIds : [])
    .gte('start_date', now);

  logger.info('Student dashboard retrieved', { studentId });

  return {
    totalCourses,
    unreadNotifications: unreadNotificationsCount || 0,
    overallGrade,
    averageScore: avgGrade,
    totalAssessments,
    pendingAssignments: pendingAssignments || 0,
    upcomingExams: upcomingExams || 0,
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
