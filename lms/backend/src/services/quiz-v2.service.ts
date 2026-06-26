import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from '../firebase/firestore';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { chatCompletion } from './ai.service';
import { env } from '../config/env';
import { getTeacherAssignment } from './teacher-class-subject.service';
import { computeLevel, computeComplexityHandled } from './ai-level.service';
import type { Difficulty, StudentLevel } from './ai-level.service';
import * as gamificationService from './gamification.service';

const TYPE_MAP: Record<string, string[]> = {
  multiple_choice: ['mcq', 'multiple_choice'],
  true_false: ['true_false'],
  fill_blank: ['fill_blank'],
  short_answer: ['short_answer'],
  matching: ['matching'],
};

function resolveTypes(selectedModels: string[]): string[] {
  if (!selectedModels || selectedModels.length === 0) return [];
  return selectedModels.flatMap((m) => TYPE_MAP[m] || [m]);
}

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

export async function createQuiz(data: {
  title: string;
  description?: string;
  classId: string;
  textbookId: string;
  chapterId: string;
  conceptId: string;
  teacherId: string;
  timeLimitMinutes: number;
  selectedModels?: string[];
  questionCount?: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  subjectId?: string;
  questions?: any[];
  preview?: boolean;
}) {
  const assignment = await getTeacherAssignment(data.teacherId, data.classId);
  if (!assignment) {
    throw new ForbiddenError('You are not assigned to this class');
  }

  const conceptRef = collections.textbooks()
    .doc(data.textbookId)
    .collection('chapters')
    .doc(data.chapterId)
    .collection('concepts')
    .doc(data.conceptId);

  const conceptDoc = await conceptRef.get();
  if (!conceptDoc.exists) {
    throw new NotFoundError('Concept not found');
  }
  const conceptData = conceptDoc.data()!;
  const conceptName = conceptData.title || conceptData.name || 'Untitled Concept';

  const selectedModels = data.selectedModels ?? [];
  const questionCount = data.questionCount ?? 0;
  const targetTypes = resolveTypes(selectedModels);

  // determine final question set
  let matchingQuestions: any[];
  let aiGeneratedCount = 0;
  let aiErrorMessage = '';

  if (data.questions && data.questions.length > 0) {
    // teacher edited in preview — use provided questions
    matchingQuestions = data.questions.map((q: any) => ({
      id: q.id || uuidv4(),
      type: q.type || 'mcq',
      text: q.text || q.question || '',
      options: q.options || null,
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
      points: q.points || 2,
    }));
  } else {
    // read existing from concept bank
    const questionsSnap = await conceptRef.collection('questions').get();
    const questionBank = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    matchingQuestions = targetTypes.length > 0
      ? questionBank.filter((q: any) => targetTypes.includes(q.type))
      : [...questionBank];
    // generate missing via AI
    if (questionCount > 0 && matchingQuestions.length < questionCount) {
      const needed = questionCount - matchingQuestions.length;
      logger.info('Generating additional questions via AI', { conceptName, needed, existing: matchingQuestions.length });

      const typeNames = selectedModels.length > 0
        ? selectedModels.map((m: string) => (TYPE_MAP[m] || [m])[0]).join(', ')
        : 'mcq, true_false, short_answer, fill_blank';

      const hasMatching = typeNames.includes('matching');

      let formatInstructions = `- type: one of "${typeNames}"
- text: the question text
- options: array of 4 options (only for mcq, true_false, short_answer, fill_blank)
- correctAnswer: the correct answer string
- explanation: brief explanation
- difficulty: "easy" | "medium" | "hard"
- points: number (1-5)`;

      if (hasMatching) {
        formatInstructions += `

For matching questions:
- options must be an array of term-definition pairs, each formatted like "Term Name - Definition description"
- correctAnswer must be a pipe-delimited string of colon-separated pairs, e.g. "Term Name:Definition description|Term Name2:Definition2"`;
      }

      const prompt = `You are an educational assessment generator. Generate EXACTLY ${needed} questions for the concept "${conceptName}".

Question types to use: ${typeNames}

IMPORTANT: You MUST generate exactly ${needed} questions. Each question must have:
${formatInstructions}

Return ONLY valid JSON: { "questions": [ ... ] } with exactly ${needed} items in the array.`;

      try {
        const raw = await chatCompletion({
          model: env.AI_MODEL,
          messages: [
            { role: 'system', content: 'You are an educational assessment generator. Return only valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 8192,
        });

        const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gm, '').trim();
        const braceStart = cleaned.indexOf('{');
        const braceEnd = cleaned.lastIndexOf('}');
        const jsonStr = braceStart !== -1 && braceEnd !== -1 ? cleaned.slice(braceStart, braceEnd + 1) : cleaned;
        const parsed = JSON.parse(jsonStr);
        const generated = (parsed.questions || (Array.isArray(parsed) ? parsed : [])).slice(0, needed);

        if (generated.length === 0) {
          logger.warn('AI returned zero questions', { conceptName });
        } else if (generated.length < needed) {
          logger.warn('AI returned fewer questions than needed', { conceptName, requested: needed, received: generated.length });
        }

        for (const q of generated) {
          const qId = uuidv4();
          matchingQuestions.push({
            id: qId,
            type: q.type || 'mcq',
            text: q.question || q.text,
            options: q.options || null,
            correctAnswer: q.correctAnswer || '',
            explanation: q.explanation || '',
            difficulty: q.difficulty || 'medium',
            points: q.points || 2,
          });
          aiGeneratedCount++;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        aiErrorMessage = errMsg;
        logger.error('Failed to generate questions for quiz', { conceptName, error: errMsg });
      }
    }
  }

  // preview mode — return questions without saving
  if (data.preview) {
    return {
      preview: true,
      questionCount: matchingQuestions.length,
      questions: matchingQuestions.map((q: any) => ({
        id: q.id, type: q.type, text: q.text, options: q.options,
        correctAnswer: q.correctAnswer, explanation: q.explanation,
        difficulty: q.difficulty, points: q.points,
      })),
      existingCount: matchingQuestions.length - aiGeneratedCount,
      aiGeneratedCount,
      aiErrorMessage: aiErrorMessage || undefined,
    };
  }

  // save generated questions to concept bank (only those without a firestore doc)
  if (!data.questions) {
    const questionsSnap = await conceptRef.collection('questions').get();
    const existingIds = new Set(questionsSnap.docs.map(d => d.id));
    const batch = collections.textbooks().firestore.batch();
    let batchCount = 0;
    for (const q of matchingQuestions) {
      if (!existingIds.has(q.id)) {
        batch.set(conceptRef.collection('questions').doc(q.id), {
          ...q, createdAt: new Date().toISOString(),
        });
        batchCount++;
      }
    }
    if (batchCount > 0) {
      await batch.commit();
      logger.info('AI-generated questions saved to concept', { conceptId: data.conceptId, count: batchCount });
    }
  } else {
    // questions provided by teacher (edited) — overwrite all in concept bank
    const batch = collections.textbooks().firestore.batch();
    for (const q of matchingQuestions) {
      batch.set(conceptRef.collection('questions').doc(q.id), {
        ...q, updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    await batch.commit();
    logger.info('Teacher-edited questions saved to concept', { conceptId: data.conceptId, count: matchingQuestions.length });
  }

  const totalPoints = matchingQuestions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);

  const quizId = uuidv4();
  const now = new Date().toISOString();

  const quizData = {
    id: quizId,
    title: data.title,
    description: data.description || '',
    classId: data.classId,
    subjectId: data.subjectId || null,
    textbookId: data.textbookId,
    chapterId: data.chapterId,
    conceptId: data.conceptId,
    teacherId: data.teacherId,
    timeLimitMinutes: data.timeLimitMinutes,
    selectedModels,
    questionCount,
    totalPoints,
    passingScore: data.passingScore ?? 50,
    maxAttempts: data.maxAttempts ?? 3,
    shuffleQuestions: data.shuffleQuestions ?? true,
    showResults: data.showResults ?? false,
    attemptCount: 0,
    releasedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await collections.quizV2().doc(quizId).set(quizData);

  logger.info('Quiz V2 created', { quizId, classId: data.classId, title: data.title, totalQuestions: matchingQuestions.length });

  return { ...quizData, totalQuestions: matchingQuestions.length, questions: matchingQuestions.map((q: any) => ({ id: q.id, type: q.type, text: q.text, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation, difficulty: q.difficulty, points: q.points })) };
}

export async function updateQuiz(quizId: string, teacherId: string, data: Record<string, unknown>) {
  const ref = collections.quizV2().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  const quizData = doc.data()!;
  if (quizData.teacherId !== teacherId) {
    throw new ForbiddenError('You do not own this quiz');
  }

  const allowed = ['title', 'timeLimitMinutes', 'passingScore', 'maxAttempts', 'shuffleQuestions', 'showResults', 'description'];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if (data[key] !== undefined) {
      updates[key] = data[key];
    }
  }

  await ref.update(updates);
  const updated = await ref.get();
  logger.info('Quiz V2 updated', { quizId, teacherId, updates: Object.keys(updates) });
  return { ...updated.data() };
}

export async function releaseQuiz(quizId: string, teacherId: string) {
  const ref = collections.quizV2().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  const quizData = doc.data()!;
  if (quizData.teacherId !== teacherId) {
    throw new ForbiddenError('You do not own this quiz');
  }

  const now = new Date().toISOString();
  await ref.update({ releasedAt: now, updatedAt: now });

  const updated = await ref.get();
  logger.info('Quiz V2 released', { quizId, teacherId });

  return { ...updated.data() };
}

const POINTS_BY_DIFFICULTY: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

export async function startQuizAttempt(quizId: string, studentId: string, selectedModels: string[]) {
  const quizRef = collections.quizV2().doc(quizId);
  const quizDoc = await quizRef.get();

  if (!quizDoc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  const quizData = quizDoc.data()!;

  if (!quizData.releasedAt) {
    throw new ForbiddenError('Quiz is not yet released');
  }

  const attemptsSnapshot = await collections.quizAttemptV2()
    .where('quizId', '==', quizId)
    .where('studentId', '==', studentId)
    .get();

  const maxAttempts = quizData.maxAttempts || 3;
  if (attemptsSnapshot.size >= maxAttempts) {
    throw new ForbiddenError('Maximum attempts reached');
  }

  const userDoc = await collections.users().doc(studentId).get();
  const userData = userDoc.data() || {};
  const studentLevel: StudentLevel = (userData.level as StudentLevel) || 'beginner';

  let questionBank: Array<{
    id: string;
    type: string;
    difficulty?: Difficulty;
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
    points: number;
  }>;

  if (quizData.ocrGenerated && Array.isArray(quizData.questions)) {
    // OCR-generated quizzes have questions embedded in the document
    questionBank = quizData.questions.map((q: any) => ({
      id: q.id || uuidv4(),
      type: q.type || 'short_answer',
      difficulty: (q.difficulty as Difficulty) || 'medium',
      text: q.text || q.question || '',
      options: q.options || undefined,
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      points: q.points || 1,
    }));
  } else {
    const conceptRef = collections.textbooks()
      .doc(quizData.textbookId)
      .collection('chapters')
      .doc(quizData.chapterId)
      .collection('concepts')
      .doc(quizData.conceptId);

    const conceptDoc = await conceptRef.get();
    if (!conceptDoc.exists) {
      throw new NotFoundError('Concept not found');
    }

    const questionsSnap = await conceptRef.collection('questions').get();
    questionBank = questionsSnap.docs.map(doc => doc.data() as {
      id: string;
      type: string;
      difficulty?: Difficulty;
      text: string;
      options?: string[];
      correctAnswer: string;
      explanation?: string;
      points: number;
    });
  }

  const targetTypes = resolveTypes(selectedModels);
  let available = targetTypes.length > 0
    ? questionBank.filter((q) => targetTypes.includes(q.type))
    : [...questionBank];

  if (quizData.shuffleQuestions !== false) {
    available = [...available].sort(() => Math.random() - 0.5);
  }

  const selected = available.slice(0, Math.min(quizData.questionCount, available.length));

  const questionsForStudent = selected.map((q) => {
    if (quizData.isRepublished) {
      return q;
    }
    const { correctAnswer, ...rest } = q;
    return rest;
  });

  const attemptId = uuidv4();
  const now = new Date().toISOString();

  const attempt = {
    id: attemptId,
    quizId,
    studentId,
    startedAt: now,
    submittedAt: null,
    answers: [],
    score: null,
    totalPoints: selected.reduce((sum: number, q) => sum + (POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1), 0),
    percentage: null,
    passed: null,
    timeSpent: 0,
    status: 'in_progress',
    selectedModels,
    level: studentLevel,
  };

  await collections.quizAttemptV2().doc(attemptId).set(attempt);
  await quizRef.update({ attemptCount: FieldValue.increment(1) });

  logger.info('Quiz V2 attempt started', { quizId, studentId, attemptId });

  return { ...attempt, questions: questionsForStudent };
}

export async function submitQuizAttempt(attemptId: string, studentId: string, data: {
  answers: Array<{
    questionId: string;
    answer: string | string[];
    timeSpent?: number;
  }>;
  startedAt: string;
  submittedAt: string;
}) {
  const attemptRef = collections.quizAttemptV2().doc(attemptId);
  const attemptDoc = await attemptRef.get();

  if (!attemptDoc.exists) {
    throw new NotFoundError('Attempt not found');
  }

  const attemptData = attemptDoc.data()!;

  if (attemptData.studentId !== studentId) {
    throw new ForbiddenError('Not your attempt');
  }

  if (attemptData.status !== 'in_progress') {
    throw new ForbiddenError('Attempt already submitted');
  }

  const quizRef = collections.quizV2().doc(attemptData.quizId);
  const quizDoc = await quizRef.get();
  if (!quizDoc.exists) throw new NotFoundError('Quiz not found');
  const quizData = quizDoc.data()!;

  const startedAt = new Date(data.startedAt).getTime();
  const submittedAtTime = new Date(data.submittedAt).getTime();
  const elapsedMinutes = (submittedAtTime - startedAt) / 60000;
  if (elapsedMinutes > quizData.timeLimitMinutes) {
    throw new ForbiddenError('Time limit exceeded');
  }

  let questionBank: Array<{
    id: string;
    type: string;
    difficulty?: Difficulty;
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
    points: number;
  }>;

  if (quizData.ocrGenerated && Array.isArray(quizData.questions)) {
    questionBank = quizData.questions.map((q: any) => ({
      id: q.id || uuidv4(),
      type: q.type || 'short_answer',
      difficulty: (q.difficulty as Difficulty) || 'medium',
      text: q.text || q.question || '',
      options: q.options || undefined,
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      points: q.points || 1,
    }));
  } else {
    const conceptRef = collections.textbooks()
      .doc(quizData.textbookId)
      .collection('chapters')
      .doc(quizData.chapterId)
      .collection('concepts')
      .doc(quizData.conceptId);

    const conceptDoc = await conceptRef.get();
    if (!conceptDoc.exists) throw new NotFoundError('Concept not found');
    const questionsSnap = await conceptRef.collection('questions').get();
    questionBank = questionsSnap.docs.map(doc => doc.data() as {
      id: string;
      type: string;
      difficulty?: Difficulty;
      text: string;
      options?: string[];
      correctAnswer: string;
      explanation?: string;
      points: number;
    });
  }

  let score = 0;
  const gradedAnswers = data.answers.map((answer) => {
    const question = questionBank.find((q) => q.id === answer.questionId);

    if (!question) {
      return { questionId: answer.questionId, answer: answer.answer, isCorrect: false, pointsEarned: 0, timeSpent: answer.timeSpent || 0 };
    }

    let isCorrect = false;
    const normalize = (v: unknown) => v?.toString().toLowerCase().trim() || '';
    if (question.type === 'multiple_choice' || question.type === 'mcq' || question.type === 'true_false' || question.type === 'passage') {
      isCorrect = normalize(answer.answer) === normalize(question.correctAnswer);
    } else if (question.type === 'short_answer' || question.type === 'fill_blank') {
      isCorrect = normalize(answer.answer) === normalize(question.correctAnswer);
    } else if (question.type === 'numerical' || question.type === 'matching') {
      isCorrect = normalize(answer.answer) === normalize(question.correctAnswer);
    } else if (question.type === 'descriptive') {
      isCorrect = answer.answer.toString().trim().length > 5;
    }

    const pointsEarned = isCorrect ? (POINTS_BY_DIFFICULTY[question.difficulty || 'medium'] || 1) : 0;
    if (isCorrect) score += pointsEarned;

    const graded: Record<string, unknown> = {
      questionId: answer.questionId,
      questionText: question.text,
      answer: answer.answer,
      isCorrect,
      pointsEarned,
      timeSpent: answer.timeSpent || 0,
    };
    if (quizData.showResults) {
      graded.correctAnswer = question.correctAnswer;
      graded.explanation = question.explanation;
    }
    return graded;
  });

  const timeSpent = data.answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
  const percentage = attemptData.totalPoints > 0 ? Math.round((score / attemptData.totalPoints) * 100) : 0;
  const passingScore = quizData.passingScore || 50;
  const passed = percentage >= passingScore;

  const accuracy = attemptData.totalPoints > 0 ? score / attemptData.totalPoints : 0;
  const avgReactionTime = gradedAnswers.length > 0
    ? gradedAnswers.reduce((sum: number, a: any) => sum + (a.timeSpent || 0), 0) / gradedAnswers.length
    : 0;

  const difficultyMap: Record<string, Difficulty> = {};
  for (const q of questionBank) {
    difficultyMap[q.id] = q.difficulty || 'easy';
  }

  const complexityHandled = computeComplexityHandled(
    gradedAnswers.map((a: any) => ({ questionId: a.questionId, correct: a.isCorrect })),
    difficultyMap,
  );

  const newLevel = computeLevel(accuracy, avgReactionTime, complexityHandled);

  await collections.users().doc(studentId).update({ level: newLevel });

  const result = {
    answers: gradedAnswers,
    score,
    totalPoints: attemptData.totalPoints,
    percentage,
    passed,
    timeSpent,
    submittedAt: data.submittedAt,
    status: 'completed',
  };

  await attemptRef.update(result);

  logger.info('Quiz V2 attempt submitted', { attemptId, studentId, score, percentage, newLevel });

  try {
    await gamificationService.recordAssessmentResult(studentId, percentage);
    await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.assessmentComplete, `Completed quiz: ${quizData.title}`);
    await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.assessmentComplete, `Completed quiz: ${quizData.title}`);
    if (percentage >= 80) {
      await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${quizData.title}`);
      await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${quizData.title}`);
    }
    if (percentage === 100) {
      await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.perfectScore, `Perfect score on ${quizData.title}`);
      await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.perfectScore, `Perfect score on ${quizData.title}`);
    }
    await gamificationService.updateStreak(studentId);
  } catch (gamErr) {
    logger.error('Gamification reward failed', { studentId, quizId: attemptData.quizId, error: gamErr });
  }

  return { id: attemptId, ...attemptData, ...result, level: newLevel };
}

