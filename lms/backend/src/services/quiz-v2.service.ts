import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError, AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { chatCompletion } from './ai.service';
import { env } from '../config/env';
import { getTeacherAssignment } from './teacher-class-subject.service';
import { computeLevel, computeComplexityHandled, filterQuestionsByLevel } from './ai-level.service';
import type { Difficulty, StudentLevel } from './ai-level.service';
import * as gamificationService from './gamification.service';
import { deleteDocument } from './document.service';
import { computeMastery } from './adaptive/mastery.service';

const QV2 = 'quizV2';
const QAV2 = 'quizAttemptV2';

function fallbackText(type: string, _options: any): string {
  if (type === 'mcq') return 'Choose the correct answer';
  if (type === 'true_false') return 'State whether true or false';
  if (type === 'fill_blank') return 'Fill in the blank';
  if (type === 'matching') return 'Match the following items';
  if (type === 'numerical') return 'Calculate the answer';
  return 'Answer the following question';
}

async function nosqlGet(col: string, id: string) {
  const { data: row, error } = await getSupabaseAdmin()!.from('firestore_docs').select('data').eq('collection', col).eq('doc_id', id).maybeSingle();
  if (error) {
    logger.error('nosqlGet failed', { collection: col, doc_id: id, error: error.message, details: error.details, hint: error.hint, code: error.code });
    throw new AppError(500, `Database read failed: ${error.message}`, { collection: col, doc_id: id });
  }
  return { exists: !!row, data: (row?.data as Record<string, unknown>) ?? null };
}

