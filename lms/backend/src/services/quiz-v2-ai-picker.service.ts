import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { chatCompletion } from './ai.service';
import { env } from '../config/env';
import { fallbackText, TYPE_MAP, ALL_QUESTION_TYPES } from './quiz-v2-question.service';
import { getConceptQuestions } from './quiz-v2-question.service';

const DIFF_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2, hots: 3 };

function makeQuestion(q: any, overrides: Record<string, unknown> = {}): any {
  return {
    id: q.id || uuidv4(),
    type: q.type || 'mcq',
    text: q.question || q.text || fallbackText(q.type, q.options),
    options: q.options || null,
    correctAnswer: q.correctAnswer || q.answer || '',
    explanation: q.explanation || '',
    difficulty: q.difficulty || 'medium',
    points: q.points || 2,
    ...overrides,
  };
}

async function callAiForQuestions(prompt: string, conceptName: string): Promise<any[]> {
  let raw = '';
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      raw = await chatCompletion({
        model: env.AI_MODEL,
        messages: [
          { role: 'system', content: 'You are an educational assessment generator. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 8192,
      });
      break;
    } catch (err) {
      if (attempt < 2) { logger.warn('AI retry', { attempt, conceptName, error: err }); continue; }
      throw err;
    }
  }
  const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gm, '').trim();
  const braceStart = cleaned.indexOf('{');
  const braceEnd = cleaned.lastIndexOf('}');
  const jsonStr = braceStart !== -1 && braceEnd !== -1 ? cleaned.slice(braceStart, braceEnd + 1) : cleaned;
  const parsed = JSON.parse(jsonStr);
  return parsed.questions || (Array.isArray(parsed) ? parsed : []);
}