export async function releaseQuizGrades(quizId: string, showResults: boolean) {
  const ref = collections.quizV2().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  await ref.update({ showResults, updatedAt: new Date().toISOString() });
  logger.info('Quiz V2 grades release toggled', { quizId, showResults });

  const updated = await ref.get();
  return { ...updated.data() };
}

export async function getQuizResults(quizId: string, studentId: string) {
  const quizDoc = await collections.quizV2().doc(quizId).get();
  if (!quizDoc.exists) throw new NotFoundError('Quiz not found');

  const quizData = quizDoc.data()!;
  const resultsGated = !quizData.showResults;

  const snapshot = await collections.quizAttemptV2()
    .where('quizId', '==', quizId)
    .where('studentId', '==', studentId)
    .get();

  const attempts = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  const sorted = attempts.sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return sorted.map((data: any) => {
    if (resultsGated && data.status === 'completed') {
      return {
        id: data.id,
        quizId: data.quizId,
        studentId: data.studentId,
        score: data.score,
        totalPoints: data.totalPoints,
        percentage: data.percentage,
        passed: data.passed,
        timeSpent: data.timeSpent,
        startedAt: data.startedAt,
        submittedAt: data.submittedAt,
        status: data.status,
        selectedModels: data.selectedModels,
        level: data.level,
        answers: data.answers?.map((a: { questionId: string; pointsEarned: number }) => ({
          questionId: a.questionId,
          pointsEarned: a.pointsEarned,
        })) ?? [],
      };
    }
    return data;
  });
}

