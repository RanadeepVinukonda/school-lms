import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { computeLevel, computeComplexityHandled } from './ai-level.service';
import type { Difficulty } from './ai-level.service';
import * as gamificationService from './gamification.service';
import { computeMastery } from './adaptive/mastery.service';
import { getRecommendations } from './adaptive/recommendation.service';
import { getRemediationPlan } from './adaptive/remediation.service';
import { createNotification, createBulkNotifications } from './notification.service';
import { nosqlGet } from './nosql.service';
import { TransactionManager } from '../database/transaction-manager';
import { QV2, QAV2, POINTS_BY_DIFFICULTY, fallbackText, getConceptQuestions } from './quiz-v2.service';

interface QuestionBankItem {
  id: string;
  type: string;
  difficulty: Difficulty;
  text: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

interface GradedAnswer {
  questionId: string;
  questionText?: string;
  answer: string | string[];
  isCorrect: boolean;
  pointsEarned: number;
  timeSpent: number;
  correctAnswer?: string;
  explanation?: string;
  skipped?: boolean;
}

interface QuizAttemptResult {
  answers: GradedAnswer[];
  score: number;
  totalPoints: number;
  percentage: number;
  submittedAt: string;
  timeSpent: number;
  status: string;
}

/**
 * Resolve which concepts a quiz assesses so a low score can drive
 * adaptive recommendations + resource requests. Best-effort, never throws:
 *   1. explicit `conceptId` -> that concept
 *   2. `chapterId`         -> every concept in that chapter
 *   3. `subjectId`         -> the student's most-recently-reviewed mastery
 *                            concepts within that subject (capped)
 */
async function resolveQuizConceptIds(quizData: Record<string, unknown>, studentId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin()!;
  try {
    const direct = quizData.conceptId as string;
    if (direct) return [direct];

    const chapterId = quizData.chapterId as string;
    if (chapterId) {
      const { data } = await supabase.from('concepts').select('id').eq('chapter_id', chapterId);
      const ids = (data || []).map((c: any) => c.id as string);
      if (ids.length > 0) return ids;
    }

    const subjectId = quizData.subjectId as string;
    if (subjectId) {
      const { data: textbooks } = await supabase.from('textbooks').select('id').eq('subject_id', subjectId);
      const textbookIds = (textbooks || []).map((t: any) => t.id as string);
      if (textbookIds.length === 0) return [];
      const { data: chapters } = await supabase.from('chapters').select('id').in('textbook_id', textbookIds);
      const chapterIds = (chapters || []).map((c: any) => c.id as string);
      if (chapterIds.length === 0) return [];
      const { data: subjectConcepts } = await supabase.from('concepts').select('id').in('chapter_id', chapterIds);
      const subjectSet = new Set((subjectConcepts || []).map((c: any) => c.id as string));
      if (subjectSet.size === 0) return [];

      // Prefer the student's most-recently-reviewed concepts in this subject, but
      // fall back to the subject's concepts directly so a first-time low scorer still
      // gets mastery written and shows up in Resources recommendations.
      const { data: mastered } = await supabase
        .from('concept_mastery')
        .select('concept_id, last_reviewed_at')
        .eq('student_id', studentId)
        .order('last_reviewed_at', { ascending: false })
        .limit(50);
      const reviewed = (mastered || [])
        .map((m: any) => m.concept_id as string)
        .filter((id) => subjectSet.has(id));
      if (reviewed.length > 0) return reviewed.slice(0, 3);
      return [...subjectSet].slice(0, 3);
    }
  } catch (err) {
    logger.warn('Failed to resolve quiz concepts for mastery', { quizId: quizData.id, error: err });
  }
  return [];
}

export async function submitQuizAttempt(attemptId: string, studentId: string, data: {
  answers: Array<{
    questionId: string;
    answer: string | string[];
    timeSpent?: number;
    skipped?: boolean;
  }>;
}) {
  const supabase = getSupabaseAdmin()!;
  const attemptData = (await nosqlGet(QAV2, attemptId)).data as Record<string, unknown> | null;
  if (!attemptData) throw new NotFoundError('Attempt not found');
  if (attemptData.studentId !== studentId) throw new ForbiddenError('Not your attempt');
  if (attemptData.status !== 'in_progress') throw new ForbiddenError('Attempt already submitted');

  const quizData = (await nosqlGet(QV2, attemptData.quizId as string)).data as Record<string, unknown> | null;
  if (!quizData) throw new NotFoundError('Quiz not found');

  const storedStartedAt = attemptData.startedAt as string;
  if (!storedStartedAt) throw new ForbiddenError('Invalid attempt state');
  const submittedAt = new Date().toISOString();
  const elapsedMinutes = (new Date(submittedAt).getTime() - new Date(storedStartedAt).getTime()) / 60000;
  const graceMinutes = 5;
  if (elapsedMinutes > ((quizData.timeLimitMinutes as number) + graceMinutes)) throw new ForbiddenError('Time limit exceeded');

  let questionBank: QuestionBankItem[];
  const storedQuestions = quizData.questions as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(storedQuestions) && storedQuestions.length > 0) {
    questionBank = storedQuestions.map((q) => ({
      id: (q.id as string) || uuidv4(), type: (q.type as string) || 'short_answer',
      difficulty: (q.difficulty as Difficulty) || 'medium',
      text: ((q.text || q.question) as string) || fallbackText(q.type as string, q.options as string[]), options: q.options as string[] | undefined,
      correctAnswer: (q.correctAnswer as string) || '', explanation: (q.explanation as string) || '',
      points: (q.points as number) || 1,
    }));
  } else {
    const rows = await getConceptQuestions(quizData.conceptId as string);
    questionBank = rows.map((r) => ({
      id: r.id, type: r.type || 'short_answer',
      difficulty: (r.difficulty as Difficulty) || 'medium',
      text: (r.text || r.question || fallbackText(r.type, r.options)) as string, options: r.options as string[] | undefined,
      correctAnswer: (r.correct_answer || r.correctAnswer || r.answer || '') as string, explanation: (r.explanation || '') as string,
      points: r.points || 1,
    }));
  }

