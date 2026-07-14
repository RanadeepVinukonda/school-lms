import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Clock, AlertCircle, CheckCircle, XCircle, Loader2,
  ChevronLeft, ChevronRight, Send, Play, ArrowLeft
} from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getQuiz } from '@/services/dataService';
import type { Quiz, Question } from '@/types';

function QuizSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function QuizAttemptPage() {
  const { _ } = useTranslation();
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'intro' | 'taking' | 'results'>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: quiz, isLoading, isError } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      if (!quizId) return null;
      const item = await getQuiz(quizId);
      if (!item) return null;
      return {
        id: item.id,
        courseId: '',
        title: item.title,
        description: item.description ?? '',
        instructions: '',
        timeLimit: item.timeLimit ?? 10,
        passingScore: 50,
        maxAttempts: 1,
        shuffleQuestions: false,
        showResults: true,
        questions: (item.questions ?? []) as Question[],
        status: 'published' as const,
        createdAt: '',
        updatedAt: '',
      } satisfies Quiz;
    },
    enabled: !!quizId,
  });

  useEffect(() => {
    if (phase === 'taking' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    }
    if (timeLeft === 0 && phase === 'taking') {
      toast.error(_('Time is up!'));
      setPhase('results');
    }
  }, [phase, timeLeft]);

  const handleSubmit = useCallback(() => {
    setPhase('results');
    setShowConfirm(false);
    toast.success(_('Quiz submitted!'));
  }, []);

  if (isLoading) return <QuizSkeleton />;

  if (isError || !quiz) {
    return (
      <div className="sm:p-6 p-4">
        <Card className="border-border/60"><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium text-headline-sm">{_('Failed to load quiz')}</p>
          <Button variant="outline" onClick={() => window.history.back()}>{_('Go Back')}</Button>
        </CardContent></Card>
      </div>
    );
  }

  const q = quiz!.questions?.[currentQ];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quiz.questions?.length || 0;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  if (!q && phase === 'taking') {
    return (
      <div className="sm:p-6 p-4">
        <Card className="border-border/60"><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium text-headline-sm">{_('No questions found')}</p>
          <Button variant="outline" onClick={() => navigate('/student/dashboard')}>{_('Back to Dashboard')}</Button>
        </CardContent></Card>
      </div>
    );
  }

  function handleStart() {
    setTimeLeft((quiz!.timeLimit || 10) * 60);
    setPhase('taking');
  }

  if (phase === 'intro') {
    return (
      <>
        <SEOHead title={quiz.title} description={`${_('Quiz')}: ${quiz.title}`} canonical={`/quizzes/${quizId}`} />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16">
          <motion.div variants={cardStackReveal} custom={0} className="max-w-lg mx-auto">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" />{_('Back')}
            </Button>
            <Card className="border-border/60">
              <CardContent className="p-6 text-center space-y-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-headline-sm">{quiz.title}</CardTitle>
                <CardDescription className="text-body-lg">{quiz.description}</CardDescription>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-md">
                  <div className="bg-muted rounded-lg p-3"><p className="text-display-xs font-bold">{totalQuestions}</p><p className="text-label-xs text-muted-foreground">{_('Questions')}</p></div>
                  <div className="bg-muted rounded-lg p-3"><p className="text-display-xs font-bold">{quiz.timeLimit}m</p><p className="text-label-xs text-muted-foreground">{_('Time Limit')}</p></div>
                  <div className="bg-muted rounded-lg p-3"><p className="text-display-xs font-bold">{quiz.questions?.reduce((s, q) => s + q.points, 0) || 0}</p><p className="text-label-xs text-muted-foreground">{_('Points')}</p></div>
                </div>
                <div className="text-left text-body-md text-muted-foreground bg-muted rounded-lg p-3">
                  <p className="font-medium mb-1">{_('Instructions:')}</p>
                  <p>{(quiz as any).instructions || quiz.description}</p>
                  <p className="mt-1">{_('Passing score')}: {quiz.passingScore}%</p>
                </div>
                <Button className="w-full" onClick={handleStart}><Play className="h-4 w-4 mr-2" />{_('Start Quiz')}</Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </>
    );
  }

  const quizTotalCorrect = quiz.questions?.filter(q => answers[q.id] === q.correctAnswer).length || 0;
  const quizTotalPoints = quiz.questions?.reduce((s, q) => s + q.points, 0) || 0;
  const quizTotalScore = totalQuestions > 0 ? quizTotalCorrect * (quizTotalPoints / totalQuestions) : 0;
  const quizPercentage = quizTotalPoints > 0 ? Math.round((quizTotalScore / quizTotalPoints) * 100) : 0;
  const quizPassed = quizPercentage >= quiz.passingScore;

  if (phase === 'results') {
    return (
      <>
        <SEOHead title={`${quiz.title} - ${_('Results')}`} description={_('Quiz results')} />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16">
          <motion.div variants={cardStackReveal} custom={0} className="max-w-lg mx-auto">
            <Card className="border-border/60">
              <CardContent className="p-6 text-center space-y-4">
                <div className={cn('h-12 w-12 rounded-xl mx-auto flex items-center justify-center', quizPassed ? 'bg-emerald-500/10' : 'bg-destructive/10')}>
                  {quizPassed ? <CheckCircle className="h-6 w-6 text-emerald-500" /> : <XCircle className="h-6 w-6 text-destructive" />}
                </div>
                <CardTitle className="text-headline-sm">{quizPassed ? _('Congratulations!') : _('Keep Practicing')}</CardTitle>
                <p className="text-display-xs font-bold">{quizTotalScore}/{quizTotalPoints}</p>
                <p className="text-body-md text-muted-foreground">{quizPercentage}% &middot; {quizTotalCorrect}/{totalQuestions} {_('correct')}</p>
                <Badge variant={quizPassed ? 'success' : 'destructive'} className="mx-auto">{quizPassed ? _('Passed') : _('Failed')}</Badge>
                <div className="text-left space-y-2 mt-4">
                  {quiz.questions?.map((question, i) => (
                    <div key={question.id} className={cn('p-3 rounded-lg text-body-md', answers[question.id] === question.correctAnswer ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-destructive/5 border border-destructive/20')}>
                      <p className="font-medium mb-1">Q{i + 1}. {question.text}</p>
                      <p className="text-label-xs text-muted-foreground">{_('Your answer:')} {answers[question.id] || _('Not answered')}</p>
                      {answers[question.id] !== question.correctAnswer && (
                        <p className="text-label-xs text-emerald-500">{_('Correct:')} {question.correctAnswer}</p>
                      )}
                    </div>
                  ))}
                </div>
                <Button className="w-full" onClick={() => navigate('/student/dashboard')}>{_('Back to Dashboard')}</Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <>
      <SEOHead title={`${quiz.title} - ${_('In Progress')}`} description={_('Quiz in progress')} />
      <div className="p-4 max-w-2xl mx-auto pb-32">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {quiz.questions?.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={cn(
                  'h-8 w-8 rounded-full text-label-xs font-medium transition-colors',
                  currentQ === i ? 'bg-primary text-primary-foreground' :
                  answers[quiz.questions[i].id] ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className={cn('flex items-center gap-1 text-body-md font-medium', timeLeft < 60 ? 'text-destructive' : '')}>
            <Clock className="h-4 w-4" />
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>

        <Progress value={progress} className="h-1 mb-4" />

        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <Badge variant="outline" className="text-body-md">{_('Question')} {currentQ + 1} {_('of')} {totalQuestions}</Badge>
              <span className="text-label-xs text-muted-foreground">{q.points} {_('pts')}</span>
            </div>
            <p className="font-medium text-body-lg mb-4">{q.text}</p>

            {q.type === 'multiple_choice' && (
              <RadioGroup value={answers[q.id] || ''} onValueChange={v => setAnswers(prev => ({ ...prev, [q.id]: v }))}>
                {q.options?.map(opt => (
                  <div key={opt} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                    <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                    <Label htmlFor={`${q.id}-${opt}`} className="flex-1 cursor-pointer text-body-md">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {q.type === 'true_false' && (
              <RadioGroup value={answers[q.id] || ''} onValueChange={v => setAnswers(prev => ({ ...prev, [q.id]: v }))}>
                {['True', 'False'].map(opt => (
                  <div key={opt} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                    <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                    <Label htmlFor={`${q.id}-${opt}`} className="flex-1 cursor-pointer text-body-md">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {q.type === 'short_answer' && (
              <Textarea
                placeholder={_('Type your answer...')}
                rows={3}
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => setCurrentQ(i => Math.max(0, i - 1))} disabled={currentQ === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" />{_('Previous')}
          </Button>
          {currentQ < totalQuestions - 1 ? (
            <Button onClick={() => setCurrentQ(i => i + 1)} disabled={currentQ === totalQuestions - 1}>
              {_('Next')}<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => setShowConfirm(true)}>
              <Send className="h-4 w-4 mr-1" />{_('Submit')}
            </Button>
          )}
        </div>

        {showConfirm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm border-border/60">
              <CardHeader><CardTitle className="text-title-sm">{_('Submit Quiz')}</CardTitle><CardDescription>{_('You have answered')} {answeredCount} {_('of')} {totalQuestions} {_('questions.')} {_('Unanswered questions will be marked wrong.')}</CardDescription></CardHeader>
              <CardContent className="p-5 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>{_('Review')}</Button>
                <Button className="flex-1" onClick={handleSubmit}>{_('Submit')}</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
