import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Clock, AlertCircle, CheckCircle, XCircle, Loader2,
  ChevronLeft, ChevronRight, Send, Play, ArrowLeft
} from 'phosphor-react';
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
import { pageTransition } from '@/lib/motion';
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
      toast.error('Time is up!');
      setPhase('results');
    }
  }, [phase, timeLeft]);

  const handleSubmit = useCallback(() => {
    setPhase('results');
    setShowConfirm(false);
    toast.success('Quiz submitted!');
  }, []);

  if (isLoading) return <QuizSkeleton />;

  if (isError || !quiz) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Failed to load quiz</p>
          <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
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
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">No questions found</p>
          <Button variant="outline" onClick={() => navigate('/student/dashboard')}>Back to Dashboard</Button>
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
        <SEOHead title={quiz.title} description={`Quiz: ${quiz.title}`} canonical={`/quizzes/${quizId}`} />
        <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-lg mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">{quiz.title}</CardTitle>
            <CardDescription>{quiz.description}</CardDescription>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-3"><p className="font-bold text-lg">{totalQuestions}</p><p className="text-xs text-muted-foreground">Questions</p></div>
              <div className="bg-muted rounded-lg p-3"><p className="font-bold text-lg">{quiz.timeLimit}m</p><p className="text-xs text-muted-foreground">Time Limit</p></div>
              <div className="bg-muted rounded-lg p-3"><p className="font-bold text-lg">{quiz.questions?.reduce((s, q) => s + q.points, 0) || 0}</p><p className="text-xs text-muted-foreground">Points</p></div>
            </div>
            <div className="text-left text-sm text-muted-foreground bg-muted rounded-lg p-3">
              <p className="font-medium mb-1">Instructions:</p>
              <p>{(quiz as any).instructions || quiz.description}</p>
              <p className="mt-1">Passing score: {quiz.passingScore}%</p>
            </div>
            <Button className="w-full" onClick={handleStart}><Play className="h-4 w-4 mr-2" />Start Quiz</Button>
          </CardContent>
        </Card>
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
        <SEOHead title={`${quiz.title} - Results`} description="Quiz results" />
        <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className={cn('h-20 w-20 rounded-full mx-auto flex items-center justify-center', quizPassed ? 'bg-emerald-500/10' : 'bg-destructive/10')}>
              {quizPassed ? <CheckCircle className="h-10 w-10 text-emerald-500" /> : <XCircle className="h-10 w-10 text-destructive" />}
            </div>
            <CardTitle className="text-xl">{quizPassed ? 'Congratulations!' : 'Keep Practicing'}</CardTitle>
            <p className="text-4xl font-bold">{quizTotalScore}/{quizTotalPoints}</p>
            <p className="text-sm text-muted-foreground">{quizPercentage}% &middot; {quizTotalCorrect}/{totalQuestions} correct</p>
            <Badge variant={quizPassed ? 'success' : 'destructive'} className="mx-auto">{quizPassed ? 'Passed' : 'Failed'}</Badge>
            <div className="text-left space-y-2 mt-4">
              {quiz.questions?.map((question, i) => (
                <div key={question.id} className={cn('p-3 rounded-lg text-sm', answers[question.id] === question.correctAnswer ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-destructive/5 border border-destructive/20')}>
                  <p className="font-medium mb-1">Q{i + 1}. {question.text}</p>
                  <p className="text-xs text-muted-foreground">Your answer: {answers[question.id] || 'Not answered'}</p>
                  {answers[question.id] !== question.correctAnswer && (
                    <p className="text-xs text-emerald-500">Correct: {question.correctAnswer}</p>
                  )}
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={() => navigate('/student/dashboard')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </motion.div>
      </>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <>
      <SEOHead title={`${quiz.title} - In Progress`} description="Quiz in progress" />
      <div className="p-4 max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {quiz.questions?.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={cn(
                'h-8 w-8 rounded-full text-xs font-medium transition-colors',
                currentQ === i ? 'bg-primary text-primary-foreground' :
                answers[quiz.questions[i].id] ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className={cn('flex items-center gap-1 text-sm font-medium', timeLeft < 60 ? 'text-destructive' : '')}>
          <Clock className="h-4 w-4" />
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>

      <Progress value={progress} className="h-1 mb-4" />

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline">Question {currentQ + 1} of {totalQuestions}</Badge>
            <span className="text-xs text-muted-foreground">{q.points} pts</span>
          </div>
          <p className="font-medium mb-4">{q.text}</p>

          {q.type === 'multiple_choice' && (
            <RadioGroup value={answers[q.id] || ''} onValueChange={v => setAnswers(prev => ({ ...prev, [q.id]: v }))}>
              {q.options?.map(opt => (
                <div key={opt} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                  <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                  <Label htmlFor={`${q.id}-${opt}`} className="flex-1 cursor-pointer">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {q.type === 'true_false' && (
            <RadioGroup value={answers[q.id] || ''} onValueChange={v => setAnswers(prev => ({ ...prev, [q.id]: v }))}>
              {['True', 'False'].map(opt => (
                <div key={opt} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                  <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                  <Label htmlFor={`${q.id}-${opt}`} className="flex-1 cursor-pointer">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {q.type === 'short_answer' && (
            <Textarea
              placeholder="Type your answer..."
              rows={3}
              value={answers[q.id] || ''}
              onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between mt-4">
        <Button variant="outline" onClick={() => setCurrentQ(i => Math.max(0, i - 1))} disabled={currentQ === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" />Previous
        </Button>
        {currentQ < totalQuestions - 1 ? (
          <Button onClick={() => setCurrentQ(i => i + 1)} disabled={currentQ === totalQuestions - 1}>
            Next<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => setShowConfirm(true)}>
            <Send className="h-4 w-4 mr-1" />Submit
          </Button>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader><CardTitle>Submit Quiz</CardTitle><CardDescription>You have answered {answeredCount} of {totalQuestions} questions. Unanswered questions will be marked wrong.</CardDescription></CardHeader>
            <CardContent className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Review</Button>
              <Button className="flex-1" onClick={handleSubmit}>Submit</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </>
  );
}
