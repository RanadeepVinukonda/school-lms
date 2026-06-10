import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Clock, AlertCircle, CheckCircle, XCircle, Loader2,
  ChevronLeft, ChevronRight, Send, Play, ArrowLeft,
  AlertTriangle, Trophy, Brain, Layers,
  BarChart3, Timer
} from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { pageTransition } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { QuestionRendererV2 } from '@/app/components/assessment/QuestionRendererV2';

type AssessmentType = 'quiz' | 'exam';
type QuestionModel = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'matching';

interface V2Question {
  id: string;
  type: QuestionModel;
  text: string;
  points: number;
  options?: string[];
  order: number;
}

interface AssessmentInfo {
  id: string;
  title: string;
  description: string;
  timeLimitMinutes: number;
  questionModels: QuestionModel[];
  totalPoints: number;
  questionsCount: number;
  showResults: boolean;
  passingScore: number;
}

interface V2AttemptStarted {
  id: string;
  startedAt: string;
  totalPoints: number;
  questions: V2Question[];
  timeLimitMinutes?: number;
}

interface V2AnswerPayload {
  questionId: string;
  answer: string;
  timeSpent: number;
}

interface V2AnswerResult {
  questionId: string;
  answer: string;
  isCorrect?: boolean;
  pointsEarned?: number;
  correctAnswer?: string;
}

interface V2SubmitResult {
  id: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
  status: string;
  level: string;
  answers: V2AnswerResult[];
  showResults: boolean;
}

const MODEL_LABELS: Record<QuestionModel, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  short_answer: 'Short Answer',
  fill_blank: 'Fill in the Blank',
  matching: 'Matching',
};

const MODEL_DESCRIPTIONS: Record<QuestionModel, string> = {
  multiple_choice: 'Choose the best answer from given options',
  true_false: 'Determine if the statement is true or false',
  short_answer: 'Type a brief written response',
  fill_blank: 'Complete the missing information',
  matching: 'Match items from two columns',
};

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function SkeletonLoader() {
  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}

