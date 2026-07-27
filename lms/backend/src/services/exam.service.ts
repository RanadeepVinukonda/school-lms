import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { createBulkNotifications } from './notification.service';

/** List all exams with optional courseId filter, paginated by createdAt desc. */
export async function listAllExams(query: { page?: string; limit?: string; courseId?: string; schoolId?: string }) {
  const { page, limit } = parsePagination(query);
  const offset = (page - 1) * limit;

  const supabase = getSupabaseAdmin()!;
  let q = supabase.from('exams').select('*', { count: 'exact' });
  
  if (query.schoolId) q = q.eq('school_id', query.schoolId);
  if (query.courseId) q = q.eq('course_id', query.courseId);
  q = q.order('created_at', { ascending: false });

  const { data: items, count, error } = await q.range(offset, offset + limit - 1);
  if (error) throw error;

  return {
    items: items || [],
    total: count || 0,
    page,
    limit,
  };
}

/** Create a new exam, assign IDs to each question, and notify enrolled students. */
export async function createExam(data: {
  title: string;
  description?: string;
  courseId: string;
  questions: Array<{
    questionText: string;
    type: string;
    points: number;
    options?: string[];
    correctAnswer?: string;
    correctAnswers?: string[];
    explanation?: string;
  }>;
  timeLimit: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  isPublished?: boolean;
  instructions?: string;
  proctored?: boolean;
  schoolId?: string;
}) {
  const supabase = getSupabaseAdmin()!;
  const examId = uuidv4();
  const now = new Date().toISOString();

  const totalPoints = data.questions.reduce((sum, q) => sum + q.points, 0);
  const questionsWithIds = data.questions.map((q, i) => ({ ...q, id: `q_${examId}_${i}` }));

  const examData = {
    id: examId,
    title: data.title,
    description: data.description || '',
    course_id: data.courseId,
    questions: questionsWithIds,
    total_points: totalPoints,
    attempt_count: 0,
    scheduled_classes: [],
    created_at: now,
    updated_at: now,
    school_id: data.schoolId || null,
    time_limit: data.timeLimit,
    passing_score: data.passingScore,
    max_attempts: data.maxAttempts,
    shuffle_questions: data.shuffleQuestions,
    show_results: data.showResults,
    is_published: data.isPublished,
    proctored: data.proctored,
  };

  const { error } = await supabase.from('exams').insert(examData);
  if (error) throw error;

  // Notify enrolled students
  try {
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('course_id', data.courseId)
      .eq('status', 'active');
    if (enrollError) throw enrollError;
    
    const notifications = (enrollments || []).map((e: { student_id: string }) => ({
      userId: e.student_id,
      type: 'exam',
      title: 'New Exam Created',
      body: `${data.title} has been created (${data.timeLimit} min, ${totalPoints} pts)`,
      data: { examId, courseId: data.courseId, link: `/exams/${examId}` },
    }));
    
    if (notifications.length > 0) await createBulkNotifications(notifications);
  } catch (err) {
    logger.warn('Failed to send exam notifications', { error: err });
  }

  logger.info('Exam created', { examId, courseId: data.courseId, title: data.title });

  return { ...examData, courseId: data.courseId };
}

/** Update exam fields. Throws NotFoundError if missing. */
export async function updateExam(examId: string, data: Record<string, unknown>) {
  const supabase = getSupabaseAdmin()!;
  const { data: existing, error: fetchError } = await supabase
    .from('exams')
    .select('id')
    .eq('id', examId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  if (!existing) {
    throw new NotFoundError('Exam not found');
  }

  const allowedFields = ['title', 'description', 'duration', 'totalPoints', 'isPublished', 'shuffleQuestions', 'instructions', 'passingScore'];
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(data)) {
    if (allowedFields.includes(k)) updateData[k] = v;
  }

  const { error } = await supabase.from('exams').update(updateData).eq('id', examId);
  if (error) throw error;

  const { data: updated, error: readError } = await supabase.from('exams').select('*').eq('id', examId).single();
  if (readError) throw readError;
  logger.info('Exam updated', { examId });

  return updated;
}

/** Delete an exam by id. Throws NotFoundError if missing. */
export async function deleteExam(examId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: existing, error: fetchError } = await supabase
    .from('exams')
    .select('id')
    .eq('id', examId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  if (!existing) {
    throw new NotFoundError('Exam not found');
  }

  const { error } = await supabase.from('exams').update({ deleted_at: new Date().toISOString() }).eq('id', examId);
  if (error) throw error;

  logger.info('Exam deleted', { examId });
}

/** Fetch a single exam by id. Throws NotFoundError if missing. */
export async function getExamById(examId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .maybeSingle();

  if (error || !data) {
    throw new NotFoundError('Exam not found');
  }

  return data;
}

export { scheduleExam, startExamAttempt, submitExamAttempt, gradeExamAttempt, releaseExamGrades, getExamResults } from './exam-scheduling.service';