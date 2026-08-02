import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { createBulkNotifications, createNotification } from './notification.service';
import { computeMastery } from './adaptive/mastery.service';

export async function scheduleExam(examId: string, data: {
  startDate: string;
  endDate: string;
  classIds: string[];
  proctorIds?: string[];
}) {
  const supabase = getSupabaseAdmin()!;
  const { data: existing, error: fetchError } = await supabase
    .from('exams')
    .select('id, title')
    .eq('id', examId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  if (!existing) {
    throw new NotFoundError('Exam not found');
  }

  const updateData = {
    scheduled_classes: data.classIds,
    start_date: data.startDate,
    end_date: data.endDate,
    proctor_ids: data.proctorIds || [],
    status: 'scheduled',
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('exams').update(updateData).eq('id', examId);
  if (error) throw error;

  try {
    for (const classId of data.classIds) {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, teacher_ids, student_ids')
        .eq('id', classId)
        .maybeSingle();
      if (classError) throw classError;
      
      if (classData) {
        const studentIds = (classData.student_ids as string[]) || [];
        const notifications = studentIds.map((studentId: string) => ({
          userId: studentId,
          type: 'exam',
          title: 'Exam Scheduled',
          body: `${existing.title} is scheduled from ${new Date(data.startDate).toLocaleDateString()} to ${new Date(data.endDate).toLocaleDateString()}`,
          data: { examId, link: `/exams/${examId}` },
        }));
        
        if (notifications.length > 0) await createBulkNotifications(notifications);
      }
    }
  } catch (err) {
    logger.warn('Failed to send exam schedule notifications', { error: err });
  }

  logger.info('Exam scheduled', { examId, classIds: data.classIds });

  const { data: updated, error: readError } = await supabase.from('exams').select('*').eq('id', examId).single();
  if (readError) throw readError;
  return updated;
}

export async function startExamAttempt(examId: string, studentId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .maybeSingle();
  if (examError) throw examError;

  if (!exam) {
    throw new NotFoundError('Exam not found');
  }

  const { count: existingCount } = await supabase
    .from('exam_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('exam_id', examId)
    .eq('student_id', studentId);

  if (exam.max_attempts && (existingCount || 0) >= exam.max_attempts) {
    throw new ForbiddenError('Maximum attempts reached');
  }

  const attemptId = uuidv4();
  const now = new Date().toISOString();

  const attempt = {
    id: attemptId,
    exam_id: examId,
    student_id: studentId,
    started_at: now,
    submitted_at: null,
    answers: [],
    score: null,
    total_points: exam.total_points,
    percentage: null,
    passed: null,
    time_spent: 0,
    status: 'in_progress',
  };

  const { error: insertError } = await supabase.from('exam_attempts').insert(attempt);
  if (insertError) {
    if (insertError.code === '23505') {
      throw new ConflictError('You already have an in-progress attempt for this exam');
    }
    throw insertError;
  }

  // ponytail: approximate counter — exact count from exam_attempts table if needed
  const { data: currentExam, error: countError } = await supabase.from('exams').select('attempt_count').eq('id', examId).single();
  if (countError) throw countError;
  const { error } = await supabase.from('exams').update({ attempt_count: (currentExam?.attempt_count || 0) + 1 }).eq('id', examId);
  if (error) throw new Error(`Failed to update exams: ${error.message}`);

  logger.info('Exam attempt started', { examId, studentId, attemptId });

  return { ...attempt, questions: exam.questions };
}

const submitExamAttemptSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1),
    answer: z.union([z.string(), z.array(z.string())]),
    timeSpent: z.number().min(0).optional(),
  })),
  startedAt: z.string().datetime(),
  submittedAt: z.string().datetime(),
});

export async function submitExamAttempt(attemptId: string, studentId: string, data: unknown) {
  const parseResult = submitExamAttemptSchema.safeParse(data);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ValidationError(`Invalid submission data: ${issues}`);
  }
  const validated = parseResult.data;
  const supabase = getSupabaseAdmin()!;
  const { data: attempt, error: attemptError } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();
  if (attemptError) throw attemptError;

  if (!attempt) {
    throw new NotFoundError('Attempt not found');
  }

  if (attempt.student_id !== studentId) {
    throw new ForbiddenError('Not your attempt');
  }

  if (attempt.status !== 'in_progress') {
    throw new ForbiddenError('Attempt already submitted');
  }

  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select('*')
    .eq('id', attempt.exam_id)
    .single();
  if (examError) throw examError;

  let score = 0;
  const gradedAnswers = validated.answers.map((answer) => {
    const question = exam.questions.find(
      (q: { id: string; question_text?: string; type: string; points: number; correct_answer?: string }) => 
        q.id === answer.questionId || q.question_text === answer.questionId
    );

    if (!question) {
      return { questionId: answer.questionId, answer: answer.answer, isCorrect: false, pointsEarned: 0 };
    }

    let isCorrect = false;
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      isCorrect = answer.answer === question.correct_answer;
    } else if (question.type === 'short_answer') {
      isCorrect = answer.answer.toString().toLowerCase().trim() ===
        question.correct_answer?.toString().toLowerCase().trim();
    }

    const pointsEarned = isCorrect ? question.points : 0;
    if (isCorrect) score += pointsEarned;

    return {
      question_id: question.id,
      question_text: question.question_text || question.id,
      answer: answer.answer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      time_spent: answer.timeSpent || 0,
    };
  });

  const timeSpent = validated.answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
  const percentage = exam.total_points > 0 ? Math.round((score / exam.total_points) * 100) : 0;
  const passingScore = exam.passing_score || 50;
  const passed = percentage >= passingScore;

  const result = {
    answers: gradedAnswers,
    score,
    total_points: exam.total_points,
    percentage,
    passed,
    time_spent: timeSpent,
    submitted_at: validated.submittedAt,
    status: 'completed',
  };

  const { error } = await supabase.from('exam_attempts').update(result).eq('id', attemptId);
  if (error) throw error;

  logger.info('Exam attempt submitted', { attemptId, studentId, score, percentage });

  return { id: attemptId, ...attempt, ...result };
}