async function nosqlSet(col: string, id: string, data: Record<string, unknown>) {
  const { error } = await getSupabaseAdmin()!.from('firestore_docs').upsert({
    collection: col, doc_id: id, data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) {
    logger.error('nosqlSet failed', { collection: col, doc_id: id, error: error.message, details: error.details, hint: error.hint, code: error.code });
    throw new AppError(500, `Database write failed: ${error.message}`, { collection: col, doc_id: id });
  }
}

async function nosqlUpdate(col: string, id: string, updates: Record<string, unknown>) {
  const { data: existing } = await getSupabaseAdmin()!.from('firestore_docs').select('data').eq('collection', col).eq('doc_id', id).maybeSingle();
  const merged = { ...((existing?.data as Record<string, unknown>) || {}), ...updates };
  const { error } = await getSupabaseAdmin()!.from('firestore_docs').upsert({
    collection: col, doc_id: id, data: merged,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) {
    logger.error('nosqlUpdate failed', { collection: col, doc_id: id, error: error.message, details: error.details, hint: error.hint, code: error.code });
    throw new AppError(500, `Database update failed: ${error.message}`, { collection: col, doc_id: id });
  }
}

async function nosqlDelete(col: string, id: string) {
  await deleteDocument(col, id);
}

async function nosqlQuery(col: string, filters: Record<string, unknown>) {
  let q: any = getSupabaseAdmin()!.from('firestore_docs').select('doc_id, data').eq('collection', col);
  for (const [k, v] of Object.entries(filters)) {
    q = q.contains('data', { [k]: v });
  }
  const { data: rows, error } = await q;
  if (error) {
    logger.error('nosqlQuery failed', { collection: col, filters, error: error.message, details: error.details, hint: error.hint, code: error.code });
    throw new AppError(500, `Database query failed: ${error.message}`);
  }
  return (rows || []).map((r: { doc_id: string; data: unknown }) => ({ id: r.doc_id, ...(r.data as object) }));
}

const TYPE_MAP: Record<string, string[]> = {
  multiple_choice: ['mcq', 'multiple_choice'],
  true_false: ['true_false'],
  fill_blank: ['fill_blank'],
  short_answer: ['short_answer'],
  matching: ['matching'],
};
const ALL_QUESTION_TYPES = ['mcq', 'multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'matching'];

function resolveTypes(selectedModels: string[]): string[] {
  if (!selectedModels || selectedModels.length === 0) return [];
  return selectedModels.flatMap((m) => TYPE_MAP[m] || [m]);
}

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

async function getConcept(textbookId: string, chapterId: string, conceptId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: c, error } = await supabase.from('concepts').select('*').eq('id', conceptId).maybeSingle();
  if (error) {
    logger.error('getConcept failed', { conceptId, error: error.message, details: error.details, hint: error.hint, code: error.code });
    throw new AppError(500, `Failed to fetch concept: ${error.message}`);
  }
  return c;
}

async function getConceptQuestions(conceptId: string) {
  const { data: rows, error } = await getSupabaseAdmin()!.from('concept_questions').select('*').eq('concept_id', conceptId);
  if (error) {
    logger.error('getConceptQuestions failed', { conceptId, error: error.message, details: error.details, hint: error.hint, code: error.code });
    throw new AppError(500, `Failed to fetch concept questions: ${error.message}`);
  }
  return rows || [];
}

async function upsertQuestions(questions: Array<Record<string, unknown>>, conceptId: string, textbookId?: string, chapterId?: string) {
  const supabase = getSupabaseAdmin()!;
  for (const q of questions) {
    const { error } = await supabase.from('concept_questions').upsert({
      id: q.id as string,
      concept_id: conceptId,
      textbook_id: textbookId || (q.textbook_id as string) || '',
      chapter_id: chapterId || (q.chapter_id as string) || '',
      type: q.type as string,
      question: (q.question || q.text) as string,
      options: q.options || null,
      answer: (q.answer || q.correctAnswer) as string,
      explanation: q.explanation || null,
      difficulty: (q.difficulty as string) || 'medium',
      points: (q.points as number) || 1,
      bloom_level: (q.bloomLevel as string) || null,
      hots: q.hots === true || q.hots === 'true' || false,
      topic: (q.topic as string) || null,
      source: (q.source as string) || 'AI Quiz Generation',
      data: q,
    }, { onConflict: 'id' });
    if (error) {
      logger.error('upsertQuestions failed', { conceptId, questionId: q.id, error: error.message, details: error.details, hint: error.hint, code: error.code });
      throw new AppError(500, `Failed to save question: ${error.message}`);
    }
  }
}

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
  schoolId?: string;
  publishedTo?: 'class' | 'students';
  targetStudentIds?: string[];
  difficultyDistribution?: Record<string, Record<string, number>>;
}) {
  const assignment = await getTeacherAssignment(data.teacherId, data.classId);
  if (!assignment) {
    throw new ForbiddenError('You are not assigned to this class');
  }

  const conceptData = await getConcept(data.textbookId, data.chapterId, data.conceptId);
  if (!conceptData) {
    throw new NotFoundError('Concept not found');
  }
  const conceptName = conceptData.title || conceptData.name || 'Untitled Concept';

  const selectedModels = data.selectedModels ?? [];
  const questionCount = data.questionCount ?? 0;
  const targetTypes = resolveTypes(selectedModels);

  const difficultyDistribution = data.difficultyDistribution;
  const perDifficultyTotal: Record<string, number> = {};
  const diffOrder = ['easy', 'medium', 'hard', 'hots'];
  if (difficultyDistribution) {
    for (const diff of diffOrder) {
      const row = difficultyDistribution[diff];
      if (row) {
        perDifficultyTotal[diff] = Object.entries(row).reduce((sum: number, [qType, needRaw]) => {
          if (targetTypes.length > 0 && !targetTypes.includes(qType)) return sum;
          const need = Number(needRaw) || 0;
          return sum + (need > 0 ? need : 0);
        }, 0);
      } else {
        perDifficultyTotal[diff] = 0;
      }
    }
  }

  let matchingQuestions: any[];
  let aiGeneratedCount = 0;
  let aiErrorMessage = '';

  const hasDifficultyDist = difficultyDistribution && diffOrder.some((d) => (perDifficultyTotal[d] || 0) > 0);
  const DIFF_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2, hots: 3 };
  const requestedTotal = data.questions?.length
    ? data.questions.length
    : hasDifficultyDist
      ? Object.values(perDifficultyTotal).reduce((s: number, v: number) => s + v, 0)
      : questionCount || 0;

  if (data.questions && data.questions.length > 0) {
    matchingQuestions = data.questions.map((q: any) => ({
      id: q.id || uuidv4(),
      type: q.type || 'mcq',
      text: q.text || q.question || fallbackText(q.type, q.options),
      options: q.options || null,
      correctAnswer: q.correctAnswer || q.answer || '',
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
      points: q.points || 2,
    }));
  } else {
    const questionBank = await getConceptQuestions(data.conceptId);
    matchingQuestions = [];

    if (hasDifficultyDist) {
      const usedBankIds = new Set<string>();
      const shortfall: Record<string, Record<string, number>> = {};

      for (const diff of diffOrder) {
        shortfall[diff] = {};
        const distRow = difficultyDistribution[diff];
        if (!distRow) continue;

        for (const [qType, needRaw] of Object.entries(distRow)) {
          if (targetTypes.length > 0 && !targetTypes.includes(qType)) continue;
          const need = Number(needRaw) || 0;
          if (need <= 0) continue;

          shortfall[diff][qType] = need;

          const candidates = questionBank.filter((q: any) =>
            q.difficulty === diff &&
            q.type === qType &&
            !usedBankIds.has(q.id)
          );
          const shuffled = [...candidates].sort(() => Math.random() - 0.5);
          const taken = shuffled.slice(0, need);

          for (const q of taken) {
            usedBankIds.add(q.id);
            matchingQuestions.push({
              id: q.id,
              type: q.type || 'mcq',
              text: q.question || q.text || fallbackText(q.type, q.options),
              options: q.options || null,
              correctAnswer: q.correctAnswer || q.answer || '',
              explanation: q.explanation || '',
              difficulty: diff,
              points: q.points || 2,
            });
          }

          shortfall[diff][qType] = need - taken.length;
        }
      }

      const totalAiNeeded = Object.values(shortfall).reduce(
        (sum, row) => sum + Object.values(row).reduce((s, v) => s + Math.max(0, v as number), 0), 0
      );

      if (totalAiNeeded > 0) {
        logger.info('Generating AI questions per difficulty × type', { conceptName, shortfall });

        const diffDescriptions: Record<string, string> = {
          easy: 'Easy — Remember/Recall: define, identify, list, name, recall, recognize, state facts',
          medium: 'Medium — Understand: explain, describe, compare, summarize, interpret, classify',
          hard: 'Hard — Apply/Analyze: apply concepts to scenarios, analyze, differentiate, solve multi-step problems',
          hots: 'HOTS — Evaluate/Create: evaluate, design, create, justify, critique, synthesize new ideas',
        };

        const breakdownLines: string[] = [];
        for (const diff of diffOrder) {
          const row = shortfall[diff];
          if (!row) continue;
          const typeLines = Object.entries(row)
            .filter(([, v]) => (v as number) > 0)
            .map(([t, v]) => `    ${t}: ${v}`);
          if (typeLines.length > 0) {
            breakdownLines.push(`  ${diff} — ${diffDescriptions[diff]}:`);
            breakdownLines.push(...typeLines);
          }
        }

        const difficultyBreakdown = `Difficulty × Type breakdown (MUST match EXACTLY):\n${breakdownLines.join('\n')}\n`;

        const formatInstructions = `- type: one of "${Object.keys(shortfall).flatMap(d => Object.keys(shortfall[d] || {})).filter((v, i, a) => a.indexOf(v) === i).join(', ')}"
- text: the question text
- options: array of 4 options (for mcq, true_false, fill_blank only — set to null for short_answer)
- correctAnswer: the correct answer string
- explanation: brief explanation
- difficulty: the exact difficulty label from the distribution
- points: number (1-5)`;

        const prompt = `You are an educational assessment generator following Bloom's Taxonomy. Generate EXACTLY ${totalAiNeeded} questions for the concept "${conceptName}".

${difficultyBreakdown}
IMPORTANT: You MUST generate exactly these counts. Each question must match BOTH its assigned difficulty AND type from the breakdown above. Each question must have:
${formatInstructions}

Return ONLY valid JSON: { "questions": [ ... ] } with exactly ${totalAiNeeded} items.`;

        const parseAiResponse = (raw: string): any[] => {
          const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gm, '').trim();
          const braceStart = cleaned.indexOf('{');
          const braceEnd = cleaned.lastIndexOf('}');
          const jsonStr = braceStart !== -1 && braceEnd !== -1 ? cleaned.slice(braceStart, braceEnd + 1) : cleaned;
          const parsed = JSON.parse(jsonStr);
          return parsed.questions || (Array.isArray(parsed) ? parsed : []);
        };

        const pushMatching = (questions: any[], shortfallState: Record<string, Record<string, number>>, leftoverAcc: any[]) => {
          for (const q of questions) {
            const d = (q.difficulty || 'medium') as string;
            const t = (q.type || 'mcq') as string;
            if (shortfallState[d] && (shortfallState[d][t] || 0) > 0) {
              matchingQuestions.push({
                id: uuidv4(), type: t,
                text: q.question || q.text || fallbackText(t, q.options),
                options: q.options || null,
                correctAnswer: q.correctAnswer || q.answer || '',
                explanation: q.explanation || '',
                difficulty: d, points: q.points || 2,
              });
              aiGeneratedCount++;
              shortfallState[d][t]--;
            } else {
              leftoverAcc.push(q);
            }
          }
        };

        const fillLeftover = (shortfallState: Record<string, Record<string, number>>, leftoverAcc: any[]) => {
          const slots: Array<{ diff: string; type: string }> = [];
          for (const diff of diffOrder) {
            const row = shortfallState[diff];
            if (!row) continue;
            for (const [t, count] of Object.entries(row)) {
              for (let i = 0; i < (count as number); i++) slots.push({ diff, type: t });
            }
          }
          let filled = 0;
          for (const slot of slots) {
            const q = leftoverAcc.shift();
            if (!q) break;
            matchingQuestions.push({
              id: uuidv4(), type: slot.type,
              text: q.question || q.text || fallbackText(slot.type, q.options),
              options: q.options || null,
              correctAnswer: q.correctAnswer || q.answer || '',
              explanation: q.explanation || '',
              difficulty: slot.diff, points: q.points || 2,
            });
            aiGeneratedCount++;
            shortfallState[slot.diff][slot.type]--;
            filled++;
          }
          return slots.length - filled;
        };

        const remainingShortfall: Record<string, Record<string, number>> = {};
        for (const diff of diffOrder) {
          remainingShortfall[diff] = { ...(shortfall[diff] || {}) };
        }

        const callAndProcess = async (p: string): Promise<number> => {
          const raw = await chatCompletion({
            model: env.AI_MODEL,
            messages: [
              { role: 'system', content: 'You are an educational assessment generator. Return only valid JSON.' },
              { role: 'user', content: p },
            ],
            temperature: 0.7,
            max_tokens: 8192,
          });
          const parsed = parseAiResponse(raw);
          const leftover: any[] = [];
          pushMatching(parsed, remainingShortfall, leftover);
          return fillLeftover(remainingShortfall, leftover);
        };

        try {
          await callAndProcess(prompt);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          aiErrorMessage = errMsg;
          logger.error('Failed to generate questions for quiz', { conceptName, error: errMsg });
        }

        // Fill any remaining unfilled slots with placeholder questions
        for (const diff of diffOrder) {
          const row = remainingShortfall[diff];
          if (!row) continue;
          for (const [t, count] of Object.entries(row)) {
            for (let i = 0; i < (count as number); i++) {
              matchingQuestions.push({
                id: uuidv4(), type: t,
                text: `Explain the concept of ${conceptName} as it relates to ${t} at a ${diff} level.`,
                options: t === 'mcq' || t === 'true_false' || t === 'fill_blank' ? ['Option A', 'Option B', 'Option C', 'Option D'] : null,
                correctAnswer: 'Sample answer',
                explanation: `This ${t} question covers ${conceptName}.`,
                difficulty: diff, points: 2,
              });
              aiGeneratedCount++;
            }
          }
        }
      }

      // Remove duplicates
      matchingQuestions = Array.from(
        new Map(matchingQuestions.map((q: any) => [q.id, q])).values()
      );

      // Post-filter: discard questions with unexpected types
      if (targetTypes.length > 0) {
        matchingQuestions = matchingQuestions.filter((q: any) => targetTypes.includes(q.type));
      }

      // Log distribution snapshot
      logger.info('[QuizV2 Distribution Check]', {
        matchingQuestionsLength: matchingQuestions.length,
        perDifficultyTotal,
        aiGeneratedCount,
        targetTypes,
      });
    } else {
      matchingQuestions = targetTypes.length > 0
        ? questionBank.filter((q: any) => targetTypes.includes(q.type))
        : [...questionBank];

      if (questionCount > 0 && matchingQuestions.length < questionCount) {
        const needed = questionCount - matchingQuestions.length;
        logger.info('Generating additional questions via AI', { conceptName, needed, existing: matchingQuestions.length });

        const typeNames = selectedModels.length > 0
          ? selectedModels.map((m: string) => (TYPE_MAP[m] || [m])[0]).join(', ')
          : 'mcq, true_false, short_answer, fill_blank';

        const hasMatching = typeNames.includes('matching');

        let formatInstructions = `- type: one of "${typeNames}"
- text: the question text
- options: array of 4 options (for mcq, true_false, fill_blank only — set to null for short_answer)
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
            const qType = q.type || 'mcq';
            const validTypes = targetTypes.length > 0 ? targetTypes : ALL_QUESTION_TYPES;
            if (!validTypes.includes(qType)) continue;
            matchingQuestions.push({
              id: uuidv4(),
              type: qType,
              text: q.question || q.text || fallbackText(qType, q.options),
              options: q.options || null,
              correctAnswer: q.correctAnswer || q.answer || '',
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
  }

  if (hasDifficultyDist) {
    matchingQuestions.sort((a: any, b: any) => {
      const orderA = DIFF_ORDER[a.difficulty] ?? 99;
      const orderB = DIFF_ORDER[b.difficulty] ?? 99;
      return orderA - orderB;
    });
  }

  // ── FINAL: enforce requestedTotal as single source of truth ──
  {
    const before = matchingQuestions.length;
    matchingQuestions = Array.from(
      new Map(matchingQuestions.map((q: any) => [q.id, q])).values()
    );
    const duplicates = before - matchingQuestions.length;
    logger.info('[QuizV2 Final]', {
      requestedTotal, beforeDedup: before, duplicates, afterDedup: matchingQuestions.length,
      hasDifficultyDist, targetTypes, perDifficultyTotal,
    });
    if (matchingQuestions.length > requestedTotal) {
      matchingQuestions = matchingQuestions.slice(0, requestedTotal);
    }
    if (matchingQuestions.length < requestedTotal) {
      throw new AppError(500, `Insufficient questions generated. Expected ${requestedTotal}, got ${matchingQuestions.length}. Regenerate quiz.`);
    }
  }

  if (data.preview) {
    const previewQuestions = matchingQuestions.map((q: any) => {
      const rawQuestion = q.question;
      const rawText = q.text;
      const dataQuestion = (typeof q.data === 'object' && q.data) ? (q.data.question || q.data.text) : '';
      const finalText = rawQuestion || rawText || dataQuestion || fallbackText(q.type, q.options);
      logger.info('[QuizV2 Preview]', { qId: q.id, type: q.type, rawQuestion: rawQuestion?.substring(0, 50), rawText: rawText?.substring(0, 50), dataQuestion: dataQuestion?.substring(0, 50), finalText: finalText?.substring(0, 50) });
      const correctAnswer = q.answer || q.correctAnswer || (typeof q.data === 'object' && q.data ? (q.data.answer || q.data.correctAnswer) : '') || '';
      return {
        id: q.id, type: q.type, text: finalText, options: q.options,
        correctAnswer, explanation: q.explanation,
        difficulty: q.difficulty, points: q.points,
      };
    });
    return {
      preview: true,
      questionCount: matchingQuestions.length,
      questions: previewQuestions,
      existingCount: matchingQuestions.length - aiGeneratedCount,
      aiGeneratedCount,
      aiErrorMessage: aiErrorMessage || undefined,
      _debug: {
        requestedTotal,
        matchingQuestionsLength: matchingQuestions.length,
        perDifficultyTotal,
        targetTypes,
        selectedModels,
      },
    };
  }

  // save questions to concept bank
  if (!data.questions) {
    const existing = await getConceptQuestions(data.conceptId);
    const existingIds = new Set(existing.map((q: any) => q.id));
    const toSave = matchingQuestions.filter((q: any) => !existingIds.has(q.id));
    if (toSave.length > 0) {
      await upsertQuestions(toSave, data.conceptId, data.textbookId, data.chapterId);
      logger.info('AI-generated questions saved to concept', { conceptId: data.conceptId, count: toSave.length });
    }
  } else {
    await upsertQuestions(matchingQuestions, data.conceptId, data.textbookId, data.chapterId);
    logger.info('Teacher-edited questions saved to concept', { conceptId: data.conceptId, count: matchingQuestions.length });
  }

  const totalPoints = matchingQuestions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);

  const quizId = uuidv4();
  const now = new Date().toISOString();

  const quizData: Record<string, unknown> = {
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
    totalPoints: matchingQuestions.reduce((sum: number, q: any) => sum + (q.points || 0), 0),
    questions: matchingQuestions.map((q: any) => {
      const questionText = q.question || q.text || (typeof q.data === 'object' && q.data ? (q.data.question || q.data.text) : '') || fallbackText(q.type, q.options);
      const correctAnswer = q.answer || q.correctAnswer || (typeof q.data === 'object' && q.data ? (q.data.answer || q.data.correctAnswer) : '') || '';
      return {
        id: q.id, type: q.type, text: questionText, options: q.options || undefined,
        correctAnswer, explanation: q.explanation || '',
        difficulty: q.difficulty || 'medium', points: q.points || 1,
      };
    }),
    passingScore: data.passingScore ?? 50,
    maxAttempts: data.maxAttempts ?? 3,
    shuffleQuestions: data.shuffleQuestions ?? true,
    showResults: data.showResults ?? false,
    attemptCount: 0,
    releasedAt: null,
    publishedTo: data.publishedTo || 'class',
    targetStudentIds: data.targetStudentIds || [],
    schoolId: data.schoolId || '',
    createdAt: now,
    updatedAt: now,
  };

  await nosqlSet(QV2, quizId, quizData);

  logger.info('Quiz V2 created', { quizId, classId: data.classId, title: data.title, totalQuestions: matchingQuestions.length });

  return { ...quizData, totalQuestions: matchingQuestions.length, questions: matchingQuestions.map((q: any) => ({ id: q.id, type: q.type, text: q.text || q.question || fallbackText(q.type, q.options), options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation, difficulty: q.difficulty, points: q.points })) };
}

export async function updateQuiz(quizId: string, teacherId: string, data: Record<string, unknown>) {
  const { exists, data: quizData } = await nosqlGet(QV2, quizId);
  if (!exists || !quizData) throw new NotFoundError('Quiz not found');
  if (quizData.teacherId !== teacherId) throw new ForbiddenError('You do not own this quiz');

  const allowed = ['title', 'timeLimitMinutes', 'passingScore', 'maxAttempts', 'shuffleQuestions', 'showResults', 'description'];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if (data[key] !== undefined) updates[key] = data[key];
  }

  await nosqlUpdate(QV2, quizId, updates);
  const updated = await nosqlGet(QV2, quizId);
  logger.info('Quiz V2 updated', { quizId, teacherId, updates: Object.keys(updates) });
  return { id: quizId, ...updated.data };
}

export async function releaseQuiz(quizId: string, teacherId: string) {
  const { exists, data: quizData } = await nosqlGet(QV2, quizId);
  if (!exists || !quizData) throw new NotFoundError('Quiz not found');
  if (quizData.teacherId !== teacherId) throw new ForbiddenError('You do not own this quiz');

  const now = new Date().toISOString();
  await nosqlUpdate(QV2, quizId, { releasedAt: now, updatedAt: now });
  const updated = await nosqlGet(QV2, quizId);
  logger.info('Quiz V2 released', { quizId, teacherId });
  return { id: quizId, ...updated.data };
}

const POINTS_BY_DIFFICULTY: Record<string, number> = { easy: 1, medium: 2, hard: 3, hots: 4 };

export async function startQuizAttempt(quizId: string, studentId: string, selectedModels: string[]) {
  const supabase = getSupabaseAdmin()!;
  const { exists: quizExists, data: quizData } = await nosqlGet(QV2, quizId);
  if (!quizExists || !quizData) throw new NotFoundError('Quiz not found');
  if (!quizData.releasedAt) throw new ForbiddenError('Quiz is not yet released');

  const attempts = await nosqlQuery(QAV2, { quizId, studentId });
  const totalAttempts = attempts.length;
  const maxAttempts = (quizData.maxAttempts as number) || 3;
  if (!quizData.isRepublished && totalAttempts >= maxAttempts) throw new ForbiddenError('Maximum attempts reached');

  const { data: userRow } = await supabase.from('users').select('data').eq('id', studentId).maybeSingle();
  const studentLevel: StudentLevel = ((userRow?.data as any)?.level as StudentLevel) || 'beginner';

  let questionBank: Array<Record<string, unknown>>;

  const storedQuestions = quizData.questions as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(storedQuestions) && storedQuestions.length > 0) {
    questionBank = storedQuestions.map((q: any) => ({
      id: q.id || uuidv4(), type: q.type || 'short_answer',
      difficulty: (q.difficulty as Difficulty) || 'medium',
      text: q.text || q.question || fallbackText(q.type, q.options), options: q.options || undefined,
      correctAnswer: q.correctAnswer || '', explanation: q.explanation || '',
      points: q.points || 1,
    }));
  } else if (quizData.textbookId && quizData.chapterId && quizData.conceptId) {
    const c = await getConcept(quizData.textbookId as string, quizData.chapterId as string, quizData.conceptId as string);
    if (!c) throw new NotFoundError('Concept not found');
    const rows = await getConceptQuestions(quizData.conceptId as string);
    questionBank = rows.map((r: any) => ({
      id: r.id, type: r.type || 'short_answer',
      difficulty: (r.difficulty as Difficulty) || 'medium',
      text: r.text || r.question || fallbackText(r.type, r.options), options: r.options || undefined,
      correctAnswer: r.correct_answer || r.correctAnswer || '', explanation: r.explanation || '',
      points: r.points || 1,
    }));
  } else {
    questionBank = [];
  }

  const targetTypes = resolveTypes(selectedModels);
  let available: Array<Record<string, unknown>> = targetTypes.length > 0
    ? questionBank.filter((q: any) => targetTypes.includes(q.type))
    : [...questionBank];
  if (available.length === 0) available = [...questionBank];

  if (quizData.shuffleQuestions !== false) {
    available = [...available].sort(() => Math.random() - 0.5);
  }

  const selected = available.slice(0, Math.min((quizData.questionCount as number) || 0, available.length));
  if (selected.length === 0) throw new AppError(400, 'No questions match the selected formats. Please contact your teacher.');

  const questionsForStudent = selected.map((q: any) => {
    if (quizData.isRepublished) return q;
    const { correctAnswer, ...rest } = q;
    return rest;
  });

  const attemptId = uuidv4();
  const now = new Date().toISOString();

  const attempt: Record<string, unknown> = {
    id: attemptId, quizId, studentId, startedAt: now, submittedAt: null,
    answers: [], score: null,
    totalPoints: selected.reduce((sum: number, q: any) => sum + (POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1), 0),
    percentage: null, passed: null, timeSpent: 0,
    status: 'in_progress', selectedModels, level: studentLevel,
  };

  await nosqlSet(QAV2, attemptId, attempt);

  if (!quizData.isRepublished) {
    const curCount = (quizData.attemptCount as number) || 0;
    await nosqlUpdate(QV2, quizId, { attemptCount: curCount + 1, updatedAt: now });
  }

  logger.info('Quiz V2 attempt started', { quizId, studentId, attemptId });
  return { ...attempt, questions: questionsForStudent };
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

  let questionBank: Array<Record<string, unknown>>;
  const storedQuestions = quizData.questions as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(storedQuestions) && storedQuestions.length > 0) {
    questionBank = storedQuestions.map((q: any) => ({
      id: q.id || uuidv4(), type: q.type || 'short_answer',
      difficulty: (q.difficulty as Difficulty) || 'medium',
      text: q.text || q.question || fallbackText(q.type, q.options), options: q.options || undefined,
      correctAnswer: q.correctAnswer || '', explanation: q.explanation || '',
      points: q.points || 1,
    }));
  } else {
    const rows = await getConceptQuestions(quizData.conceptId as string);
    questionBank = rows.map((r: any) => ({
      id: r.id, type: r.type || 'short_answer',
      difficulty: (r.difficulty as Difficulty) || 'medium',
      text: r.text || r.question || fallbackText(r.type, r.options), options: r.options || undefined,
      correctAnswer: r.correct_answer || r.correctAnswer || '', explanation: r.explanation || '',
      points: r.points || 1,
    }));
  }

  let score = 0;
  const gradedAnswers = data.answers.map((answer) => {
    const question = questionBank.find((q: any) => q.id === answer.questionId) as Record<string, unknown> | undefined;
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
    const qType = question.type as string;
    const normalizedCorrect = normalize(question.correctAnswer);
    const normalizedAnswer = normalize(answer.answer);

    if (!normalizedCorrect && normalizedAnswer) {
      // No stored answer but student answered — auto-grading impossible, give credit
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

    const pointsEarned = isCorrect ? (POINTS_BY_DIFFICULTY[(question.difficulty as string) || 'medium'] || 1) : 0;
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
    const skippedIds = new Set(gradedAnswers.filter((a: any) => a.skipped).map((a: any) => a.questionId));
    const skippedPointValues = questionBank
      .filter((q: any) => skippedIds.has(q.id))
      .reduce((sum: number, q: any) => sum + (POINTS_BY_DIFFICULTY[(q.difficulty as string) || 'medium'] || 1), 0);
    totalPoints = Math.max(totalPoints - skippedPointValues, 0);
  }

  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  const passingScore = (quizData.passingScore as number) || 50;
  const passed = percentage >= passingScore;

  const activeAnswers = isRepublished
    ? gradedAnswers.filter((a: any) => !a.skipped)
    : gradedAnswers;
  const accuracy = totalPoints > 0 ? score / totalPoints : 0;
  const avgReactionTime = activeAnswers.length > 0
    ? activeAnswers.reduce((sum: number, a: any) => sum + (a.timeSpent || 0), 0) / activeAnswers.length
    : 0;

  const difficultyMap: Record<string, Difficulty> = {};
  for (const q of questionBank) { difficultyMap[q.id as string] = (q.difficulty as Difficulty) || 'easy'; }
  const complexityHandled = computeComplexityHandled(
    activeAnswers.map((a: any) => ({ questionId: a.questionId, correct: a.isCorrect })),
    difficultyMap,
  );
  const newLevel = computeLevel(accuracy, avgReactionTime, complexityHandled);

  const { data: existing } = await supabase.from('users').select('data').eq('id', studentId).maybeSingle();
  const merged = { ...((existing?.data as Record<string, unknown>) || {}), level: newLevel };
  const { error: updateErr } = await supabase.from('users').update({ data: merged }).eq('id', studentId);
  if (updateErr) throw updateErr;

  const result: Record<string, unknown> = {
    answers: gradedAnswers, score, totalPoints, percentage, passed,
    showResults: (quizData.showResults as boolean) ?? false,
    timeSpent, submittedAt, status: 'completed',
  };
  await nosqlUpdate(QAV2, attemptId, result);

  const now = new Date().toISOString();
  const gradeId = uuidv4();
  const { error: gradeErr } = await supabase.from('firestore_docs').insert({
    collection: 'grades',
    doc_id: gradeId,
    data: {
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
    },
  });
  if (gradeErr) logger.warn('Failed to create quiz grade record', { error: gradeErr.message });

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

  if (quizData.conceptId) {
    computeMastery(studentId, quizData.conceptId as string, accuracy).catch(err =>
      logger.error('Mastery update failed', { studentId, conceptId: quizData.conceptId, error: err })
    );
  }

  return { id: attemptId, ...attemptData, ...result, level: newLevel, newBadges: allNewBadges };
}

export async function releaseQuizGrades(quizId: string, showResults: boolean) {
  const { exists } = await nosqlGet(QV2, quizId);
  if (!exists) throw new NotFoundError('Quiz not found');
  await nosqlUpdate(QV2, quizId, { showResults, updatedAt: new Date().toISOString() });
  logger.info('Quiz V2 grades release toggled', { quizId, showResults });
  const updated = await nosqlGet(QV2, quizId);
  return { id: quizId, ...updated.data };
}

export async function getQuizResults(quizId: string, studentId: string) {
  const nq = await nosqlGet(QV2, quizId);
  const quizData = nq.data as Record<string, unknown> | null;
  if (!quizData) throw new NotFoundError('Quiz not found');
  const resultsGated = !(quizData.showResults as boolean);

  const attempts = await nosqlQuery(QAV2, { quizId, studentId });

  const completed = attempts.filter((a: any) => a.status === 'completed' && a.percentage != null);
  if (completed.length === 0) {
    return [];
  }

  const best = completed.reduce((best: any, curr: any) =>
    curr.percentage > best.percentage ? curr : best
  );

  const quizQuestionsMap: Record<string, { correctAnswer: string; explanation: string; difficulty: string }> = {};
  for (const q of ((quizData.questions as any[]) || [])) {
    quizQuestionsMap[q.id] = { correctAnswer: q.correctAnswer || '', explanation: q.explanation || '', difficulty: q.difficulty || 'medium' };
  }

  const results = [best].map((data: any) => {
    if (resultsGated && data.status === 'completed') {
      return {
        id: data.id, quizId: data.quizId, studentId: data.studentId,
        score: data.score, totalPoints: data.totalPoints, percentage: data.percentage,
        passed: data.passed, timeSpent: data.timeSpent, startedAt: data.startedAt,
        submittedAt: data.submittedAt, status: data.status,
        selectedModels: data.selectedModels, level: data.level, showResults: false,
        answers: data.answers?.map((a: { questionId: string; pointsEarned: number }) => ({
          questionId: a.questionId, pointsEarned: a.pointsEarned,
        })) ?? [],
      };
    }
    let regradedScore = 0;
    let regradedTotal = (data.totalPoints as number) || 0;
    const answers = (data.answers || []).map((a: any) => {
      if (a.skipped) {
        const pointVal = quizQuestionsMap[a.questionId]
          ? (POINTS_BY_DIFFICULTY[quizQuestionsMap[a.questionId].difficulty] || 1)
          : 1;
        regradedTotal -= pointVal;
        return { ...a, correctAnswer: a.correctAnswer || quizQuestionsMap[a.questionId]?.correctAnswer || '' };
      }
      if (!a.correctAnswer && quizQuestionsMap[a.questionId]) {
        const q = quizQuestionsMap[a.questionId];
        const normalize = (v: unknown) => v?.toString().toLowerCase().trim() || '';
        const isCorrect = normalize(a.answer) === normalize(q.correctAnswer);
        const pointsEarned = isCorrect ? (POINTS_BY_DIFFICULTY[q.difficulty] || 1) : 0;
        regradedScore += pointsEarned;
        return { ...a, correctAnswer: q.correctAnswer, explanation: a.explanation || q.explanation, isCorrect, pointsEarned };
      }
      regradedScore += a.pointsEarned || 0;
      return a;
    });
    const tp = Math.max(regradedTotal, 1);
    const pct = Math.round((regradedScore / tp) * 100);
    return { ...data, showResults: (quizData.showResults as boolean) ?? false, answers, score: regradedScore, percentage: pct };
  });

  return results;
}

export async function getQuizById(quizId: string) {
  const { exists, data } = await nosqlGet(QV2, quizId);
  if (!exists || !data) throw new NotFoundError('Quiz not found');
  return { id: quizId, ...data };
}

export async function listQuizzesForClass(classId: string, _schoolId?: string, studentId?: string): Promise<any[]> {
  const supabase = getSupabaseAdmin()!;
  let items = await nosqlQuery(QV2, { classId });

  if (studentId) {
    items = items.filter((q: any) => {
      if (!q.publishedTo || q.publishedTo === 'class') return true;
      if (q.publishedTo === 'students') return (q.targetStudentIds || []).includes(studentId);
      return true;
    });
  }

  const resolvedItems = await Promise.all(
    items.map(async (item: any) => {
      if (!item.subjectId && item.textbookId) {
        try {
          const { data: tb } = await supabase.from('textbooks').select('subject_id').eq('id', item.textbookId).maybeSingle();
          if (tb) item.subjectId = tb.subject_id;
        } catch (err) { logger.error('Failed to resolve fallback subjectId for quiz', { quizId: item.id, err }); }
      }
      if (item.subjectId) {
        try {
          const { data: sub } = await supabase.from('subjects').select('name').eq('id', item.subjectId).maybeSingle();
          if (sub) item.subjectName = sub.name;
        } catch (err) { logger.error('Failed to resolve subject name', { quizId: item.id, subjectId: item.subjectId, err }); }
      }
      return item;
    })
  );

  const chapterIds = [...new Set(resolvedItems.map((q: any) => q.chapterId).filter(Boolean))];
  const conceptIds = [...new Set(resolvedItems.map((q: any) => q.conceptId).filter(Boolean))];
  const chapterMap = new Map<string, string>();
  const conceptMap = new Map<string, string>();

  if (chapterIds.length > 0) {
    const { data } = await supabase.from('chapters').select('id, title').in('id', chapterIds);
    (data || []).forEach((r: any) => chapterMap.set(r.id, r.title));
  }
  if (conceptIds.length > 0) {
    const { data } = await supabase.from('concepts').select('id, title').in('id', conceptIds);
    (data || []).forEach((r: any) => conceptMap.set(r.id, r.title));
  }

  for (const q of resolvedItems) {
    if (q.chapterId && chapterMap.has(q.chapterId)) q.chapterTitle = chapterMap.get(q.chapterId);
    if (q.conceptId && conceptMap.has(q.conceptId)) q.conceptTitle = conceptMap.get(q.conceptId);
  }

  return resolvedItems.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listQuizzesForTeacher(teacherId: string, _schoolId?: string): Promise<any[]> {
  const items = await nosqlQuery(QV2, { teacherId });
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getQuizForConcept(conceptId: string) {
  const items = await nosqlQuery(QV2, { conceptId });
  return items.map((d: any) => ({ id: d.id, ...d }));
}

export async function republishQuiz(quizId: string, teacherId: string) {
  const { exists, data: quizData } = await nosqlGet(QV2, quizId);
  if (!exists || !quizData) throw new NotFoundError('Quiz not found');
  if (quizData.teacherId !== teacherId) throw new ForbiddenError('You do not own this quiz');

  const now = new Date().toISOString();
  await nosqlUpdate(QV2, quizId, { isRepublished: true, updatedAt: now });
  const updated = await nosqlGet(QV2, quizId);
  logger.info('Quiz V2 republished (interactive mode enabled)', { quizId, teacherId });
  return { id: quizId, ...updated.data };
}

export async function deleteQuiz(quizId: string, teacherId: string) {
  const supabase = getSupabaseAdmin()!;
  const { exists, data: quizData } = await nosqlGet(QV2, quizId);
  if (!exists || !quizData) throw new NotFoundError('Quiz not found');
  if (quizData.teacherId !== teacherId) throw new ForbiddenError('You do not own this quiz');

  const attempts = await nosqlQuery(QAV2, { quizId });
  for (const a of attempts) {
    await nosqlDelete(QAV2, (a as any).id);
  }
  await nosqlDelete(QV2, quizId);
  logger.info('Quiz V2 deleted', { quizId, teacherId, attemptsDeleted: attempts.length });
}

export async function getQuizAttemptsForStudent(studentId: string) {
  const items = await nosqlQuery(QAV2, { studentId });
  return items;
}
