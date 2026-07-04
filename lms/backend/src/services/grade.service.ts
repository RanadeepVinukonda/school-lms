import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabase';
import { buildDocData } from '../database/schema';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { createNotification, createBulkNotifications } from './notification.service';

async function gradeRow(gradeId: string) {
  const supabase = getSupabaseClient()!;
  const { data } = await supabase.from('grades').select('*').eq('id', gradeId).maybeSingle();
  if (!data) return null;
  return { id: data.id, ...buildDocData(data as Record<string, unknown>, 'grades') } as any;
}

/** Get all grades for a student, optionally filtered by academic year/schoolId. */
export async function getStudentGrades(studentId: string, academicYear?: string, schoolId?: string) {
  const supabase = getSupabaseClient()!;
  let query = supabase.from('grades').select('*').eq('studentId', studentId);
  if (schoolId) query = query.contains('data', { schoolId });
  if (academicYear) query = query.contains('data', { academicYear });

  const { data: rows } = await query.order('createdAt', { ascending: false });
  return (rows || []).map((row) => ({ id: row.id, ...buildDocData(row as Record<string, unknown>, 'grades') }));
}

/** Query the gradebook with filters (classId, courseId, subjectId, term, academicYear, schoolId), paginated. */
export async function getGradebook(query: {
  classId?: string;
  courseId?: string;
  subjectId?: string;
  term?: string;
  academicYear?: string;
  page?: string;
  limit?: string;
  schoolId?: string;
}) {
  const supabase = getSupabaseClient()!;
  const { page, limit } = parsePagination(query);
  const offset = (page - 1) * limit;

  let dbQuery = supabase.from('grades').select('*', { count: 'exact', head: true });
  if (query.schoolId) dbQuery = dbQuery.contains('data', { schoolId: query.schoolId });
  if (query.classId) dbQuery = dbQuery.contains('data', { classId: query.classId });
  if (query.courseId) dbQuery = dbQuery.eq('courseId', query.courseId);
  if (query.subjectId) dbQuery = dbQuery.contains('data', { subjectId: query.subjectId });
  if (query.term) dbQuery = dbQuery.contains('data', { term: query.term });
  if (query.academicYear) dbQuery = dbQuery.contains('data', { academicYear: query.academicYear });

  const { count } = await dbQuery.order('createdAt', { ascending: false });
  const total = count || 0;

  let dataQuery = supabase.from('grades').select('*');
  if (query.schoolId) dataQuery = dataQuery.contains('data', { schoolId: query.schoolId });
  if (query.classId) dataQuery = dataQuery.contains('data', { classId: query.classId });
  if (query.courseId) dataQuery = dataQuery.eq('courseId', query.courseId);
  if (query.subjectId) dataQuery = dataQuery.contains('data', { subjectId: query.subjectId });
  if (query.term) dataQuery = dataQuery.contains('data', { term: query.term });
  if (query.academicYear) dataQuery = dataQuery.contains('data', { academicYear: query.academicYear });

  const { data: rows } = await dataQuery.order('createdAt', { ascending: false }).range(offset, offset + limit - 1);
  const items = (rows || []).map((row: any) => ({ id: row.id, ...buildDocData(row, 'grades') }));

  return { items, total, page, limit };
}

