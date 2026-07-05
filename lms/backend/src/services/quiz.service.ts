import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

/** List all quizzes with optional courseId filter, paginated by createdAt desc. */
export async function listAllQuizzes(query: { page?: string; limit?: string; courseId?: string; schoolId?: string }) {
  const { page, limit } = parsePagination(query);
  const offset = (page - 1) * limit;

  const supabase = getSupabaseClient()!;
  let q = supabase.from('quizzes').select('*', { count: 'exact' });
  
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

/** Create a new quiz with calculated totalPoints. */
export async function createQuiz(data: {
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
  timeLimit?: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  isPublished?: boolean;
  dueDate?: string;
  instructions?: string;
  schoolId?: string;
}) {
  const supabase = getSupabaseClient()!;
  const quizId = uuidv4();
  const now = new Date().toISOString();

  const totalPoints = data.questions.reduce((sum, q) => sum + q.points, 0);

  const quizData = {
    id: quizId,
    title: data.title,
    description: data.description || '',
    course_id: data.courseId,
    questions: data.questions,
    total_points: totalPoints,
    attempt_count: 0,
    created_at: now,
    updated_at: now,
    school_id: data.schoolId || null,
    time_limit: data.timeLimit,
    passing_score: data.passingScore,
    max_attempts: data.maxAttempts,
    shuffle_questions: data.shuffleQuestions,
    show_results: data.showResults,
    is_published: data.isPublished,
    due_date: data.dueDate,
  };

  const { error } = await supabase.from('quizzes').insert(quizData);
  if (error) throw error;

  logger.info('Quiz created', { quizId, courseId: data.courseId, title: data.title });

  return { ...quizData, courseId: data.courseId };
}

/** Update quiz fields. Throws NotFoundError if missing. */
export async function updateQuiz(quizId: string, data: Record<string, unknown>) {
  const supabase = getSupabaseClient()!;
  const { data: existing } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', quizId)
    .maybeSingle();

  if (!existing) {
    throw new NotFoundError('Quiz not found');
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(data)) {
    updateData[k] = v;
  }

  const { error } = await supabase.from('quizzes').update(updateData).eq('id', quizId);
  if (error) throw error;

  const { data: updated } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
  logger.info('Quiz updated', { quizId });

  return updated;
}

/** Delete a quiz by id. Throws NotFoundError if missing. */
export async function deleteQuiz(quizId: string) {
  const supabase = getSupabaseClient()!;
  const { data: existing } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', quizId)
    .maybeSingle();

  if (!existing) {
    throw new NotFoundError('Quiz not found');
  }

  const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
  if (error) throw new Error(`Failed to delete quizzes: ${error.message}`);
  logger.info('Quiz deleted', { quizId });
}

/** Fetch a single quiz by id. Throws NotFoundError if missing. */
export async function getQuizById(quizId: string) {
  const supabase = getSupabaseClient()!;
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .maybeSingle();

  if (error || !data) {
    throw new NotFoundError('Quiz not found');
  }

  return data;
}

/** Start a quiz attempt for a student. Enforces maxAttempts. */
export async function startAttempt(quizId: string, studentId: string) {
  const supabase = getSupabaseClient()!;
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .maybeSingle();

  if (!quiz) {
    throw new NotFoundError('Quiz not found');
  }

  const { count: existingCount } = await supabase
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .eq('student_id', studentId);

  if (quiz.max_attempts && (existingCount || 0) >= quiz.max_attempts) {
    throw new ForbiddenError('Maximum attempts reached');
  }

  const attemptId = uuidv4();
  const now = new Date().toISOString();

  const attempt = {
    id: attemptId,
    quiz_id: quizId,
    student_id: studentId,
    started_at: now,
    submitted_at: null,
    answers: [],
    score: null,
    total_points: quiz.total_points,
    percentage: null,
    passed: null,
    time_spent: 0,
    status: 'in_progress',
  };

  const { error } = await supabase.from('quiz_attempts').insert(attempt);
  if (error) throw new Error(`Failed to insert quiz_attempts: ${error.message}`);
  
  const { data: currentQuiz } = await supabase.from('quizzes').select('attempt_count').eq('id', quizId).single();
  const { error: updateError } = await supabase.from('quizzes').update({ attempt_count: (currentQuiz?.attempt_count || 0) + 1 }).eq('id', quizId);
  if (updateError) throw new Error(`Failed to update quizzes: ${updateError.message}`);

  logger.info('Quiz attempt started', { quizId, studentId, attemptId });

  return { ...attempt, questions: quiz.questions };
}

/** Submit a quiz attempt, auto-grade MC / true-false / short-answer questions. */
export async function submitAttempt(attemptId: string, studentId: string, data: {
  answers: Array<{
    questionId: string;
    answer: string | string[];
    timeSpent?: number;
  }>;
  startedAt: string;
  submittedAt: string;
}) {
  const supabase = getSupabaseClient()!;
  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  if (!attempt) {
    throw new NotFoundError('Attempt not found');
  }

  if (attempt.student_id !== studentId) {
    throw new ForbiddenError('Not your attempt');
  }

  if (attempt.status !== 'in_progress') {
    throw new ForbiddenError('Attempt already submitted');
  }

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', attempt.quiz_id)
    .single();

  let score = 0;
  const gradedAnswers = data.answers.map((answer) => {
    const question = quiz.questions.find(
      (q: { questionText?: string; id?: string; type: string; points: number; correctAnswer?: string }) => 
        q.id === answer.questionId || q.questionText === answer.questionId
    );

    if (!question) {
      return { ...answer, isCorrect: false, pointsEarned: 0 };
    }

    let isCorrect = false;
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      isCorrect = answer.answer === question.correctAnswer;
    } else if (question.type === 'short_answer') {
      isCorrect = answer.answer.toString().toLowerCase().trim() ===
        question.correctAnswer?.toString().toLowerCase().trim();
    }

    const pointsEarned = isCorrect ? question.points : 0;
    if (isCorrect) score += pointsEarned;

    return {
      question_id: question.questionText || question.id || answer.questionId,
      answer: answer.answer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      time_spent: answer.timeSpent || 0,
    };
  });

  const timeSpent = data.answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
  const percentage = Math.round((score / quiz.total_points) * 100);
  const passingScore = quiz.passing_score || 50;
  const passed = percentage >= passingScore;

  const result = {
    answers: gradedAnswers,
    score,
    total_points: quiz.total_points,
    percentage,
    passed,
    time_spent: timeSpent,
    submitted_at: data.submittedAt,
    status: 'completed',
  };

  const { error } = await supabase.from('quiz_attempts').update(result).eq('id', attemptId);
  if (error) throw error;

  logger.info('Quiz attempt submitted', { attemptId, studentId, score, percentage });

  const { data: updated } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('id', attemptId)
    .single();
  
  return updated;
}

