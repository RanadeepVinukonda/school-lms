/**
 * Profiling Engine (Requirement 12)
 *
 * Calculates Accuracy, Complexity, and determines the student's Adaptive Level
 * after each test submission.
 */

import { getAdminFirestore } from '../firebase/admin';
import { logger } from '../utils/logger';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'hots';
export type AdaptiveLevel = 'beginner' | 'intermediate' | 'advanced';

export interface AnswerRecord {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  difficulty: Difficulty;
  timeSpentMs: number;
}

export interface SubmissionData {
  testId: string;
  studentId: string;
  answers: AnswerRecord[];
  earnedPoints: number;
  totalPoints: number;
  accuracy: number;
  complexity: number;
  level: AdaptiveLevel;
  submittedAt: string;
}

// Difficulty rank as defined in design section 10
const DIFFICULTY_RANK: Record<Difficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  hots: 2,
};

/**
 * Calculates Accuracy as (earnedPoints / totalPoints) × 100.
 * Returns 0 if totalPoints is 0 (Requirement 12.2, 12.3).
 */
export function calculateAccuracy(earnedPoints: number, totalPoints: number): number {
  if (totalPoints === 0) return 0;
  return (earnedPoints / totalPoints) * 100;
}

/**
 * Calculates Complexity as the maximum difficulty rank of correctly answered questions.
 * Returns 0 if no questions were answered correctly (Requirement 12.4).
 */
export function calculateComplexity(answers: AnswerRecord[]): number {
  const correctAnswers = answers.filter((a) => a.isCorrect);
  if (correctAnswers.length === 0) return 0;
  return Math.max(...correctAnswers.map((a) => DIFFICULTY_RANK[a.difficulty]));
}

/**
 * Determines the student's Adaptive Level based on Accuracy and Complexity.
 *
 * Rules (Requirement 12.5–12.7):
 *   accuracy ≥ 85 AND complexity ≥ 2  → "advanced"
 *   accuracy ≥ 70 AND complexity ≥ 1  → "intermediate"
 *   otherwise                          → "beginner"
 */
export function determineLevel(accuracy: number, complexity: number): AdaptiveLevel {
  if (accuracy >= 85 && complexity >= 2) return 'advanced';
  if (accuracy >= 70 && complexity >= 1) return 'intermediate';
  return 'beginner';
}

/**
 * Atomically persists the submission record and updates the student's level.
 * Retries up to maxRetries times on failure (Requirement 12.8, 12.9).
 *
 * Throws on all retries exhausted — the caller should surface this to the client.
 */
export async function persistSubmissionWithLevel(
  submission: Omit<SubmissionData, 'id'>,
  studentUid: string,
  newLevel: AdaptiveLevel,
  maxRetries = 3,
): Promise<string> {
  const db = getAdminFirestore();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      let submissionId: string | undefined;

      await db.runTransaction(async (tx) => {
        const subRef = db.collection('submissions').doc();
        const userRef = db.doc(`users/${studentUid}`);

        submissionId = subRef.id;
        tx.set(subRef, { ...submission, id: subRef.id });
        tx.update(userRef, { level: newLevel, updatedAt: new Date().toISOString() });
      });

      logger.info('Submission persisted with level update', { studentUid, newLevel, attempt });
      return submissionId!;
    } catch (err) {
      if (attempt === maxRetries - 1) {
        logger.error('persistSubmissionWithLevel exhausted retries', { studentUid, attempt, err });
        throw err;
      }
      logger.warn('persistSubmissionWithLevel retry', { studentUid, attempt, err });
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }

  throw new Error('persistSubmissionWithLevel: unexpected exit from retry loop');
}
