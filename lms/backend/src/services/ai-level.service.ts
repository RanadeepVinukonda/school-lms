export type Difficulty = 'easy' | 'medium' | 'hard';
export type StudentLevel = 'beginner' | 'intermediate' | 'advanced';

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/** Compute the student's level after a submission. */
export function computeLevel(
  accuracy: number,
  avgReactionTimeSec: number,
  complexityHandled: number,
): StudentLevel {
  let level: StudentLevel;
  if (accuracy >= 0.85 && complexityHandled >= 2) level = 'advanced';
  else if (accuracy >= 0.70 && complexityHandled >= 1) level = 'intermediate';
  else level = 'beginner';

  if (level !== 'beginner' && avgReactionTimeSec > 120) {
    level = level === 'advanced' ? 'intermediate' : 'beginner';
  }
  if (level === 'beginner' && accuracy >= 0.85 && avgReactionTimeSec < 30) {
    level = 'intermediate';
  }

  return level;
}

/** Select questions appropriate for the student's level. */
export function filterQuestionsByLevel<T extends { difficulty?: Difficulty }>(
  questions: T[],
  level: StudentLevel,
  count: number,
): T[] {
  const rank = level === 'beginner' ? 0 : level === 'intermediate' ? 1 : 2;
  const filtered = questions.filter((q) => {
    const qRank = q.difficulty ? DIFFICULTY_RANK[q.difficulty] : 0;
    if (level === 'advanced') return qRank >= 1;
    if (level === 'intermediate') return qRank >= 0;
    return qRank <= 0;
  });

  // Shuffle
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** Compute the highest difficulty the student answered correctly. */
export function computeComplexityHandled(
  answers: { questionId: string; correct: boolean }[],
  questionDifficultyMap: Record<string, Difficulty>,
): number {
  let maxRank = -1;
  for (const a of answers) {
    if (a.correct) {
      const diff = questionDifficultyMap[a.questionId] || 'easy';
      const rank = DIFFICULTY_RANK[diff];
      if (rank > maxRank) maxRank = rank;
    }
  }
  return Math.max(0, maxRank);
}
