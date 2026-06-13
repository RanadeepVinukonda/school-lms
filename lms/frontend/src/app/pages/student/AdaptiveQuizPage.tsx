import { useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/Icon';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { getTextbook, getChaptersForTextbook, getConceptsForChapter } from '@/services/textbookService';
import type { GeneratedQuestion } from '@/types/textbook';

const DIFFICULTY_MAP: Record<string, 'easy' | 'medium' | 'hard'> = {
  beginner: 'easy',
  intermediate: 'medium',
  advanced: 'hard',
};

function estimateSkillLevel(correct: number, total: number): 'beginner' | 'intermediate' | 'advanced' {
  if (total === 0) return 'beginner';
  const rate = correct / total;
  if (rate >= 0.85) return 'advanced';
  if (rate >= 0.6) return 'intermediate';
  return 'beginner';
}

function selectQuestions(
  bank: GeneratedQuestion[],
  skillLevel: 'beginner' | 'intermediate' | 'advanced',
  excludeIds: Set<string>,
  count: number = 5
): GeneratedQuestion[] {
  const targetDifficulty = DIFFICULTY_MAP[skillLevel] as 'easy' | 'medium' | 'hard';
  const pool = bank.filter((q) => q.difficulty === targetDifficulty && !excludeIds.has(q.id));
  if (pool.length >= count) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
  const fillers = bank.filter((q) => !excludeIds.has(q.id) && q.difficulty !== targetDifficulty);
  const combined = [...pool, ...fillers].sort(() => Math.random() - 0.5);
  return combined.slice(0, Math.min(count, combined.length));
}

export default function AdaptiveQuizPage() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const [searchParams] = useSearchParams();
  const textbookId = searchParams.get('textbookId') || '';

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['quiz-concept', textbookId, conceptId],
    queryFn: async () => {
      const fb = await getTextbook(textbookId);
      if (fb) {
        const chapters = await getChaptersForTextbook(fb.id);
        for (const ch of chapters) {
          const concepts = await getConceptsForChapter(fb.id, ch.id);
          const c = concepts.find((co) => co.id === conceptId);
          if (c) return { concept: c, chapter: ch, textbook: fb };
        }
      }
      throw new Error('Concept not found');
    },
    enabled: !!textbookId && !!conceptId,
  });

  const [phase, setPhase] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [currentBatch, setCurrentBatch] = useState<GeneratedQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string | string[]>>(new Map());
  const [results, setResults] = useState<Map<string, boolean>>(new Map());
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [round, setRound] = useState(1);
  const MAX_ROUNDS = 3;

  const bank = useMemo(() => data?.concept.questionBank || [], [data]);

  const answeredCurrent = results.has(currentBatch[currentIndex]?.id);

  const startQuiz = useCallback(() => {
    const batch = selectQuestions(bank, 'beginner', new Set(), 5);
    setCurrentBatch(batch);
    setCurrentIndex(0);
    setAnswers(new Map());
    setResults(new Map());
    setCorrectCount(0);
    setAnsweredIds(new Set());
    setSkillLevel('beginner');
    setRound(1);
    setPhase('quiz');
  }, [bank]);

  const handleAnswer = useCallback((questionId: string, answer: string | string[]) => {
    setAnswers((prev) => new Map(prev).set(questionId, answer));
  }, []);

  const submitAnswer = useCallback(() => {
    const question = currentBatch[currentIndex];
    if (!question) return;
    const userAnswer = answers.get(question.id);
    if (!userAnswer) return;

    const correct = Array.isArray(question.correctAnswer)
      ? question.correctAnswer
      : [question.correctAnswer];

    const userArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
    const isCorrect =
      correct.length === userArr.length &&
      correct.every((c) => userArr.includes(c));

    setResults((prev) => new Map(prev).set(question.id, isCorrect));
    setAnsweredIds((prev) => new Set(prev).add(question.id));
    if (isCorrect) setCorrectCount((prev) => prev + 1);
  }, [currentBatch, currentIndex, answers]);

  const nextQuestion = useCallback(() => {
    if (currentIndex < currentBatch.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      const totalCorrect = correctCount + (results.get(currentBatch[currentIndex]?.id) ? 0 : 0);
      const newSkillLevel = estimateSkillLevel(totalCorrect, answeredIds.size + 1);

      if (round < MAX_ROUNDS) {
        const batch = selectQuestions(bank, newSkillLevel, answeredIds, 5);
        setCurrentBatch(batch);
        setCurrentIndex(0);
        setSkillLevel(newSkillLevel);
        setRound((prev) => prev + 1);
      } else {
        setPhase('result');
      }
    }
  }, [currentIndex, currentBatch, correctCount, answeredIds, round, bank, results]);

  const finalScore = useMemo(() => {
    if (phase !== 'result') return 0;
    let c = 0;
    results.forEach((v) => { if (v) c++; });
    return results.size > 0 ? Math.round((c / results.size) * 100) : 0;
  }, [phase, results]);

  const resultSkillLevel = useMemo(() => {
    if (finalScore >= 80) return 'advanced';
    if (finalScore >= 50) return 'intermediate';
    return 'beginner';
  }, [finalScore]);

  const currentQuestion = currentBatch[currentIndex];

  return (
    <>
      <SEOHead title="Adaptive Quiz" description={data?.concept.title ? `Adaptive quiz for ${data.concept.title}` : 'Adaptive quiz'} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-6xl mx-auto pb-32 space-y-16"
      >
        {phase !== 'intro' && (
          <Link to={`${ROUTES.STUDENT_CONCEPT(conceptId!)}?textbookId=${textbookId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <Icon name="arrow_back" size={16} />
            Back to concept
          </Link>
        )}

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load') : null}
          onRetry={() => refetch()}
          loadingType="detail"
          emptyMessage="Not found"
        >
          {(d) => (
            <>
              {phase === 'intro' && (
                <motion.div variants={cardStackReveal} custom={0}>
                  <div className="text-center py-12 space-y-4">
                    <Icon name="assignment_turned_in" size={64} className="text-primary/60 mx-auto" />
                    <h1 className="text-headline-sm font-bold">Adaptive Quiz</h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      This quiz adapts to your knowledge level. Answer correctly and the questions get harder.
                      Wrong answers? We'll reinforce with easier questions first.
                    </p>
                    <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-sm">
                      <div className="p-3 rounded-xl bg-success/10 border border-success/20">
                        <div className="text-display-xs font-semibold text-success">3</div>
                        <div className="text-muted-foreground text-xs">Rounds</div>
                      </div>
                      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                        <div className="text-display-xs font-semibold text-primary">~15</div>
                        <div className="text-muted-foreground text-xs">Questions</div>
                      </div>
                      <div className="p-3 rounded-xl bg-tertiary/10 border border-tertiary/20">
                        <div className="text-display-xs font-semibold text-tertiary">{bank.length}</div>
                        <div className="text-muted-foreground text-xs">In Bank</div>
                      </div>
                    </div>
                    <div className="pt-4">
                      <Button size="lg" onClick={startQuiz} disabled={bank.length === 0}>
                        <Icon name="play_arrow" size={18} className="mr-2" />
                        Start Quiz
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {phase === 'quiz' && (
                <motion.div variants={cardStackReveal} custom={0}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{d.concept.title}</Badge>
                        <Badge variant="outline" className="capitalize">{skillLevel}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Round {round}/{MAX_ROUNDS}
                      </span>
                    </div>

                    <Progress value={(answeredIds.size / Math.max(1, answeredIds.size + (currentBatch.length - currentIndex - 1))) * 100} className="h-1.5" />

                    {currentQuestion && (
                      <motion.div key={currentQuestion.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                        <Card className="border-border/60">
                          <CardContent className="p-5">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px] capitalize">{currentQuestion.difficulty}</Badge>
                              <Badge variant="outline" className="text-[10px]">{currentQuestion.type.replace('_', ' ')}</Badge>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {currentIndex + 1} of {currentBatch.length}
                              </span>
                            </div>
                            <p className="text-body-md font-medium mt-2 mb-3">{currentQuestion.text}</p>

                            {currentQuestion.options && currentQuestion.options.length > 0 && (
                              <div className="space-y-1.5">
                                {currentQuestion.options.map((opt, oi) => {
                                  const isSelected = answers.get(currentQuestion.id) === opt;
                                  const isCorrectAnswer = answeredCurrent && (Array.isArray(currentQuestion.correctAnswer)
                                    ? currentQuestion.correctAnswer.includes(opt)
                                    : currentQuestion.correctAnswer === opt);
                                  const showResult = answeredCurrent;

                                  let borderClass = 'border-border hover:border-primary/50 hover:bg-muted/50';
                                  if (showResult && isCorrectAnswer) borderClass = 'border-success bg-success/5';
                                  if (showResult && isSelected && !isCorrectAnswer) borderClass = 'border-destructive bg-destructive/5';

                                  return (
                                    <button
                                      key={oi}
                                      onClick={() => {
                                        if (!answeredCurrent) handleAnswer(currentQuestion.id, opt);
                                      }}
                                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-body-md transition-colors text-left ${borderClass} ${answeredCurrent ? 'cursor-default' : 'cursor-pointer'}`}
                                      disabled={answeredCurrent}
                                    >
                                      <div className={`h-6 w-6 rounded-full border flex items-center justify-center text-xs font-medium flex-shrink-0 ${isSelected ? 'bg-primary text-primary-foreground border-primary' : ''}`}>
                                        {String.fromCharCode(65 + oi)}
                                      </div>
                                      <span className="text-body-md">{opt}</span>
                                      {showResult && isCorrectAnswer && (
                                        <Icon name="check_circle" size={16} className="text-success ml-auto" />
                                      )}
                                      {showResult && isSelected && !isCorrectAnswer && (
                                        <Icon name="cancel" size={16} className="text-destructive ml-auto" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {currentQuestion.type === 'true_false' && (
                              <div className="grid grid-cols-2 gap-3">
                                {['True', 'False'].map((opt) => {
                                  const isSelected = answers.get(currentQuestion.id) === opt;
                                  const isCorrectAnswer = answeredCurrent && currentQuestion.correctAnswer === opt;
                                  const showResult = answeredCurrent;

                                  let borderClass = 'border-border hover:border-primary/50';
                                  if (showResult && isCorrectAnswer) borderClass = 'border-success bg-success/5';
                                  if (showResult && isSelected && !isCorrectAnswer) borderClass = 'border-destructive bg-destructive/5';

                                  return (
                                    <button
                                      key={opt}
                                      onClick={() => {
                                        if (!answeredCurrent) handleAnswer(currentQuestion.id, opt);
                                      }}
                                      className={`flex items-center justify-center gap-2 p-4 rounded-xl border text-body-md font-medium transition-colors ${borderClass} ${answeredCurrent ? 'cursor-default' : 'cursor-pointer'}`}
                                      disabled={answeredCurrent}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {answeredCurrent && (
                              <div className={`mt-4 p-4 rounded-xl border ${results.get(currentQuestion.id) ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
                                <p className="text-body-md font-medium flex items-center gap-2">
                                  <Icon name={results.get(currentQuestion.id) ? "check_circle" : "cancel"} size={16} className={results.get(currentQuestion.id) ? "text-success" : "text-destructive"} />
                                  {results.get(currentQuestion.id) ? 'Correct!' : 'Incorrect'}
                                </p>
                                <p className="text-body-md text-muted-foreground mt-1">{currentQuestion.explanation}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    <div className="flex justify-center pt-2">
                      {!answeredCurrent ? (
                        <Button onClick={submitAnswer} disabled={!answers.has(currentQuestion?.id || '')}>
                          <Icon name="check" size={16} className="mr-2" />
                          Submit Answer
                        </Button>
                      ) : (
                        <Button onClick={nextQuestion}>
                          <Icon name={currentIndex < currentBatch.length - 1 || round < MAX_ROUNDS ? "arrow_forward" : "check_circle"} size={16} className="mr-2" />
                          {currentIndex < currentBatch.length - 1 ? 'Next Question' : round < MAX_ROUNDS ? 'Next Round' : 'See Results'}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {phase === 'result' && (
                <motion.div variants={cardStackReveal} custom={0}>
                  <div className="text-center py-8 space-y-6">
                    <div className="relative inline-flex items-center justify-center">
                      <svg className="w-32 h-32" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                        <circle
                          cx="50" cy="50" r="45"
                          fill="none"
                          stroke={finalScore >= 80 ? 'hsl(var(--success))' : finalScore >= 50 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
                          strokeWidth="6"
                          strokeDasharray={`${(finalScore / 100) * 283} 283`}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                          className="transition-all duration-1000"
                        />
                        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="text-2xl font-bold" fill="currentColor">
                          {finalScore}%
                        </text>
                      </svg>
                    </div>

                    <div>
                      <h1 className="text-headline-sm font-bold">
                        {finalScore >= 80 ? 'Mastered!' : finalScore >= 50 ? 'Getting There!' : 'Keep Practicing!'}
                      </h1>
                      <p className="text-muted-foreground mt-1">
                        You answered {Array.from(results.values()).filter(Boolean).length} of {results.size} questions correctly.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-sm">
                      <div className="p-3 rounded-xl bg-success/10 border border-success/20">
                        <div className="text-display-xs font-semibold text-success capitalize">{resultSkillLevel}</div>
                        <div className="text-muted-foreground text-xs">Skill Level</div>
                      </div>
                      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                        <div className="text-display-xs font-semibold text-primary">{round}</div>
                        <div className="text-muted-foreground text-xs">Rounds</div>
                      </div>
                      <div className="p-3 rounded-xl bg-tertiary/10 border border-tertiary/20">
                        <div className="text-display-xs font-semibold text-tertiary">{answers.size}</div>
                        <div className="text-muted-foreground text-xs">Answered</div>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-center pt-4">
                      <Button variant="outline" onClick={startQuiz}>
                        <Icon name="replay" size={16} className="mr-2" />
                        Retry
                      </Button>
                      <Button asChild>
                        <Link to={`${ROUTES.STUDENT_CONCEPT(conceptId!)}?textbookId=${textbookId}`}>
                          <Icon name="menu_book" size={16} className="mr-2" />
                          Back to Study
                        </Link>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