/** Toggle whether quiz results (correct answers) are visible to students. */
export async function releaseQuizGrades(quizId: string, showResults: boolean) {
  const supabase = getSupabaseClient()!;
  const { data: existing } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', quizId)
    .maybeSingle();

  if (!existing) {
    throw new NotFoundError('Quiz not found');
  }

  const { error } = await supabase.from('quizzes').update({ show_results: showResults, updated_at: new Date().toISOString() }).eq('id', quizId);
  if (error) throw new Error(`Failed to update quizzes: ${error.message}`);
  logger.info('Quiz grades release toggled', { quizId, showResults });

  const { data: updated } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
  return updated;
}

/** Get all quiz results for a student, ordered by startedAt desc. */
export async function getQuizResults(quizId: string, studentId: string) {
  const supabase = getSupabaseClient()!;
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('show_results')
    .eq('id', quizId)
    .maybeSingle();
  
  if (!quiz) throw new NotFoundError('Quiz not found');

  const resultsGated = !quiz.show_results;

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('student_id', studentId);

  const sorted = (attempts || []).sort((a: any, b: any) => 
    new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  return sorted.map((data: any) => {
    if (resultsGated && data.status === 'completed') {
      return {
        id: data.id,
        quizId: data.quiz_id,
        studentId: data.student_id,
        score: data.score,
        totalPoints: data.total_points,
        percentage: data.percentage,
        passed: data.passed,
        timeSpent: data.time_spent,
        startedAt: data.started_at,
        submittedAt: data.submitted_at,
        status: data.status,
        answers: data.answers?.map((a: { question_id: string; points_earned: number }) => ({
          questionId: a.question_id,
          pointsEarned: a.points_earned,
        })) ?? [],
      };
    }
    return data;
  });
}