  let score = 0;
  const gradedAnswers: GradedAnswer[] = data.answers.map((answer) => {
    const question = questionBank.find((q) => q.id === answer.questionId);
    if (!question) {
      return { questionId: answer.questionId, answer: answer.answer, isCorrect: false, pointsEarned: 0, timeSpent: answer.timeSpent || 0 };
    }

    if (answer.skipped) {
      return {
        questionId: answer.questionId, questionText: question.text, answer: answer.answer,
        isCorrect: false, pointsEarned: 0, timeSpent: answer.timeSpent || 0,
        correctAnswer: question.correctAnswer, explanation: question.explanation,
        skipped: true,
      };
    }

    let isCorrect = false;
    const normalize = (v: unknown) => v?.toString().toLowerCase().trim() || '';
    const qType = question.type;
    const normalizedCorrect = normalize(question.correctAnswer);
    const normalizedAnswer = normalize(answer.answer);

    if (!normalizedCorrect && normalizedAnswer) {
      isCorrect = true;
    } else if (['multiple_choice', 'mcq', 'true_false', 'passage'].includes(qType)) {
      isCorrect = normalizedAnswer === normalizedCorrect;
    } else if (['short_answer', 'fill_blank'].includes(qType)) {
      isCorrect = normalizedAnswer === normalizedCorrect;
    } else if (['numerical', 'matching'].includes(qType)) {
      isCorrect = normalizedAnswer === normalizedCorrect;
    } else if (qType === 'descriptive') {
      isCorrect = answer.answer.toString().trim().length > 5;
    }

    const pointsEarned = isCorrect ? ((question.points as number) || POINTS_BY_DIFFICULTY[question.difficulty || 'medium'] || 1) : 0;
    if (isCorrect) score += pointsEarned;

    return {
      questionId: answer.questionId, questionText: question.text, answer: answer.answer,
      isCorrect, pointsEarned, timeSpent: answer.timeSpent || 0,
      correctAnswer: question.correctAnswer, explanation: question.explanation,
    };
  });

  const isRepublished = !!(quizData.isRepublished);

  const timeSpent = data.answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
  let totalPoints = (attemptData.totalPoints as number) || 0;

