import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Clock, AlertCircle, CheckCircle, XCircle, Loader2,
  ChevronLeft, ChevronRight, Send, Play, ArrowLeft,
  AlertTriangle, Trophy, Brain, Layers,
  BarChart3, Timer, Bookmark, HelpCircle
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
import { Input } from '@/components/ui/input';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { QuestionRendererV2, type V2Question, type QuestionModel } from '@/app/components/assessment/QuestionRendererV2';

type AssessmentType = 'quiz' | 'exam';

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
  isRepublished?: boolean;
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

const MODEL_LABELS: Record<string, string> = {
  multiple_choice: 'Multiple Choice',
  mcq: 'Multiple Choice',
  true_false: 'True / False',
  short_answer: 'Short Answer',
  fill_blank: 'Fill in the Blank',
  matching: 'Matching',
  numerical: 'Numerical',
  descriptive: 'Descriptive',
  passage: 'Passage Comprehension'
};

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function playSynthesizedSound(type: 'correct' | 'incorrect') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'correct') {
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110.00, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.warn('Web Audio API not supported or blocked:', e);
  }
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
  const [isFullscreen, setIsFullscreen] = useState(true);

  const [questionStatuses, setQuestionStatuses] = useState<Record<string, 'unvisited' | 'visited' | 'attempted' | 'review'>>({});
  
  const [wrongOptions, setWrongOptions] = useState<Record<string, string[]>>({});
  const [interactiveCorrect, setInteractiveCorrect] = useState<Record<string, boolean>>({});
  const [interactiveError, setInteractiveError] = useState<Record<string, boolean>>({});
  const [customTextInput, setCustomTextInput] = useState('');

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

      const initialStatuses: Record<string, 'unvisited' | 'visited' | 'attempted' | 'review'> = {};
      data.questions.forEach((q, idx) => {
        initialStatuses[q.id] = idx === 0 ? 'visited' : 'unvisited';
      });
      setQuestionStatuses(initialStatuses);
      
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
  }, [phase, timeLeft]);

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
      if (index >= 0 && index < (attempt.questions?.length ?? 0)) {
        const currentQ = attempt.questions[currentIndex];
        if (currentQ) trackTimeOnQuestion(currentQ.id);
        
        const nextQ = attempt.questions[index];
        setQuestionStatuses((prev) => {
          const currentStatus = prev[nextQ.id] || 'unvisited';
          if (currentStatus === 'unvisited') {
            return { ...prev, [nextQ.id]: 'visited' };
          }
          return prev;
        });

        if (assessmentInfo?.isRepublished) {
          setCustomTextInput(answers[nextQ.id] || '');
        }

        setCurrentIndex(index);
      }
    },
    [attempt, currentIndex, trackTimeOnQuestion, answers, assessmentInfo]
  );

  const handleAnswerChange = useCallback((value: string) => {
    if (!attempt) return;
    const q = attempt.questions[currentIndex];
    if (!q) return;

    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    setQuestionStatuses((prev) => {
      const current = prev[q.id];
      if (current !== 'review') {
        return { ...prev, [q.id]: value ? 'attempted' : 'visited' };
      }
      return prev;
    });
  }, [attempt, currentIndex]);

  const toggleMarkForReview = useCallback(() => {
    if (!attempt) return;
    const q = attempt.questions[currentIndex];
    if (!q) return;

    setQuestionStatuses((prev) => {
      const current = prev[q.id];
      if (current === 'review') {
        return { ...prev, [q.id]: answers[q.id] ? 'attempted' : 'visited' };
      } else {
        return { ...prev, [q.id]: 'review' };
      }
    });
  }, [attempt, currentIndex, answers]);

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
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  }, [attempt, userId, isSubmitting, currentIndex, answers, basePath, trackTimeOnQuestion]);

  const handleInteractiveSelect = (optionValue: string) => {
    if (!attempt || !assessmentInfo?.isRepublished) return;
    const q = attempt.questions[currentIndex];
    if (!q) return;

    if (interactiveCorrect[q.id]) return;

    const isCorrect = optionValue.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase();
    
    if (isCorrect) {
      playSynthesizedSound('correct');
      setInteractiveCorrect((prev) => ({ ...prev, [q.id]: true }));
      setInteractiveError((prev) => ({ ...prev, [q.id]: false }));
      handleAnswerChange(optionValue);

      setTimeout(() => {
        if (currentIndex < (attempt.questions?.length ?? 0) - 1) {
          goToQuestion(currentIndex + 1);
        } else {
          setShowConfirm(true);
        }
      }, 1200);
    } else {
      playSynthesizedSound('incorrect');
      setInteractiveError((prev) => ({ ...prev, [q.id]: true }));
      setWrongOptions((prev) => ({
        ...prev,
        [q.id]: [...(prev[q.id] || []), optionValue]
      }));
      toast.error('Incorrect. Try again!');
    }
  };

  const handleInteractiveTextVerify = () => {
    if (!attempt || !assessmentInfo?.isRepublished) return;
    const q = attempt.questions[currentIndex];
    if (!q) return;

    if (interactiveCorrect[q.id]) return;

    const formattedInput = customTextInput.trim().toLowerCase();
    const formattedCorrect = (q.correctAnswer || '').trim().toLowerCase();

    const isCorrect = q.type === 'descriptive' 
      ? formattedInput.length > 5 
      : formattedInput === formattedCorrect;

    if (isCorrect) {
      playSynthesizedSound('correct');
      setInteractiveCorrect((prev) => ({ ...prev, [q.id]: true }));
      setInteractiveError((prev) => ({ ...prev, [q.id]: false }));
      handleAnswerChange(customTextInput);

      setTimeout(() => {
        if (currentIndex < (attempt.questions?.length ?? 0) - 1) {
          goToQuestion(currentIndex + 1);
        } else {
          setShowConfirm(true);
        }
      }, 1200);
    } else {
      playSynthesizedSound('incorrect');
      setInteractiveError((prev) => ({ ...prev, [q.id]: true }));
      toast.error('Incorrect. Please check and try again!');
    }
  };

  const logProctoring = useCallback(async (event: string) => {
    if (!attempt) return;
    try {
      const payload = {
        event,
        timestamp: new Date().toISOString(),
      };
      const url = `${api.defaults.baseURL || ''}${basePath}/attempts/${attempt.id}/logs`;
      const token = useAuthStore.getState().token;
      
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((err) => console.error('Proctoring log fetch failed:', err));
    } catch (err) {
      console.error('Failed to log proctoring event:', err);
    }
  }, [attempt, basePath]);

  useEffect(() => {
    if (phase !== 'quiz' || assessmentType !== 'exam' || !attempt) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logProctoring('tab_focus_lost');
      } else {
        logProctoring('tab_focus_gained');
      }
    };

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) {
        logProctoring('fullscreen_exit');
        toast.warning('Warning: Exited fullscreen mode! This violation has been logged.', {
          duration: 5000,
        });
      } else {
        logProctoring('fullscreen_enter');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [phase, assessmentType, attempt, logProctoring]);

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen().catch((err) => {
      console.warn('Could not enter fullscreen:', err);
    });
  };

  const handleStart = useCallback(() => {
    if (selectedModels.length === 0) {
      toast.error('Please select at least one question type');
      return;
    }
    if (assessmentType === 'exam') {
      requestFullscreen();
    }
    startMutation.mutate(selectedModels);
  }, [selectedModels, startMutation, assessmentType]);

  const toggleModel = useCallback((model: QuestionModel) => {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (infoLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (infoError || !assessmentInfo) {
    const errorMessage = (infoErrorObj as { message?: string })?.message || `${assessmentType === 'exam' ? 'Exam' : 'Quiz'} not found`;
    return (
      <div className="p-6 max-w-lg mx-auto mt-12">
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="font-semibold text-headline-sm">{errorMessage}</p>
            <Button onClick={() => refetchInfo()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questionModels = assessmentInfo.questionModels || [];

  if (questionModels.length === 0 && phase === 'select-models') {
    return (
      <div className="p-6 max-w-lg mx-auto mt-12">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <AlertCircle className="h-12 w-12 text-on-surface-variant/40" />
            <p className="font-semibold text-headline-sm">No question types configured</p>
            <Button variant="outline" onClick={handleBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'select-models') {
    return (
      <>
        <SEOHead title={assessmentInfo.title} description={`${assessmentType}: ${assessmentInfo.title}`} />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="p-6 max-w-6xl mx-auto pb-32 space-y-16"
        >
          <motion.div variants={cardStackReveal} custom={0} className="max-w-2xl mx-auto space-y-6">
            <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" />Back
            </Button>

            <div className="text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-headline-sm font-bold flex items-center justify-center gap-2">
                {assessmentInfo.title}
                {assessmentInfo.isRepublished && (
                  <Badge variant="success" className="text-[10px] tracking-wider font-bold">
                    INTERACTIVE PRACTICE
                  </Badge>
                )}
              </h1>
              <p className="text-body-md text-muted-foreground max-w-md mx-auto">
                {assessmentInfo.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-body-md">
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-display-xs font-bold">{assessmentInfo.questionsCount || '--'}</p>
                <p className="text-label-xs text-muted-foreground">Questions</p>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-display-xs font-bold">{assessmentInfo.timeLimitMinutes}m</p>
                <p className="text-label-xs text-muted-foreground">Time Limit</p>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-display-xs font-bold">{assessmentInfo.totalPoints || '--'}</p>
                <p className="text-label-xs text-muted-foreground">Points</p>
              </div>
            </div>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-title-md flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Select Formats to Include
                </CardTitle>
                <CardDescription>
                  Check the formats you wish to practice or test on.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 grid grid-cols-1 gap-3">
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
                      <Label className="text-body-lg font-semibold cursor-pointer">
                        {MODEL_LABELS[model] || model.toUpperCase()}
                      </Label>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {assessmentInfo.isRepublished && (
              <div className="bg-success-container/10 border border-success/30 rounded-xl p-4 text-body-md space-y-2">
                <div className="flex items-center gap-2 font-bold text-success">
                  <Brain className="h-[18px] w-[18px]" />
                  <span>Interactive Practice Mode Active</span>
                </div>
                <p className="text-on-surface-variant">
                  This test has been republished as interactive homework. Selecting correct options triggers immediate visual ticks and chime audio, automatically advancing you to the next question. Wrong selections trigger audio buzzers and red crosses, prompting you to try again.
                </p>
              </div>
            )}

            <Button
              size="lg"
              className="w-full text-body-lg"
              onClick={handleStart}
              disabled={startMutation.isPending || selectedModels.length === 0}
            >
              {startMutation.isPending ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Starting...</>
              ) : (
                <><Play className="h-5 w-5 mr-2" />Start {assessmentInfo.isRepublished ? 'Interactive Session' : 'Exam'}</>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </>
    );
  }

  const attemptData = attempt;
  if ((phase === 'quiz' || phase === 'result') && !attemptData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="w-full max-w-sm border-border/60">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="font-semibold text-headline-sm">Attempt not found</p>
            <Button variant="outline" onClick={handleBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'result' && result) {
    const isPassed = result.passed;
    const levelLabel = result.level || 'beginner';
    const safeAnswers = result.answers ?? [];
    const correctCount = safeAnswers.filter((a) => a.isCorrect).length;
    const totalQuestions = safeAnswers.length;

    return (
      <>
        <SEOHead title={`${assessmentInfo.title} - Results`} description="Test results" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="p-6 max-w-6xl mx-auto pb-32 space-y-16"
        >
          <motion.div variants={cardStackReveal} custom={0} className="max-w-2xl mx-auto space-y-6">
            <Card className="border-border/60">
              <CardContent className="p-6 text-center space-y-4">
                <div
                  className={cn(
                    'h-12 w-12 rounded-xl mx-auto flex items-center justify-center',
                    isPassed ? 'bg-emerald-500/10' : 'bg-destructive/10',
                  )}
                >
                  {isPassed ? (
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-destructive" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-headline-sm">
                    {isPassed ? 'Passed!' : 'Keep Practicing'}
                  </CardTitle>
                  <CardDescription className="text-body-lg mt-1">
                    {assessmentInfo.title}
                  </CardDescription>
                </div>

                <div className="flex items-center justify-center gap-6 flex-wrap">
                  <div className="text-center">
                    <p className="text-display-xs font-bold">
                      {result.score}/{result.totalPoints}
                    </p>
                    <p className="text-label-xs text-muted-foreground uppercase tracking-wider mt-1">Final Score</p>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div className="text-center">
                    <p className={cn('text-display-xs font-bold', isPassed ? 'text-emerald-500' : 'text-destructive')}>
                      {Math.round(result.percentage)}%
                    </p>
                    <p className="text-label-xs text-muted-foreground uppercase tracking-wider mt-1">Percentage</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-border/60">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold text-title-sm">AI Calculated Level</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-body-md capitalize font-bold">
                      {levelLabel}
                    </Badge>
                  </div>
                  <p className="text-label-xs text-on-surface-variant leading-relaxed">
                    Based on accuracy, average question response times, and maximum complexity solved.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-title-sm">Time Spent</h3>
                  </div>
                  <p className="text-display-xs font-bold font-mono">{fmt(result.timeSpent)}</p>
                  <p className="text-label-xs text-muted-foreground">
                    out of {assessmentInfo.timeLimitMinutes} minutes
                  </p>
                </CardContent>
              </Card>
            </div>

            <Button className="w-full" size="lg" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </motion.div>
        </motion.div>
      </>
    );
  }

  const questions = attemptData?.questions || [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const warn = timeLeft > 0 && timeLeft <= 180;

  const currentStatus = questionStatuses[currentQuestion.id] || 'unvisited';

  const getStatusColor = (status: 'unvisited' | 'visited' | 'attempted' | 'review', isCurrent: boolean) => {
    if (isCurrent) return 'ring-2 ring-primary scale-110 font-bold bg-primary text-primary-foreground';
    switch (status) {
      case 'attempted': return 'bg-success text-success-foreground font-semibold';
      case 'review': return 'bg-info text-info-foreground font-semibold';
      case 'visited': return 'bg-warning text-warning-foreground font-semibold';
      default: return 'bg-muted text-muted-foreground opacity-60';
    }
  };

  return (
    <>
      <SEOHead title={`${assessmentInfo.title} - Testing`} description="Exam Take page" />
      <div className="fixed inset-0 bg-background z-50 flex flex-col md:flex-row overflow-hidden">
        
        {/* MAIN EXAM WORKSPACE */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header Bar */}
          <div className={cn(
            'px-6 py-4 flex items-center justify-between border-b shrink-0 transition-colors',
            warn ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-card border-outline-variant'
          )}>
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex items-center gap-2 font-mono text-title-md font-black tracking-tight',
                warn && 'animate-pulse text-error'
              )}>
                <Clock className="h-5 w-5" />
                {fmt(timeLeft)}
              </div>
              {assessmentInfo.isRepublished && (
                <Badge variant="success" className="text-[10px] tracking-wider uppercase font-extrabold animate-pulse">
                  Interactive Mode
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-body-md font-medium">
                Question <span className="text-title-sm font-bold">{currentIndex + 1}</span> of {totalQuestions}
              </span>
              <Progress value={progress} className="w-24 h-2" />
            </div>
          </div>

          {/* Question Display Workspace */}
          <div className="flex-1 p-6 md:p-12 max-w-3xl mx-auto w-full flex flex-col justify-start space-y-6">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-label-xs px-2.5 py-0.5 capitalize">
                {MODEL_LABELS[currentQuestion.type] || currentQuestion.type.toUpperCase()}
              </Badge>
              <span className="text-body-md text-on-surface-variant font-medium">
                {currentQuestion.points} pts
              </span>
            </div>

            {currentQuestion.type === 'passage' && currentQuestion.passageText && (
              <div className="bg-surface-variant/30 border border-outline-variant p-4 rounded-xl max-h-48 overflow-y-auto text-body-md leading-relaxed mb-2 font-serif italic text-on-surface-variant">
                {currentQuestion.passageText}
              </div>
            )}

            <h2 className="text-headline-sm font-bold leading-relaxed text-on-surface">
              {currentQuestion.text}
            </h2>

            {assessmentInfo.isRepublished ? (
              <div className="py-4 space-y-4">
                {(currentQuestion.type === 'mcq' || currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false' || currentQuestion.type === 'passage') && currentQuestion.options ? (
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((option, idx) => {
                      const isWrong = wrongOptions[currentQuestion.id]?.includes(option);
                      const isCorrectAnswer = option.trim().toLowerCase() === currentQuestion.correctAnswer?.trim().toLowerCase();
                      const isSelected = answers[currentQuestion.id] === option;
                      const hasResponded = interactiveCorrect[currentQuestion.id];

                      return (
                        <button
                          key={idx}
                          disabled={hasResponded || isWrong}
                          onClick={() => handleInteractiveSelect(option)}
                          className={cn(
                            'flex items-center gap-3 p-4 rounded-xl border-2 text-left font-medium transition-all text-body-lg',
                            hasResponded && isCorrectAnswer
                              ? 'border-success bg-success/10 text-success'
                              : isWrong
                                ? 'border-error/30 bg-error/5 text-error/40 line-through cursor-not-allowed'
                                : isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-outline hover:border-primary/50 hover:bg-surface-variant/40'
                          )}
                        >
                          <div className={cn(
                            'h-6 w-6 rounded-full flex items-center justify-center border font-bold text-label-xs shrink-0',
                            hasResponded && isCorrectAnswer
                              ? 'bg-success text-success-foreground border-success'
                              : isWrong
                                ? 'bg-error text-error-foreground border-error'
                                : 'border-outline-variant'
                          )}>
                            {hasResponded && isCorrectAnswer ? '✓' : isWrong ? '✗' : String.fromCharCode(65 + idx)}
                          </div>
                          <span>{option}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {interactiveCorrect[currentQuestion.id] ? (
                      <div className="p-4 rounded-xl border-2 border-success bg-success/10 text-success font-semibold text-center flex items-center justify-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Correct! Answered: {answers[currentQuestion.id]}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Label className="text-body-md">Type your answer:</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder={currentQuestion.type === 'numerical' ? 'Enter numeric value' : 'Type here...'}
                            value={customTextInput}
                            onChange={(e) => setCustomTextInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleInteractiveTextVerify(); }}
                          />
                          <Button onClick={handleInteractiveTextVerify}>
                            Verify
                          </Button>
                        </div>
                        {interactiveError[currentQuestion.id] && (
                          <p className="text-label-xs text-error font-medium flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Incorrect answer. Please verify and try again!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <QuestionRendererV2
                question={currentQuestion}
                answer={answers[currentQuestion.id] || ''}
                onAnswerChange={handleAnswerChange}
              />
            )}
          </div>

          {/* Footer Controls */}
          <div className="border-t border-outline-variant bg-card px-6 py-4 shrink-0">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={() => goToQuestion(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {!assessmentInfo.isRepublished && (
                <Button
                  variant={currentStatus === 'review' ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleMarkForReview}
                  className="gap-1.5 hidden sm:flex"
                >
                  <Bookmark className="h-4 w-4" />
                  {currentStatus === 'review' ? 'Marked for Review' : 'Mark for Review'}
                </Button>
              )}

              {currentIndex < totalQuestions - 1 ? (
                <Button
                  onClick={() => goToQuestion(currentIndex + 1)}
                  className="gap-1.5"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setShowConfirm(true)}
                  className="gap-1.5 bg-success hover:bg-success/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Finish & Submit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* FLOATING SIDEBAR PALETTE FOR NORMAL MODE */}
        {!assessmentInfo.isRepublished && (
          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-outline-variant bg-card flex flex-col shrink-0 overflow-y-auto max-h-[40vh] md:max-h-none">
            <div className="p-4 border-b border-outline-variant">
              <h3 className="font-bold text-title-sm flex items-center gap-1.5 text-on-surface">
                <Brain className="h-4 w-4 text-primary" />
                Question Navigator
              </h3>
              <p className="text-label-xs text-on-surface-variant mt-0.5">
                {answeredCount} of {totalQuestions} answered
              </p>
            </div>

            <div className="p-3 bg-surface-variant/30 border-b border-outline-variant text-label-xs grid grid-cols-2 gap-2 text-on-surface-variant">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-muted opacity-60" />
                <span>Unvisited</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-warning" />
                <span>Visited</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-success" />
                <span>Attempted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-info" />
                <span>For Review</span>
              </div>
            </div>

            <div className="p-4 grid grid-cols-5 gap-2.5">
              {questions.map((q, i) => {
                const status = questionStatuses[q.id] || 'unvisited';
                const isCurrent = currentIndex === i;
                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(i)}
                    className={cn(
                      'h-9 w-9 rounded-lg text-label-xs font-bold transition-all flex items-center justify-center shadow-sm hover:scale-105',
                      getStatusColor(status, isCurrent)
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* CONFIRMATION DIALOG */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-full max-w-sm"
          >
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-title-sm">Finish Assessment</CardTitle>
                <CardDescription>
                  You answered {answeredCount} of {totalQuestions} questions.
                  {answeredCount < totalQuestions && ` ${totalQuestions - answeredCount} remain unanswered.`}
                  Are you ready to submit and calculate your performance analytics?
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirm(false)}
                >
                  Review
                </Button>
                <Button
                  className="flex-1 bg-success hover:bg-success/90"
                  onClick={handleSubmitAttempt}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  Submit Test
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* FULLSCREEN BLOCKING MODAL FOR EXAMS */}
      {assessmentType === 'exam' && !isFullscreen && phase === 'quiz' && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md border-destructive/50 border-border/60 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-2 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <CardTitle className="text-headline-sm font-bold">Fullscreen Required</CardTitle>
              <CardDescription className="text-body-md">
                Leaving fullscreen mode violates exam integrity policies. This exit has been logged.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-4 pt-4 text-center">
              <p className="text-label-xs text-muted-foreground">
                To continue with your exam, you must return to fullscreen mode immediately.
              </p>
              <Button onClick={requestFullscreen} size="lg" className="w-full font-semibold">
                Return to Fullscreen
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