/** Update a single grade record, calculate letter grade, and notify the student. */
export async function updateGrade(gradeId: string, data: {
  score: number;
  totalPoints: number;
  letterGrade?: string;
  remarks?: string;
  gradedBy: string;
}) {
  const existing = await gradeRow(gradeId);
  if (!existing) throw new NotFoundError('Grade not found');

  const percentage = Math.round((data.score / data.totalPoints) * 100);
  const letterGrade = data.letterGrade || calculateLetterGrade(percentage);

  const merged = {
    ...existing,
    score: data.score,
    totalPoints: data.totalPoints,
    letterGrade,
    percentage,
    remarks: data.remarks || '',
    gradedBy: data.gradedBy,
    updatedAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient()!;
  await supabase.from('grades').update({
    score: data.score,
    letterGrade,
    data: merged,
  }).eq('id', gradeId);

  try {
    await createNotification({
      userId: existing.studentId as string,
      type: 'grade',
      title: 'Grade Updated',
      body: `Your grade has been updated: ${data.score}/${data.totalPoints} (${percentage}%)`,
      data: { gradeId, courseId: existing.courseId as string, link: `/student/subjects/${existing.courseId}` },
    });
  } catch (err) {
    logger.warn('Failed to send grade notification', { error: err });
  }

  logger.info('Grade updated', { gradeId, gradedBy: data.gradedBy });
  return merged;
}

/** Bulk update or insert grades for multiple students in a course. Notifies all affected students. */
export async function bulkUpdate(grades: Array<{
  studentId: string;
  score: number;
  totalPoints: number;
  feedback?: string;
}>, courseId: string, gradedBy: string, schoolId?: string) {
  const supabase = getSupabaseClient()!;
  const results = [];

  for (const grade of grades) {
    const gradeId = `${courseId}_${grade.studentId}`;
    const existing = await gradeRow(gradeId);

    const percentage = Math.round((grade.score / grade.totalPoints) * 100);
    const now = new Date().toISOString();

    if (existing) {
      const merged = {
        ...existing,
        score: grade.score,
        totalPoints: grade.totalPoints,
        percentage,
        feedback: grade.feedback || '',
        gradedBy,
        updatedAt: now,
      };
      await supabase.from('grades').update({ score: grade.score, data: merged }).eq('id', gradeId);
    } else {
      const docData = {
        studentId: grade.studentId,
        courseId,
        score: grade.score,
        totalPoints: grade.totalPoints,
        percentage,
        feedback: grade.feedback || '',
        gradedBy,
        schoolId: schoolId || '',
        createdAt: now,
        updatedAt: now,
      };
      await supabase.from('grades').insert({
        id: gradeId,
        studentId: grade.studentId,
        courseId,
        score: grade.score,
        data: docData,
      });
    }

    results.push({ id: gradeId, studentId: grade.studentId, score: grade.score, percentage });
  }

  try {
    const notifications = results.map((r) => ({
      userId: r.studentId,
      type: 'grade',
      title: 'Grades Published',
      body: `Your grade for ${courseId}: ${r.score}/${grades.find(g => g.studentId === r.studentId)?.totalPoints || 100}`,
      data: { courseId, link: `/student/subjects/${courseId}` },
    }));
    if (notifications.length > 0) await createBulkNotifications(notifications);
  } catch (err) {
    logger.warn('Failed to send bulk grade notifications', { error: err });
  }

  logger.info('Bulk grades updated', { courseId, count: grades.length, gradedBy });
  return results;
}

/** Generate a student's report card for a given academic year and term with overall GPA. */
export async function generateReport(studentId: string, academicYear: string, term: string, schoolId?: string) {
  const supabase = getSupabaseClient()!;
  let query = supabase.from('grades').select('*').eq('studentId', studentId)
    .contains('data', { academicYear, term });
  if (schoolId) query = query.contains('data', { schoolId });

  const { data: rows } = await query;
  const gradesList = (rows || []).map((row) => buildDocData(row as Record<string, unknown>, 'grades'));

  const totalScore = gradesList.reduce((sum: number, g: Record<string, unknown>) => sum + ((g.score as number) || 0), 0);
  const totalPoints = gradesList.reduce((sum: number, g: Record<string, unknown>) => sum + ((g.totalPoints as number) || 1), 0);
  const overallPercentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
  const gpa = calculateGPA(overallPercentage);

  return {
    studentId,
    academicYear,
    term,
    grades: gradesList,
    summary: {
      totalCourses: gradesList.length,
      totalScore,
      totalPoints,
      overallPercentage,
      gpa,
      letterGrade: calculateLetterGrade(overallPercentage),
    },
  };
}

/** Convert a numeric percentage to a letter grade (A+ through F). */
function calculateLetterGrade(percentage: number): string {
  if (percentage >= 97) return 'A+';
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 63) return 'D';
  if (percentage >= 60) return 'D-';
  return 'F';
}

/** Convert a numeric percentage to a GPA (0.0 – 4.0 scale). */
function calculateGPA(percentage: number): number {
  if (percentage >= 93) return 4.0;
  if (percentage >= 90) return 3.7;
  if (percentage >= 87) return 3.3;
  if (percentage >= 83) return 3.0;
  if (percentage >= 80) return 2.7;
  if (percentage >= 77) return 2.3;
  if (percentage >= 73) return 2.0;
  if (percentage >= 70) return 1.7;
  if (percentage >= 67) return 1.3;
  if (percentage >= 63) return 1.0;
  if (percentage >= 60) return 0.7;
  return 0.0;
}