export async function gradeExamAttempt(attemptId: string, graderId: string, data: {
  score: number;
  feedback?: string;
}) {
  const supabase = getSupabaseAdmin()!;
  const { data: attempt, error: attemptError } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();
  if (attemptError) throw attemptError;

  if (!attempt) {
    throw new NotFoundError('Attempt not found');
  }

  const updateData = {
    score: data.score,
    feedback: data.feedback || '',
    graded_by: graderId,
    graded_at: new Date().toISOString(),
    status: 'graded',
  };

  const { error } = await supabase.from('exam_attempts').update(updateData).eq('id', attemptId);
  if (error) throw new Error(`Failed to update exam_attempts: ${error.message}`);

  try {
    await createNotification({
      userId: attempt.student_id as string,
      type: 'grade',
      title: 'Exam Graded',
      body: `Your exam has been graded: ${data.score} points${data.feedback ? ' - ' + data.feedback : ''}`,
      data: { attemptId, examId: attempt.exam_id as string, link: `/exams/${attempt.exam_id}` },
    });
  } catch (err) {
    logger.warn('Failed to send exam grade notification', { error: err });
  }

  logger.info('Exam attempt graded', { attemptId, graderId });

  (async () => {
    try {
      const { data: examRow } = await supabase
        .from('exams')
        .select('textbook_id, chapter_id')
        .eq('id', attempt.exam_id)
        .maybeSingle();
      if (!examRow?.chapter_id) return;
      const { data: conceptRows } = await supabase
        .from('concepts')
        .select('id')
        .eq('chapter_id', examRow.chapter_id);
      for (const c of conceptRows || []) {
        computeMastery(attempt.student_id as string, c.id as string, (data.score / (attempt.total_points || 1))).catch((err: unknown) =>
          logger.error('Mastery update failed after exam grading', { studentId: attempt.student_id, conceptId: c.id, error: err })
        );
      }
    } catch (err) {
      logger.error('Mastery concept lookup failed after exam grading', { studentId: attempt.student_id, examId: attempt.exam_id, error: err });
    }
  })();

  try {
    const supabase2 = getSupabaseAdmin()!;
    const { data: examData } = await supabase2.from('exams').select('title').eq('id', attempt.exam_id).maybeSingle();
    const { data: studentData } = await supabase2.from('users').select('display_name').eq('id', attempt.student_id).maybeSingle();
    const studentName = (studentData as any)?.display_name || 'Student';
    const examTitle = (examData as any)?.title || 'Exam';
    const { data: parentRows } = await supabase2.from('users').select('id').contains('data', { children_ids: [attempt.student_id] }).limit(10);
    if (parentRows && parentRows.length > 0) {
      await createBulkNotifications(parentRows.map((p: any) => ({
        userId: p.id,
        type: 'grade' as const,
        title: 'Exam Graded',
        body: `${studentName} scored ${data.score} points on ${examTitle}`,
        data: { studentId: attempt.student_id, examId: attempt.exam_id },
      })));
    }
  } catch (err) {
    logger.warn('Failed to send parent notification', { error: err });
  }

  const { data: updated, error: readError } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('id', attemptId)
    .single();
  if (readError) throw readError;
  
  return updated;
}

export async function releaseExamGrades(examId: string, gradesReleased: boolean) {
  const supabase = getSupabaseAdmin()!;
  const { data: existing, error } = await supabase
    .from('exams')
    .select('id')
    .eq('id', examId)
    .maybeSingle();
  if (error) throw error;

  if (!existing) {
    throw new NotFoundError('Exam not found');
  }

  const { error: updateError } = await supabase.from('exams').update({ grades_released: gradesReleased, updated_at: new Date().toISOString() }).eq('id', examId);
  if (updateError) throw new Error(`Failed to update exams: ${updateError.message}`);
  logger.info('Exam grades release toggled', { examId, gradesReleased });

  const { data: updated, error: readError } = await supabase.from('exams').select('*').eq('id', examId).single();
  if (readError) throw readError;
  return updated;
}

export async function getExamResults(examId: string, studentId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: exam, error } = await supabase
    .from('exams')
    .select('grades_released')
    .eq('id', examId)
    .maybeSingle();
  if (error) throw error;
  
  if (!exam) throw new NotFoundError('Exam not found');

  const resultsGated = !exam.grades_released;

  const { data: attempts, error: attemptError } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', studentId);
  if (attemptError) throw attemptError;

  const sorted = (attempts || []).sort((a: any, b: any) => 
    new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  return sorted.map((a: any) => {
    if (resultsGated && a.status === 'completed') {
      return {
        id: a.id,
        examId: a.exam_id,
        studentId: a.student_id,
        score: a.score,
        totalPoints: a.total_points,
        percentage: a.percentage,
        passed: a.passed,
        timeSpent: a.time_spent,
        startedAt: a.started_at,
        submittedAt: a.submitted_at,
        status: a.status,
        answers: a.answers?.map((ans: { question_id: string; points_earned: number }) => ({
          questionId: ans.question_id,
          pointsEarned: ans.points_earned,
        })) ?? [],
      };
    }
    return a;
  });
}