export async function getQuizById(quizId: string) {
  const ref = collections.quizV2().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  return { ...doc.data() };
}

export async function listQuizzesForClass(classId: string): Promise<any[]> {
  const snapshot = await collections.quizV2()
    .where('classId', '==', classId)
    .get();

  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  
  // Resolve subjectId fallback for older quiz documents
  const resolvedItems = await Promise.all(
    items.map(async (item: any) => {
      if (!item.subjectId && item.textbookId) {
        try {
          const tbDoc = await collections.textbooks().doc(item.textbookId).get();
          if (tbDoc.exists) {
            item.subjectId = tbDoc.data()?.subjectId || null;
          }
        } catch (err) {
          logger.error('Failed to resolve fallback subjectId for quiz', { quizId: item.id, err });
        }
      }
      // Resolve subject name
      if (item.subjectId) {
        try {
          const subDoc = await collections.subjects().doc(item.subjectId).get();
          if (subDoc.exists) {
            item.subjectName = subDoc.data()?.name || null;
          }
        } catch (err) {
          logger.error('Failed to resolve subject name', { quizId: item.id, subjectId: item.subjectId, err });
        }
      }
      return item;
    })
  );

  return resolvedItems.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listQuizzesForTeacher(teacherId: string): Promise<any[]> {
  const snapshot = await collections.quizV2()
    .where('teacherId', '==', teacherId)
    .get();

  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Get a quiz for a specific concept (first matching). */
export async function getQuizForConcept(conceptId: string) {
  const quizzes = await collections.quizV2()
    .where('conceptId', '==', conceptId)
    .get();
  return quizzes.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function republishQuiz(quizId: string, teacherId: string) {
  const ref = collections.quizV2().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  const quizData = doc.data()!;
  if (quizData.teacherId !== teacherId) {
    throw new ForbiddenError('You do not own this quiz');
  }

  const now = new Date().toISOString();
  await ref.update({ isRepublished: true, updatedAt: now });

  const updated = await ref.get();
  logger.info('Quiz V2 republished (interactive mode enabled)', { quizId, teacherId });

  return { ...updated.data() };
}

export async function deleteQuiz(quizId: string, teacherId: string) {
  const ref = collections.quizV2().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  const quizData = doc.data()!;
  if (quizData.teacherId !== teacherId) {
    throw new ForbiddenError('You do not own this quiz');
  }

  // Delete all attempts for this quiz
  const attemptsSnap = await collections.quizAttemptV2()
    .where('quizId', '==', quizId)
    .get();

  const batch = collections.quizV2().firestore.batch();
  attemptsSnap.docs.forEach((a) => batch.delete(a.ref));
  batch.delete(ref);
  await batch.commit();

  logger.info('Quiz V2 deleted', { quizId, teacherId, attemptsDeleted: attemptsSnap.size });
}