  if (isRepublished) {
    const skippedIds = new Set(gradedAnswers.filter((a) => a.skipped).map((a) => a.questionId));
    const skippedPointValues = questionBank
      .filter((q) => skippedIds.has(q.id))
      .reduce((sum, q) => sum + ((q.points as number) || POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1), 0);
    totalPoints = Math.max(totalPoints - skippedPointValues, 0);
  }

  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

  const activeAnswers = isRepublished
    ? gradedAnswers.filter((a) => !a.skipped)
    : gradedAnswers;
  const accuracy = totalPoints > 0 ? score / totalPoints : 0;
  const avgReactionTime = activeAnswers.length > 0
    ? activeAnswers.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / activeAnswers.length
    : 0;

  const difficultyMap: Record<string, Difficulty> = {};
  for (const q of questionBank) { difficultyMap[q.id] = q.difficulty || 'easy'; }
  const complexityHandled = computeComplexityHandled(
    activeAnswers.map((a) => ({ questionId: a.questionId, correct: a.isCorrect })),
    difficultyMap,
  );
  const newLevel = computeLevel(accuracy, avgReactionTime, complexityHandled);

  const result: QuizAttemptResult = {
    answers: gradedAnswers,
    score,
    totalPoints,
    percentage,
    submittedAt,
    timeSpent,
    status: 'submitted',
  };

