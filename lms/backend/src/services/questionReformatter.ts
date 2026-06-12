/**
 * Question Reformatter Service (Requirement 7)
 *
 * Supported transformations:
 *   mcq → true_false  ✓
 *   mcq → fill_blank  ✓
 *   all others        ✗ (throws ReformatError)
 */

export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'matching' | 'descriptive' | 'numerical' | 'passage';

export interface Question {
  id: string;
  conceptId: string;
  type: QuestionType;
  difficulty: 'easy' | 'medium' | 'hard' | 'hots';
  text: string;
  options?: string[];
  correctAnswer: string;
  passageText?: string;
  explanation?: string;
  points: number;
  /** fill_blank only — derived at compile time, not persisted */
  validator?: (answer: string) => boolean;
}

export class ReformatError extends Error {
  constructor(sourceType: string, targetType: string) {
    super(`Unsupported reformat: ${sourceType} → ${targetType}`);
    this.name = 'ReformatError';
  }
}

/**
 * Reformats an MCQ question to true/false format.
 *
 * Construction: text = `${q.text} ${q.correctAnswer}`
 * Requirement 7.1: options ["True","False"], correctAnswer "true"
 */
export function reformatToTrueFalse(q: Question): Question {
  if (q.type !== 'mcq') {
    throw new ReformatError(q.type, 'true_false');
  }
  return {
    ...q,
    type: 'true_false',
    text: `${q.text} ${q.correctAnswer}`,
    options: ['True', 'False'],
    correctAnswer: 'true',
    // points and all other fields preserved (Requirement 7.3)
    validator: undefined,
  };
}

/**
 * Reformats an MCQ question to fill-in-the-blank format.
 *
 * Requirement 7.2: replace correctAnswer text in question stem with "___"
 * Case-insensitive validator derived from original correctAnswer (Requirement 7.2)
 */
export function reformatToFillBlank(q: Question): Question & { validator: (ans: string) => boolean } {
  if (q.type !== 'mcq') {
    throw new ReformatError(q.type, 'fill_blank');
  }

  // Replace the correct answer text in the question stem (case-insensitive)
  const escapedAnswer = q.correctAnswer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const modifiedText = q.text.replace(new RegExp(escapedAnswer, 'gi'), '___');

  // If the answer didn't appear in the text, append a blank at the end
  const finalText = modifiedText === q.text ? `${q.text} ___` : modifiedText;

  const originalCorrectAnswer = q.correctAnswer;
  const validator = (ans: string): boolean =>
    ans.trim().toLowerCase() === originalCorrectAnswer.trim().toLowerCase();

  return {
    ...q,
    type: 'fill_blank',
    text: finalText,
    options: undefined,
    correctAnswer: q.correctAnswer, // preserved (Requirement 7.3)
    validator,
  };
}

/**
 * General reformat dispatcher.
 * Throws ReformatError for unsupported source-to-target pairs (Requirement 7.5)
 */
export function reformat(q: Question, targetType: QuestionType): Question {
  if (q.type === 'mcq' && targetType === 'true_false') return reformatToTrueFalse(q);
  if (q.type === 'mcq' && targetType === 'fill_blank') return reformatToFillBlank(q);
  throw new ReformatError(q.type, targetType);
}
