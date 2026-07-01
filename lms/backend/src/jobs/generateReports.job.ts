import { v4 as uuidv4 } from 'uuid';
import { collections } from '../database/registry';
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

  await collections.reports().doc(report.id).set(report);
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

  await collections.reports().doc(report.id).set(report);
  logger.info('Monthly report generated', { reportId: report.id });
  return report;
}

async function gatherReportData(startDate: string, endDate: string) {
  const usersSnap = await collections.users().get();
  const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() as Record<string, unknown> })) as Array<Record<string, unknown> & { role?: string }>;
  const students = allUsers.filter(u => u.role === 'student');
  const teachers = allUsers.filter(u => u.role === 'teacher');

  const gradesSnap = await collections.grades().get();
  const grades = gradesSnap.docs.map(d => d.data() as { score?: number; totalPoints?: number });
  const totalScore = grades.reduce((s, g) => s + (g.score || 0), 0);
  const totalPoints = grades.reduce((s, g) => s + (g.totalPoints || 1), 0);
  const avgGrade = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

  const coursesSnap = await collections.courses().count().get();
  const totalCourses = coursesSnap.data().count;

  const assignmentsSnap = await collections.assignmentV2().get();
  const totalAssignments = assignmentsSnap.docs.length;

  const submissionsSnap = await collections.assignmentSubmissionV2()
    .where('submittedAt', '>=', startDate)
    .get();
  const submissionsInPeriod = submissionsSnap.docs.length;

  return {
    totalStudents: students.length,
    totalTeachers: teachers.length,
    totalCourses,
    totalAssignments,
    submissionsInPeriod,
    averageGrade: avgGrade,
    generatedAt: new Date().toISOString(),
  };
}
