import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { createNotification, createBulkNotifications } from './notification.service';
import { BaseService, DbRecord } from '../lib/base-service';

// ── Grade Base Service (for standard CRUD) ───────────────

interface GradeRecord extends DbRecord {
  student_id: string;
  course_id: string;
  score: number;
  total_points: number;
  letter_grade?: string;
  percentage?: number;
  feedback?: string;
  remarks?: string;
  graded_by?: string;
  academic_year?: string;
  term?: string;
}

class GradeBaseService extends BaseService<GradeRecord> {
  protected readonly table = 'grades';
}

const gradeBase = new GradeBaseService();

// ── Public API ───────────────────────────────────────────

/** Get all grades for a student. */
export async function getStudentGrades(studentId: string, academicYear?: string, schoolId?: string) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('grades').select('*').eq('student_id', studentId);
  if (schoolId) query = query.eq('school_id', schoolId);
  if (academicYear) query = query.eq('academic_year', academicYear);
  const { data: rows, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error('Failed to fetch grades: ' + error.message);
  return (rows || []).map(toGradeResponse);
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
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10) || 20));
  const offset = (page - 1) * limit;

  let dbQuery = supabase.from('grades').select('*', { count: 'exact' });
  if (query.schoolId) dbQuery = dbQuery.eq('school_id', query.schoolId);
  if (query.courseId) dbQuery = dbQuery.eq('course_id', query.courseId);
  if (query.term) dbQuery = dbQuery.eq('term', query.term);
  if (query.academicYear) dbQuery = dbQuery.eq('academic_year', query.academicYear);

  const { data: rows, count, error } = await dbQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error('Failed to fetch gradebook: ' + error.message);
  return { items: (rows || []).map(toGradeResponse), total: count || 0, page, limit };
}

/** Update a single grade record, calculate letter grade, and notify the student. */
export async function updateGrade(gradeId: string, data: {
  score: number;
  totalPoints: number;
  letterGrade?: string;
  remarks?: string;
  gradedBy: string;
}) {
  const existing = await gradeBase.findById(gradeId);
  if (!existing) throw new NotFoundError('Grade not found');

  const percentage = Math.round((data.score / data.totalPoints) * 100);
  const letterGrade = data.letterGrade || calculateLetterGrade(percentage);

  await gradeBase.update(gradeId, {
    score: data.score,
    total_points: data.totalPoints,
    letter_grade: letterGrade,
    percentage,
    remarks: data.remarks || '',
    graded_by: data.gradedBy,
  } as any);

  try {
    await createNotification({
      userId: existing.student_id,
      type: 'grade',
      title: 'Grade Updated',
      body: `Your grade has been updated: ${data.score}/${data.totalPoints} (${percentage}%)`,
      data: { gradeId, courseId: existing.course_id, link: `/student/subjects/${existing.course_id}` },
    });
  } catch (err) {
    logger.warn('Failed to send grade notification', {
      gradeId, studentId: existing.student_id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  logger.info('Grade updated', { gradeId, gradedBy: data.gradedBy });
  return { ...toGradeResponse(existing), score: data.score, totalPoints: data.totalPoints, letterGrade, percentage };
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
    const existing = await gradeBase.findById(gradeId);
    const percentage = Math.round((grade.score / grade.totalPoints) * 100);

    if (existing) {
      await supabase.from('grades').update({
        score: grade.score, total_points: grade.totalPoints, percentage,
        feedback: grade.feedback || '', graded_by: gradedBy, updated_at: now,
      }).eq('id', gradeId);
    } else {
      const { error: insertErr } = await supabase.from('grades').insert({
        id: gradeId, student_id: grade.studentId, course_id: courseId,
        score: grade.score, total_points: grade.totalPoints, percentage,
        feedback: grade.feedback || '', graded_by: gradedBy,
        school_id: schoolId || '', created_at: now, updated_at: now,
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
      courseId, count: grades.length,
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
    .eq('student_id', studentId)
    .eq('academic_year', academicYear)
    .eq('term', term);
  if (schoolId) query = query.eq('school_id', schoolId);

  const { data: rows, error } = await query;
  if (error) throw new Error('Failed to fetch report grades: ' + error.message);

  const gradesList = (rows || []).map(toGradeResponse);
  const totalScore = gradesList.reduce((sum, g) => sum + (Number(g.score) || 0), 0);
  const totalPoints = gradesList.reduce((sum, g) => sum + (Number(g.totalPoints) || 1), 0);
  const overallPercentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

  return {
    studentId, academicYear, term,
    grades: gradesList,
    summary: {
      totalCourses: gradesList.length, totalScore, totalPoints,
      overallPercentage, gpa: calculateGPA(overallPercentage),
      letterGrade: calculateLetterGrade(overallPercentage),
    },
  };
}

// ── Helpers ──────────────────────────────────────────────

function toGradeResponse(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    score: row.score,
    totalPoints: row.total_points,
    letterGrade: row.letter_grade,
    percentage: row.percentage,
    feedback: row.feedback,
    remarks: row.remarks,
    gradedBy: row.graded_by,
    schoolId: row.school_id,
    academicYear: row.academic_year,
    term: row.term,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