function ErrorDisplay({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="font-semibold text-lg">Something went wrong</p>
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex gap-3 mt-2">
            {onRetry && <Button variant="outline" onClick={onRetry}>Try Again</Button>}
            <Button variant="ghost" onClick={() => window.history.back()}>Go Back</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudentQuizTakePageV2() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);

  const assessmentType = (searchParams.get('type') || 'quiz') as AssessmentType;

  const [phase, setPhase] = useState<'select-models' | 'quiz' | 'result'>('select-models');
  const [selectedModels, setSelectedModels] = useState<QuestionModel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [attempt, setAttempt] = useState<V2AttemptStarted | null>(null);
  const [result, setResult] = useState<V2SubmitResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questionStartTimeRef = useRef<number>(Date.now());
  const questionTimeMapRef = useRef<Record<string, number>>({});
  const autoSubmitRef = useRef<() => void>();
  const phaseRef = useRef(phase);

  phaseRef.current = phase;

  const basePath = assessmentType === 'exam' ? `/api/exams-v2` : `/api/quizzes-v2`;

  const {
    data: assessmentInfo,
    isLoading: infoLoading,
    isError: infoError,
    error: infoErrorObj,
    refetch: refetchInfo,
  } = useQuery({
    queryKey: [assessmentType, assessmentId],
    queryFn: async () => {
      const res = await api.get(`${basePath}/${assessmentId}`);
      return res.data.data as AssessmentInfo;
    },
    enabled: !!assessmentId,
  });

  const startMutation = useMutation({
    mutationFn: async (models: QuestionModel[]) => {
      const res = await api.post(`${basePath}/${assessmentId}/start`, { selectedModels: models });
      return res.data.data as V2AttemptStarted;
    },
    onSuccess: (data) => {
      setAttempt(data);
      const limit = data.timeLimitMinutes ?? assessmentInfo?.timeLimitMinutes ?? 30;
      setTimeLeft(limit * 60);
      questionStartTimeRef.current = Date.now();
      questionTimeMapRef.current = {};
      setPhase('quiz');
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || 'Failed to start assessment');
    },
  });

  autoSubmitRef.current = () => {
    if (phaseRef.current !== 'quiz') return;
    toast.error('Time is up! Auto-submitting...');
    handleSubmitAttempt();
  };

  useEffect(() => {
    if (phase !== 'quiz' || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => autoSubmitRef.current?.(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const trackTimeOnQuestion = useCallback((qId: string) => {
    const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    if (elapsed > 0) {
      questionTimeMapRef.current[qId] = (questionTimeMapRef.current[qId] || 0) + elapsed;
    }
    questionStartTimeRef.current = Date.now();
  }, []);

  const goToQuestion = useCallback(
    (index: number) => {
      if (!attempt) return;
      if (index >= 0 && index < attempt.questions.length) {
        const currentQ = attempt.questions[currentIndex];
        if (currentQ) trackTimeOnQuestion(currentQ.id);
        setCurrentIndex(index);
      }
    },
    [attempt, currentIndex, trackTimeOnQuestion],
  );

  const handleAnswerChange = useCallback((value: string) => {
    if (!attempt) return;
    const q = attempt.questions[currentIndex];
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }, [attempt, currentIndex]);

  const handleSubmitAttempt = useCallback(async () => {
    if (!attempt || !userId || isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirm(false);

    const currentQ = attempt.questions[currentIndex];
    if (currentQ) trackTimeOnQuestion(currentQ.id);

    const answersPayload: V2AnswerPayload[] = attempt.questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] || '',
      timeSpent: questionTimeMapRef.current[q.id] || 0,
    }));

    try {
      const res = await api.post(`${basePath}/attempts/${attempt.id}/submit`, {
        answers: answersPayload,
        startedAt: attempt.startedAt,
        submittedAt: new Date().toISOString(),
      });
      const submitResult = res.data.data as V2SubmitResult;
      setResult(submitResult);
      setPhase('result');
      toast.success('Assessment submitted successfully!');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  }, [attempt, userId, isSubmitting, currentIndex, answers, basePath, trackTimeOnQuestion]);

  const handleStart = useCallback(() => {
    if (selectedModels.length === 0) {
      toast.error('Please select at least one question type');
      return;
    }
    startMutation.mutate(selectedModels);
  }, [selectedModels, startMutation]);

  const toggleModel = useCallback((model: QuestionModel) => {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model],
    );
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (infoLoading) return <SkeletonLoader />;

  if (infoError || !assessmentInfo) {
    const errorMessage =
      (infoErrorObj as { message?: string })?.message ||
      `${assessmentType === 'exam' ? 'Exam' : 'Quiz'} not found`;
    return <ErrorDisplay message={errorMessage} onRetry={() => refetchInfo()} />;
  }

  const questionModels = assessmentInfo.questionModels || [];

  if (questionModels.length === 0 && phase === 'select-models') {
    return (
      <>
        <SEOHead title={assessmentInfo.title} description={assessmentInfo.description} />
        <motion.div
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          className="p-4 max-w-lg mx-auto"
        >
          <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-lg">No question types available</p>
              <p className="text-sm text-muted-foreground">
                This {assessmentType} has no question types configured yet.
              </p>
              <Button variant="outline" onClick={handleBack}>Go Back</Button>
            </CardContent>
          </Card>
        </motion.div>
      </>
    );
  }

  if (phase === 'select-models') {
    return (
      <>
        <SEOHead
          title={assessmentInfo.title}
          description={`${assessmentType === 'exam' ? 'Exam' : 'Quiz'}: ${assessmentInfo.title}`}
        />
        <motion.div
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          className="p-4 max-w-2xl mx-auto space-y-6"
        >
          <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>

          <div className="text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Layers className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{assessmentInfo.title}</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              {assessmentInfo.description}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto text-sm">
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{assessmentInfo.questionsCount || '--'}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{assessmentInfo.timeLimitMinutes}m</p>
              <p className="text-xs text-muted-foreground">Time Limit</p>
            </div>
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{assessmentInfo.totalPoints || '--'}</p>
              <p className="text-xs text-muted-foreground">Points</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Choose Question Types
              </CardTitle>
              <CardDescription>
                Select which types of questions you want to include in this{' '}
                {assessmentType}. You must select at least one.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {questionModels.map((model) => (
                <div
                  key={model}
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer',
                    selectedModels.includes(model)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30 hover:bg-accent/50',
                  )}
                  onClick={() => toggleModel(model)}
                >
                  <Checkbox
                    checked={selectedModels.includes(model)}
                    onCheckedChange={() => toggleModel(model)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <Label className="text-base font-medium cursor-pointer">
                      {MODEL_LABELS[model] || model.replace(/_/g, ' ')}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {MODEL_DESCRIPTIONS[model] || ''}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="bg-muted rounded-xl p-4 text-sm space-y-2">
            <div className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Before you start</span>
            </div>
            <p className="text-muted-foreground">
              You will have {assessmentInfo.timeLimitMinutes} minutes to complete the{' '}
              {assessmentType}. Your answers are auto-submitted when time expires.
            </p>
            <p className="text-muted-foreground">
              Passing score: {assessmentInfo.passingScore}%
            </p>
          </div>

          <Button
            size="lg"
            className="w-full text-base"
            onClick={handleStart}
            disabled={startMutation.isPending || selectedModels.length === 0}
          >
            {startMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Start {assessmentType === 'exam' ? 'Exam' : 'Quiz'}
              </>
            )}
          </Button>
        </motion.div>
      </>
    );
  }

  const attemptData = attempt;
  if ((phase === 'quiz' || phase === 'result') && !attemptData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="font-semibold text-lg">Attempt not found</p>
            <p className="text-sm text-muted-foreground">
              The assessment attempt could not be loaded. Please try starting again.
            </p>
            <Button variant="outline" onClick={handleBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'result' && result) {
    const isPassed = result.passed;
    const levelLabel = result.level || 'N/A';
    const correctCount = result.answers.filter((a) => a.isCorrect).length;
    const totalQuestions = result.answers.length;

    return (
      <>
        <SEOHead
          title={`${assessmentInfo.title} - Results`}
          description={`${assessmentType === 'exam' ? 'Exam' : 'Quiz'} results`}
        />
        <motion.div
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          className="max-w-2xl mx-auto p-4 space-y-6"
        >
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div
                className={cn(
                  'h-20 w-20 rounded-full mx-auto flex items-center justify-center',
                  isPassed ? 'bg-emerald-500/10' : 'bg-destructive/10',
                )}
              >
                {isPassed ? (
                  <CheckCircle className="h-10 w-10 text-emerald-500" />
                ) : (
                  <XCircle className="h-10 w-10 text-destructive" />
                )}
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {isPassed ? 'Congratulations!' : 'Keep Practicing'}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  {assessmentInfo.title}
                </CardDescription>
              </div>

              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="text-center">
                  <p className="text-4xl font-bold">
                    {result.score}/{result.totalPoints}
                  </p>
                  <p className="text-sm text-muted-foreground">Final Score</p>
                </div>
                <Separator orientation="vertical" className="h-12 hidden sm:block" />
                <div className="text-center">
                  <p
                    className={cn(
                      'text-4xl font-bold',
                      isPassed ? 'text-emerald-500' : 'text-destructive',
                    )}
                  >
                    {Math.round(result.percentage)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Percentage</p>
                </div>
                <Separator orientation="vertical" className="h-12 hidden sm:block" />
                <div className="text-center">
                  <Badge
                    variant={isPassed ? 'success' : 'destructive'}
                    className="text-sm px-4 py-1"
                  >
                    {isPassed ? 'PASSED' : 'FAILED'}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">Status</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <h3 className="font-semibold">AI Level</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm capitalize">
                    {levelLabel}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    proficiency level
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Time Spent</h3>
                </div>
                <p className="text-2xl font-bold">{fmt(result.timeSpent)}</p>
                <p className="text-xs text-muted-foreground">
                  out of {assessmentInfo.timeLimitMinutes} minutes
                </p>
              </CardContent>
            </Card>
          </div>

          {result.showResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Question Review
                </CardTitle>
                <CardDescription>
                  {correctCount} of {totalQuestions} correct
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.answers.map((ans, i) => {
                  const correct = ans.isCorrect;
                  return (
                    <div
                      key={ans.questionId}
                      className={cn(
                        'p-4 rounded-xl border text-sm space-y-2',
                        correct
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-destructive/5 border-destructive/20',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 font-medium">
                          {correct ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                          )}
                          <span>
                            Q{i + 1}.{' '}
                            {attemptData?.questions.find((q) => q.id === ans.questionId)
                              ?.text || ''}
                          </span>
                        </div>
                        {ans.pointsEarned !== undefined && (
                          <Badge variant="outline" className="flex-shrink-0">
                            +{ans.pointsEarned}
                          </Badge>
                        )}
                      </div>
                      <div className="pl-6 space-y-1">
                        <p className="text-muted-foreground">
                          Your answer:{' '}
                          <span
                            className={cn(
                              'font-medium',
                              correct ? 'text-emerald-500' : 'text-destructive',
                            )}
                          >
                            {ans.answer || 'Not answered'}
                          </span>
                        </p>
                        {!correct && ans.correctAnswer && (
                          <p className="text-emerald-500 font-medium">
                            Correct answer: {ans.correctAnswer}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Button className="w-full" size="lg" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {assessmentType === 'exam' ? 'Exams' : 'Quizzes'}
          </Button>
        </motion.div>
      </>
    );
  }

  const questions = attemptData?.questions || [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const warn = timeLeft > 0 && timeLeft <= 300;

  if (totalQuestions === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-lg">No questions available</p>
            <p className="text-sm text-muted-foreground">
              This {assessmentType} has no questions for the selected types.
            </p>
            <Button variant="outline" onClick={handleBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="font-medium text-lg">Question not found</p>
            <p className="text-sm text-muted-foreground">
              The requested question could not be loaded.
            </p>
            <Button variant="outline" onClick={handleBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${assessmentInfo.title} - In Progress`}
        description={`${assessmentType === 'exam' ? 'Exam' : 'Quiz'} in progress`}
      />
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        <div
          className={cn(
            'px-4 py-3 flex items-center justify-between border-b transition-colors',
            warn ? 'bg-destructive/10 text-destructive' : 'bg-card',
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex items-center gap-2 font-mono text-xl font-bold',
                warn && 'animate-pulse',
              )}
            >
              <Clock className="h-5 w-5" />
              {fmt(timeLeft)}
            </div>
            {warn && (
              <Badge variant="destructive" className="animate-pulse text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Time running out
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToQuestion(i)}
                  className={cn(
                    'h-7 w-7 rounded-full text-[10px] font-medium transition-all flex items-center justify-center',
                    currentIndex === i
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 scale-110'
                      : answers[questions[i].id]
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground hover:bg-accent',
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <span className="text-sm font-medium whitespace-nowrap">
              <span className="text-base">{currentIndex + 1}</span>/{totalQuestions}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-4 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      Question {currentIndex + 1} of {totalQuestions}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {MODEL_LABELS[currentQuestion.type] || currentQuestion.type.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm text-muted-foreground font-medium">
                        {currentQuestion.points} pts
                      </span>
                    </div>
                  </div>

                  <Progress value={progress} className="h-1.5" />

                  <p className="text-xl md:text-2xl font-semibold leading-relaxed">
                    {currentQuestion.text}
                  </p>

                  <QuestionRendererV2
                    question={currentQuestion}
                    answer={answers[currentQuestion.id] || ''}
                    onAnswerChange={handleAnswerChange}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="border-t bg-card px-4 py-3">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => goToQuestion(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="text-xs text-muted-foreground hidden sm:block">
                {answeredCount} of {totalQuestions} answered
              </div>

              {currentIndex < totalQuestions - 1 ? (
                <Button
                  onClick={() => goToQuestion(currentIndex + 1)}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setShowConfirm(true)}
                  className="gap-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  Submit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Submit {assessmentType === 'exam' ? 'Exam' : 'Quiz'}</CardTitle>
                <CardDescription>
                  You answered {answeredCount} of {totalQuestions} questions.
                  {answeredCount < totalQuestions &&
                    ` ${totalQuestions - answeredCount} unanswered.`}
                  This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirm(false)}
                >
                  Review
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmitAttempt}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  Submit
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </>
  );
}