  const tm = new TransactionManager();
  await tm.runTransaction(async (tx) => {
    const userRow = await tx.db().query(
      'SELECT data FROM users WHERE id = $1 LIMIT 1',
      [studentId],
    );
    const existingData = (userRow.rows[0]?.data as Record<string, unknown>) || {};
    await tx.db().query(
      'UPDATE users SET data = $1 WHERE id = $2',
      [JSON.stringify({ ...existingData, level: newLevel }), studentId],
    );

    const attemptExisting = await tx.db().query(
      'SELECT data FROM firestore_docs WHERE collection = $1 AND doc_id = $2 LIMIT 1',
      [QAV2, attemptId],
    );
    const attemptMerged = { ...((attemptExisting.rows[0]?.data as Record<string, unknown>) || {}), ...result };
    await tx.db().query(
      `INSERT INTO firestore_docs (collection, doc_id, data, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (collection, doc_id) DO UPDATE SET data = $3, updated_at = NOW()`,
      [QAV2, attemptId, JSON.stringify(attemptMerged)],
    );

    const now = new Date().toISOString();
    const gradeId = uuidv4();
    const gradeData = {
      studentId,
      courseId: quizData.courseId,
      subjectId: quizData.subjectId,
      classId: quizData.classId,
      itemName: quizData.title,
      score,
      totalPoints,
      percentage,
      gradedBy: 'auto',
      createdAt: now,
      updatedAt: now,
    };
    await tx.db().query(
      `INSERT INTO firestore_docs (collection, doc_id, data, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      ['grades', gradeId, JSON.stringify(gradeData)],
    );
  });

  try {
    const quizTitle = (quizData.title as string) || 'Quiz';
    await createNotification({
      userId: studentId, type: 'grade', title: 'Quiz Result',
      body: `You scored ${score}/${totalPoints} (${percentage}%) in ${quizTitle}.`,
      data: { quizId: attemptData.quizId, attemptId, link: `/quizzes/${attemptData.quizId}/results` },
    });
    const { data: parentRows } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'parent')
      .contains('children_ids', [studentId]);
    if (parentRows && parentRows.length > 0) {
      const parentNotifs = parentRows.map((p) => ({
        userId: p.id, type: 'grade', title: 'Quiz Completed',
        body: `Your child scored ${score}/${totalPoints} (${percentage}%) in ${quizTitle}.`,
        data: { quizId: attemptData.quizId, studentId, link: `/quizzes/${attemptData.quizId}/results` },
      }));
      await createBulkNotifications(parentNotifs);
    }
  } catch (err) {
    logger.warn('Failed to send quiz result notifications', { attemptId, error: err });
  }

  logger.info('Quiz V2 attempt submitted', { attemptId, studentId, score, percentage, newLevel });

  const allNewBadges: string[] = [];
  const collect = (r: string[] | { newBadges?: string[] }) => {
    const ids = Array.isArray(r) ? r : r?.newBadges;
    if (ids) for (const b of ids) if (!allNewBadges.includes(b)) allNewBadges.push(b);
  };

  try {
    collect(await gamificationService.recordAssessmentResult(studentId, percentage));
    collect(await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.assessmentComplete, `Completed quiz: ${quizData.title}`));
    collect(await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.assessmentComplete, `Completed quiz: ${quizData.title}`));
    if (percentage >= 80) {
      collect(await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${quizData.title}`));
      collect(await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${quizData.title}`));
    }
    if (percentage === 100) {
      collect(await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.perfectScore, `Perfect score on ${quizData.title}`));
      collect(await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.perfectScore, `Perfect score on ${quizData.title}`));
    }
    await gamificationService.updateStreak(studentId);
  } catch (gamErr) {
    logger.error('Gamification reward failed', { studentId, quizId: attemptData.quizId, error: gamErr });
  }

  const resolvedConceptIds = await resolveQuizConceptIds(quizData, studentId);
  const primaryConceptId = resolvedConceptIds[0] || null;

  if (resolvedConceptIds.length > 0) {
    await Promise.all(
      resolvedConceptIds.map((conceptId) =>
        computeMastery(studentId, conceptId, accuracy).catch((err) =>
          logger.error('Mastery update failed', { studentId, conceptId, error: err })
        ),
      ),
    );
  }

  if (percentage < 70) {
    getRecommendations(studentId, quizData.schoolId as string).catch(err =>
      logger.warn('Failed to get recommendations', { studentId, error: err })
    );
    if (primaryConceptId) {
      (async () => {
        try {
          const supabase = getSupabaseAdmin()!;
          const { data: concept } = await supabase.from('concepts')
            .select('textbook_id')
            .eq('id', primaryConceptId)
            .maybeSingle();
          const textbookQuery = concept?.textbook_id ? `?textbookId=${concept.textbook_id}` : '';
          await createNotification({
            userId: studentId,
            type: 'warning',
            title: 'Improve Your Score',
            body: `You scored ${percentage}%. Practice the concept to improve your understanding.`,
            data: { link: `/student/concepts/${primaryConceptId}/adaptive-quiz${textbookQuery}`, quizId: attemptData.quizId },
          }).catch(err => logger.warn('Failed to send improvement notification', { error: err }));

          getRemediationPlan(studentId, primaryConceptId).then((plan) => {
            for (const item of plan) {
              if (item.status !== 'Proficient') {
                const resourceInfo = item.resources.length > 0
                  ? ` Review ${item.resources[0].sourceLabel} resources for "${item.title}".`
                  : '';
                createNotification({
                  userId: studentId,
                  type: 'info',
                  title: `Review Prerequisite: ${item.title}`,
                  body: `Mastery: ${Math.round(item.masteryScore * 100)}%.${resourceInfo}`,
                  data: { link: `/student/concepts/${item.conceptId}/adaptive-quiz?textbookId=${item.textbookId}`, conceptId: item.conceptId },
                }).catch(err => logger.warn('Failed to send prerequisite notification', { error: err }));
              }
            }
          }).catch(err => logger.warn('Failed to get remediation plan', { error: err }));
        } catch (err) {
          logger.warn('Failed to send improvement notification', { error: err });
        }
      })();
    }
  }

  if (percentage >= 70 && primaryConceptId) {
    (async () => {
      try {
        const supabase = getSupabaseAdmin()!;
        const { data: concept } = await supabase.from('concepts')
          .select('id, title, textbook_id')
          .eq('id', primaryConceptId)
          .single();
        if (!concept?.textbook_id) return;
        const { data: next } = await supabase.from('concepts')
          .select('id, title')
          .eq('textbook_id', concept.textbook_id)
          .contains('prerequisites', [concept.title])
          .order('order', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (next) {
          await createNotification({
            userId: studentId,
            type: 'achievement',
            title: 'Concept Mastered!',
            body: `You've mastered this concept. Next: "${next.title}" is now unlocked.`,
            data: { link: `/student/concepts/${next.id}?textbookId=${concept.textbook_id}`, conceptId: next.id as string },
          });
        }
      } catch (err) {
        logger.warn('Failed to unlock next concept', { error: err });
      }
    })();
  }

  return { id: attemptId, ...attemptData, ...result, level: newLevel, newBadges: allNewBadges };
}
