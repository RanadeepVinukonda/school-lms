import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from '../services/supabase';
import { logger } from '../utils/logger';

export type ReportType = 'weekly' | 'monthly';

export async function generateWeeklyReport() {
  const now = new Date();
  const endDate = now.toISOString();
  const start = new Date(now); start.setDate(now.getDate() - 7);
  const startDate = start.toISOString();

  const reportData = await gatherReportData(startDate, endDate);
  const report = {
    id: uuidv4(),
    type: 'weekly' as ReportType,
    periodStart: startDate,
    periodEnd: endDate,
    ...reportData,
  };

  const supabase = getSupabaseAdmin()!;
  const { error } = await supabase.from('firestore_docs').upsert({
    collection: 'reports',
    doc_id: report.id,
    data: report,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;

  logger.info('Weekly report generated', { reportId: report.id });
  return report;
}

export async function generateMonthlyReport() {
  const now = new Date();
  const endDate = now.toISOString();
  const start = new Date(now); start.setMonth(now.getMonth() - 1);
  const startDate = start.toISOString();

  const reportData = await gatherReportData(startDate, endDate);
  const report = {
    id: uuidv4(),
    type: 'monthly' as ReportType,
    periodStart: startDate,
    periodEnd: endDate,
    ...reportData,
  };

  const supabase = getSupabaseAdmin()!;
  const { error } = await supabase.from('firestore_docs').upsert({
    collection: 'reports',
    doc_id: report.id,
    data: report,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;

  logger.info('Monthly report generated', { reportId: report.id });
  return report;
}

async function gatherReportData(startDate: string, _endDate: string) {
  const supabase = getSupabaseAdmin()!;

  const { data: allUsers } = await supabase.from('users').select('id, role');
  const students = (allUsers || []).filter(u => u.role === 'student');
  const teachers = (allUsers || []).filter(u => u.role === 'teacher');

  const { data: grades } = await supabase.from('grades').select('score, totalPoints');
  const totalScore = (grades || []).reduce((s, g) => s + (g.score || 0), 0);
  const totalPoints = (grades || []).reduce((s, g: any) => s + (g.totalPoints || 1), 0);
  const avgGrade = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

  const { count: totalCourses } = await supabase
    .from('firestore_docs')
    .select('*', { count: 'exact', head: true })
    .eq('collection', 'courses');

  const { data: assignments } = await supabase
    .from('firestore_docs')
    .select('doc_id')
    .eq('collection', 'assignmentV2');
  const totalAssignments = (assignments || []).length;

  const { data: submissions } = await supabase
    .from('firestore_docs')
    .select('doc_id')
    .eq('collection', 'assignmentSubmissionV2')
    .gte('data->>submittedAt', startDate);
  const submissionsInPeriod = (submissions || []).length;

  return {
    totalStudents: students.length,
    totalTeachers: teachers.length,
    totalCourses: totalCourses || 0,
    totalAssignments,
    submissionsInPeriod,
    averageGrade: avgGrade,
    generatedAt: new Date().toISOString(),
  };
}
