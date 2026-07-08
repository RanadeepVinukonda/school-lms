import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { createNotification, createBulkNotifications } from './notification.service';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecord = Record<string, any>;

interface GradeRow {
  id: string;
  studentId: string;
  courseId: string;
  score: number;
  totalPoints: number;
  letterGrade?: string;
  percentage?: number;
  feedback?: string;
  remarks?: string;
  gradedBy?: string;
  schoolId?: string;
  academicYear?: string;
  term?: string;
  createdAt?: string;
  updatedAt?: string;
  student_id?: string;
  course_id?: string;
  letter_grade?: string;
  graded_by?: string;
  academic_year?: string;
  school_id?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

function toGradeRow(row: Record<string, unknown>): GradeRow {
  return {
    id: row.id as string,
    studentId: (row.studentId as string) || (row.student_id as string) || '',
    courseId: (row.courseId as string) || (row.course_id as string) || '',
    score: (row.score as number) || 0,
    totalPoints: (row.totalPoints as number) || (row.total_points as number) || 0,
    letterGrade: (row.letterGrade as string) || (row.letter_grade as string),
    percentage: (row.percentage as number),
    feedback: row.feedback as string,
    remarks: row.remarks as string,
    gradedBy: (row.gradedBy as string) || (row.graded_by as string),
    schoolId: (row.schoolId as string) || (row.school_id as string),
    academicYear: (row.academicYear as string) || (row.academic_year as string),
    term: row.term as string,
    createdAt: (row.createdAt as string) || (row.created_at as string),
    updatedAt: (row.updatedAt as string) || (row.updated_at as string),
  };
}

async function gradeRow(gradeId: string): Promise<GradeRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('grades').select('*').eq('id', gradeId).maybeSingle();
  if (error) throw new Error('Failed to fetch grade: ' + error.message);
  return data ? toGradeRow(data) : null;
}

/** Get all grades for a student. */
export async function getStudentGrades(studentId: string, academicYear?: string, schoolId?: string) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('grades').select('*').filter('studentId', 'eq', studentId);
  if (schoolId) query = query.filter('schoolId', 'eq', schoolId);
  if (academicYear) query = query.filter('academicYear', 'eq', academicYear);
  const { data: rows, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error('Failed to fetch grades: ' + error.message);
  return (rows || []).map((r) => toGradeRow(r));
}

/** Query the gradebook with filters, paginated. */
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
  const supabase = getSupabaseAdmin();
  const { page, limit } = parsePagination(query);
  const offset = (page - 1) * limit;

  let dbQuery = supabase.from('grades').select('*', { count: 'exact' });
  if (query.schoolId) dbQuery = dbQuery.filter('schoolId', 'eq', query.schoolId);
  if (query.classId) dbQuery = dbQuery.filter('classId', 'eq', query.classId);
  if (query.courseId) dbQuery = dbQuery.filter('courseId', 'eq', query.courseId);
  if (query.subjectId) dbQuery = dbQuery.filter('subjectId', 'eq', query.subjectId);
  if (query.term) dbQuery = dbQuery.filter('term', 'eq', query.term);
  if (query.academicYear) dbQuery = dbQuery.filter('academicYear', 'eq', query.academicYear);

  const { data: rows, count, error } = await dbQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error('Failed to fetch gradebook: ' + error.message);
  return { items: (rows || []).map((r) => toGradeRow(r)), total: count || 0, page, limit };
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
  const now = new Date().toISOString();

  const supabase = getSupabaseAdmin();
  const { error: updateError } = await supabase.from('grades').update({
    score: data.score,
    totalPoints: data.totalPoints,
    letterGrade,
    percentage,
    remarks: data.remarks || '',
    gradedBy: data.gradedBy,
    updatedAt: now,
  }).eq('id', gradeId);
  if (updateError) throw new Error(`Failed to update grade: ${updateError.message}`);

  try {
    await createNotification({
      userId: existing.studentId,
      type: 'grade',
      title: 'Grade Updated',
      body: `Your grade has been updated: ${data.score}/${data.totalPoints} (${percentage}%)`,
      data: { gradeId, courseId: existing.courseId, link: `/student/subjects/${existing.courseId}` },
    });
  } catch (err) {
    logger.warn('Failed to send grade notification', {
      gradeId,
      studentId: existing.studentId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  logger.info('Grade updated', { gradeId, gradedBy: data.gradedBy });
  return { ...existing, score: data.score, totalPoints: data.totalPoints, letterGrade, percentage };
}

/** Bulk update or insert grades for multiple students. */
export async function bulkUpdate(grades: Array<{
  studentId: string;
  score: number;
  totalPoints: number;
  feedback?: string;
}>, courseId: string, gradedBy: string, schoolId?: string) {
  const supabase = getSupabaseAdmin();
  const results: Array<{ id: string; studentId: string; score: number; percentage: number }> = [];
  const now = new Date().toISOString();

  for (const grade of grades) {
    const gradeId = `${courseId}_${grade.studentId}`;
    const existing = await gradeRow(gradeId);
    const percentage = Math.round((grade.score / grade.totalPoints) * 100);

    if (existing) {
      const { error: updateErr } = await supabase.from('grades').update({
        score: grade.score,
        totalPoints: grade.totalPoints,
        percentage,
        feedback: grade.feedback || '',
        gradedBy,
        updatedAt: now,
      }).eq('id', gradeId);
      if (updateErr) throw new Error(`Failed to update grade: ${updateErr.message}`);
    } else {
      const { error: insertErr } = await supabase.from('grades').insert({
        id: gradeId,
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
      });
      if (insertErr) throw new Error(`Failed to insert grade: ${insertErr.message}`);
    }
    results.push({ id: gradeId, studentId: grade.studentId, score: grade.score, percentage });
  }

  try {
    const notifications = results.map((r) => ({
      userId: r.studentId,
      type: 'grade' as const,
      title: 'Grades Published',
      body: `Your grade for ${courseId}: ${r.score}/${grades.find((g) => g.studentId === r.studentId)?.totalPoints || 100}`,
      data: { courseId, link: `/student/subjects/${courseId}` },
    }));
    if (notifications.length > 0) await createBulkNotifications(notifications);
  } catch (err) {
    logger.warn('Failed to send bulk grade notifications', {
      courseId,
      count: grades.length,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  logger.info('Bulk grades updated', { courseId, count: grades.length, gradedBy });
  return results;
}

/** Generate a student's report card for a given academic year and term. */
export async function generateReport(studentId: string, academicYear: string, term: string, schoolId?: string) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('grades').select('*')
    .filter('studentId', 'eq', studentId)
    .filter('academicYear', 'eq', academicYear)
    .filter('term', 'eq', term);
  if (schoolId) query = query.filter('schoolId', 'eq', schoolId);

  const { data: rows, error } = await query;
  if (error) throw new Error('Failed to fetch report grades: ' + error.message);
  const gradesList = (rows || []).map((r) => toGradeRow(r));

  const totalScore = gradesList.reduce((sum, g) => sum + (g.score || 0), 0);
  const totalPoints = gradesList.reduce((sum, g) => sum + (g.totalPoints || 1), 0);
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
