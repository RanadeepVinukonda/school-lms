import { chatCompletion } from './ai.service';
import { logger } from '../utils/logger';

interface GradeRequest {
  question: string;
  modelAnswer?: string;
  rubric?: string;
  answer: string;
  maxPoints: number;
}

interface GradeResult {
  score: number;
  feedback: string;
  justification: string;
}

export async function aiGrade(request: GradeRequest): Promise<GradeResult> {
  const prompt = `You are a strict but fair teacher grading a student's answer.

Question: "${request.question}"${request.modelAnswer ? `\nModel Answer: "${request.modelAnswer}"` : ''}${request.rubric ? `\nRubric: "${request.rubric}"` : ''}
Student Answer: "${request.answer}"
Max Points: ${request.maxPoints}

Grade the student's answer. Return ONLY valid JSON with:
- "score": number (0 to ${request.maxPoints})
- "feedback": string (brief, constructive, student-facing)
- "justification": string (why this score, referencing rubric/model answer)

JSON:`;

  const response = await chatCompletion({
    messages: [
      { role: 'system', content: 'You are a teacher grading student work. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 1024,
    jsonMode: true,
  });

  try {
    const parsed = JSON.parse(response) as GradeResult;
    parsed.score = Math.max(0, Math.min(request.maxPoints, Math.round(parsed.score)));
    return parsed;
  } catch {
    logger.error('AI grading parsing failed', { response });
    return { score: 0, feedback: 'Grading error. Please grade manually.', justification: 'AI response could not be parsed.' };
  }
}

export async function aiGradeBulk(
  items: Array<{ questionId: string } & GradeRequest>,
): Promise<Array<{ questionId: string } & GradeResult>> {
  const results = await Promise.allSettled(
    items.map(item => aiGrade({
      question: item.question,
      modelAnswer: item.modelAnswer,
      rubric: item.rubric,
      answer: item.answer,
      maxPoints: item.maxPoints,
    }).then(result => ({ questionId: item.questionId, ...result })))
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return { questionId: items[i].questionId, score: 0, feedback: 'Grading error', justification: 'AI grading failed' };
  });
}
