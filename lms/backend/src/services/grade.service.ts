import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { createNotification, createBulkNotifications } from './notification.service';

async function gradeRow(gradeId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('grades').select('*').eq('id', gradeId).maybeSingle();
  if (error) throw new Error('Failed to fetch grade: ' + error.message);
  return data || null;
}

/** Get all grades for a student, optionally filtered by academic year/schoolId. */
export async function getStudentGrades(studentId: string, academicYear?: string, schoolId?: string) {
  const supabase = getSupabaseAdmin()!;
  let query = supabase.from('grades').select('*').eq('studentId', studentId);
  if (schoolId) query = query.eq('schoolId', schoolId);
  if (academicYear) query = query.eq('academicYear', academicYear);

  const { data: rows, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error('Failed to fetch grades: ' + error.message);
  return rows || [];
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
  const supabase = getSupabaseAdmin()!;
  const { page, limit } = parsePagination(query);
  const offset = (page - 1) * limit;

  let dbQuery = supabase.from('grades').select('*', { count: 'exact' });
  if (query.schoolId) dbQuery = dbQuery.eq('schoolId', query.schoolId);
  if (query.classId) dbQuery = dbQuery.eq('classId', query.classId);
  if (query.courseId) dbQuery = dbQuery.eq('courseId', query.courseId);
  if (query.subjectId) dbQuery = dbQuery.eq('subjectId', query.subjectId);
  if (query.term) dbQuery = dbQuery.eq('term', query.term);
  if (query.academicYear) dbQuery = dbQuery.eq('academicYear', query.academicYear);

  const { data: rows, count, error } = await dbQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error('Failed to fetch gradebook: ' + error.message);

  return { items: rows || [], total: count || 0, page, limit };
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

  const supabase = getSupabaseAdmin()!;
  const { error: updateError } = await supabase.from('grades').update({
    score: data.score,
    totalPoints: data.totalPoints,
    letterGrade: letterGrade,
    percentage,
    remarks: data.remarks || '',
    gradedBy: data.gradedBy,
    updatedAt: now,
  }).eq('id', gradeId);
  if (updateError) throw new Error(`Failed to update grade: ${updateError.message}`);

  try {
    await createNotification({
      userId: existing.studentId as string,
      type: 'grade',
      title: 'Grade Updated',
      body: `Your grade has been updated: ${data.score}/${data.totalPoints} (${percentage}%)`,
      data: { gradeId, courseId: existing.courseId as string, link: `/student/subjects/${existing.courseId}` },
    });
  } catch (err) {
    logger.warn('Failed to send grade notification', {
      gradeId,
      studentId: existing.student_id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logger.info('Grade updated', { gradeId, gradedBy: data.gradedBy });
  return { ...existing, score: data.score, totalPoints: data.totalPoints, letterGrade, percentage };
}

/** Bulk update or insert grades for multiple students in a course. Notifies all affected students. */
export async function bulkUpdate(grades: Array<{
  studentId: string;
  score: number;
  totalPoints: number;
  feedback?: string;
}>, courseId: string, gradedBy: string, schoolId?: string) {
  const supabase = getSupabaseAdmin()!;
  const results = [];
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
        gradedBy: gradedBy,
        updatedAt: now,
      }).eq('id', gradeId);
      if (updateErr) throw new Error(`Failed to update grade: ${updateErr.message}`);
    } else {
      const { error: insertErr } = await supabase.from('grades').insert({
        id: gradeId,
        studentId: grade.studentId,
        courseId: courseId,
        score: grade.score,
        totalPoints: grade.totalPoints,
        percentage,
        feedback: grade.feedback || '',
        gradedBy: gradedBy,
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
      type: 'grade',
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

/** Generate a student's report card for a given academic year and term with overall GPA. */
export async function generateReport(studentId: string, academicYear: string, term: string, schoolId?: string) {
  const supabase = getSupabaseAdmin()!;
  let query = supabase.from('grades').select('*').eq('studentId', studentId)
    .eq('academicYear', academicYear).eq('term', term);
  if (schoolId) query = query.eq('schoolId', schoolId);

  const { data: rows, error } = await query;
  if (error) throw new Error('Failed to fetch report grades: ' + error.message);
  const gradesList = rows || [];

  const totalScore = gradesList.reduce((sum: number, g: any) => sum + (g.score || 0), 0);
  const totalPoints = gradesList.reduce((sum: number, g: any) => sum + (g.totalPoints || 1), 0);
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