export async function gatherQuizQuestions(params: {
  conceptId: string;
  conceptName: string;
  questionCount: number;
  selectedModels: string[];
  targetTypes: string[];
  difficultyDistribution?: Record<string, Record<string, number>>;
  manualQuestions?: any[];
}): Promise<{
  questions: any[];
  aiGeneratedCount: number;
  aiErrorMessage: string;
  requestedTotal: number;
}> {
  const { conceptId, conceptName, questionCount, selectedModels, targetTypes, difficultyDistribution, manualQuestions } = params;
  const diffOrder = ['easy', 'medium', 'hard', 'hots'];

  const perDifficultyTotal: Record<string, number> = {};
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

  const hasDifficultyDist = difficultyDistribution && diffOrder.some((d) => (perDifficultyTotal[d] || 0) > 0);
  const requestedTotal = manualQuestions?.length
    ? manualQuestions.length
    : hasDifficultyDist
      ? Object.values(perDifficultyTotal).reduce((s: number, v: number) => s + v, 0)
      : questionCount || 0;

  let matchingQuestions: any[];
  let aiGeneratedCount = 0;
  let aiErrorMessage = '';

  if (manualQuestions && manualQuestions.length > 0) {
    matchingQuestions = manualQuestions.map((q: any) => makeQuestion(q));
  } else {
    const questionBank = await getConceptQuestions(conceptId);
    matchingQuestions = [];

    if (hasDifficultyDist) {
      const usedBankIds = new Set<string>();
      for (const diff of diffOrder) {
        const distRow = difficultyDistribution![diff];
        if (!distRow) continue;
        for (const [qType, needRaw] of Object.entries(distRow)) {
          if (targetTypes.length > 0 && !targetTypes.includes(qType)) continue;
          const need = Number(needRaw) || 0;
          if (need <= 0) continue;
          for (const q of [...questionBank.filter((qb: any) =>
            qb.difficulty === diff && qb.type === qType && !usedBankIds.has(qb.id)
          )].sort(() => Math.random() - 0.5).slice(0, need)) {
            usedBankIds.add(q.id);
            matchingQuestions.push(makeQuestion(q, { id: q.id, difficulty: diff }));
          }
        }
      }

      const missing = requestedTotal - matchingQuestions.length;
      if (missing > 0) {
        logger.info('Generating AI questions', { conceptName, missing });

        const diffDescriptions: Record<string, string> = {
          easy: 'Easy — Remember/Recall: define, identify, list, name, recall, recognize, state facts',
          medium: 'Medium — Understand: explain, describe, compare, summarize, interpret, classify',
          hard: 'Hard — Apply/Analyze: apply concepts to scenarios, analyze, differentiate, solve multi-step problems',
          hots: 'HOTS — Evaluate/Create: evaluate, design, create, justify, critique, synthesize new ideas',
        };

        const shortfall: Record<string, Record<string, number>> = {};
        for (const diff of diffOrder) {
          const distRow = difficultyDistribution![diff];
          if (!distRow) continue;
          for (const [qType, needRaw] of Object.entries(distRow)) {
            if (targetTypes.length > 0 && !targetTypes.includes(qType)) continue;
            const need = Number(needRaw) || 0;
            if (need <= 0) continue;
            const have = matchingQuestions.filter((q: any) => q.difficulty === diff && q.type === qType).length;
            const miss = need - have;
            if (miss > 0) {
              if (!shortfall[diff]) shortfall[diff] = {};
              shortfall[diff][qType] = miss;
            }
          }
        }

        const breakdownLines: string[] = [];
        for (const diff of diffOrder) {
          const row = shortfall[diff];
          if (!row) continue;
          for (const [t, v] of Object.entries(row)) {
            if (v > 0) breakdownLines.push(`  ${diff} — ${diffDescriptions[diff]}: ${t}: ${v}`);
          }
        }

        const prompt = `You are an educational assessment generator following Bloom's Taxonomy. Generate EXACTLY ${missing} questions for the concept "${conceptName}".

Required questions by difficulty and type:
${breakdownLines.join('\n')}

IMPORTANT: You MUST generate exactly ${missing} questions. Each question must match BOTH its assigned difficulty AND type from the breakdown above. Each question must have:
- type: one of "${[...new Set(Object.values(shortfall).flatMap(r => Object.keys(r)))].join(', ')}"
- text: the question text
- options: array of 4 options (for mcq, true_false, fill_blank only — set to null for short_answer)
- correctAnswer: the correct answer string
- explanation: brief explanation
- difficulty: the exact difficulty label
- points: number (1-5)

Return ONLY valid JSON: { "questions": [ ... ] } with exactly ${missing} items.`;

        try {
          const aiQuestions = await callAiForQuestions(prompt, conceptName);

          const remaining: Record<string, Record<string, number>> = {};
          for (const diff of diffOrder) {
            if (shortfall[diff]) remaining[diff] = { ...shortfall[diff] };
          }

          for (const q of aiQuestions) {
            const d = (q.difficulty || 'medium') as string;
            const t = (q.type || 'mcq') as string;
            if (remaining[d] && (remaining[d][t] || 0) > 0) {
              matchingQuestions.push(makeQuestion(q, { difficulty: d, type: t }));
              aiGeneratedCount++;
              remaining[d][t]--;
            }
          }

          for (const diff of diffOrder) {
            const row = remaining[diff];
            if (!row) continue;
            for (const [t, count] of Object.entries(row)) {
              for (let i = 0; i < count; i++) {
                matchingQuestions.push(makeQuestion(
                  { type: t, difficulty: diff, text: `Explain the concept of ${conceptName} as it relates to ${t} at a ${diff} level.`, correctAnswer: 'Sample answer', explanation: `This ${t} question covers ${conceptName}.` },
                  { options: t === 'mcq' || t === 'true_false' || t === 'fill_blank' ? ['Option A', 'Option B', 'Option C', 'Option D'] : null },
                ));
                aiGeneratedCount++;
              }
            }
          }
        } catch (err) {
          aiErrorMessage = err instanceof Error ? err.message : String(err);
          logger.error('Failed to generate questions for quiz', { conceptName, error: aiErrorMessage });
        }
      }

      matchingQuestions = Array.from(new Map(matchingQuestions.map((q: any) => [q.id, q])).values());
      logger.info('[QuizV2 Distribution Check]', { matchingQuestionsLength: matchingQuestions.length, perDifficultyTotal, aiGeneratedCount, targetTypes });
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

        let formatInstructions = `- type: one of "${typeNames}"\n- text: the question text\n- options: array of 4 options (for mcq, true_false, fill_blank only — set to null for short_answer)\n- correctAnswer: the correct answer string\n- explanation: brief explanation\n- difficulty: "easy" | "medium" | "hard"\n- points: number (1-5)`;
        if (hasMatching) {
          formatInstructions += `\n\nFor matching questions:\n- options must be an array of term-definition pairs, each formatted like "Term Name - Definition description"\n- correctAnswer must be a pipe-delimited string of colon-separated pairs, e.g. "Term Name:Definition description|Term Name2:Definition2"`;
        }

        const prompt = `You are an educational assessment generator. Generate EXACTLY ${needed} questions for the concept "${conceptName}".

Question types to use: ${typeNames}

IMPORTANT: You MUST generate exactly ${needed} questions. Each question must have:
${formatInstructions}

Return ONLY valid JSON: { "questions": [ ... ] } with exactly ${needed} items in the array.`;

        try {
          const generated = (await callAiForQuestions(prompt, conceptName)).slice(0, needed);
          if (generated.length === 0) {
            logger.warn('AI returned zero questions', { conceptName });
          } else if (generated.length < needed) {
            logger.warn('AI returned fewer questions than needed', { conceptName, requested: needed, received: generated.length });
          }

          const validTypes = targetTypes.length > 0 ? targetTypes : ALL_QUESTION_TYPES;
          for (const q of generated) {
            const qType = q.type || 'mcq';
            if (!validTypes.includes(qType)) continue;
            matchingQuestions.push(makeQuestion(q));
            aiGeneratedCount++;
          }
        } catch (err) {
          aiErrorMessage = err instanceof Error ? err.message : String(err);
          logger.error('Failed to generate questions for quiz', { conceptName, error: aiErrorMessage });
        }
      }
    }
  }

  if (hasDifficultyDist) {
    matchingQuestions.sort((a: any, b: any) => (DIFF_ORDER[a.difficulty] ?? 99) - (DIFF_ORDER[b.difficulty] ?? 99));
  }

  if (targetTypes.length > 0) {
    matchingQuestions = matchingQuestions.filter((q: any) => targetTypes.includes(q.type));
  }

  const before = matchingQuestions.length;
  matchingQuestions = Array.from(new Map(matchingQuestions.map((q: any) => [q.id, q])).values());
  logger.info('[QuizV2 Final]', { requestedTotal, beforeDedup: before, duplicates: before - matchingQuestions.length, afterDedup: matchingQuestions.length, hasDifficultyDist, targetTypes, perDifficultyTotal });

  if (matchingQuestions.length > requestedTotal) matchingQuestions = matchingQuestions.slice(0, requestedTotal);
  if (matchingQuestions.length < requestedTotal) {
    throw new Error(`Insufficient questions generated. Expected ${requestedTotal}, got ${matchingQuestions.length}. Regenerate quiz.`);
  }

  return { questions: matchingQuestions, aiGeneratedCount, aiErrorMessage, requestedTotal };
}
