import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Clock, AlertCircle, CheckCircle, XCircle, Loader2,
  ChevronLeft, ChevronRight, Send, Play
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
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface Question {
  id: string;
  type: 'mcq' | 'true_false' | 'fill_blank' | 'short_answer';
  text: string;
  options?: string[];
  points: number;
}

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
  const [timeLeft, setTimeLeft] = useState(600);
  const [showConfirm, setShowConfirm] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 500));
      return null;
    },
  });

  const quiz = {
    id: quizId,
    title: 'Algebra Quiz 3',
    description: 'Test your understanding of linear equations and graphing.',
    timeLimit: 10,
    questionsCount: 5,
    totalPoints: 50,
    passingScore: 60,
    instructions: 'Read each question carefully. You can navigate between questions freely.',
    questions: [
      { id: 'q1', type: 'mcq' as const, text: 'What is the solution to 2x + 5 = 13?', options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'], points: 10, correctAnswer: 'x = 4' },
      { id: 'q2', type: 'true_false' as const, text: 'The slope of a horizontal line is 0.', options: ['True', 'False'], points: 10, correctAnswer: 'True' },
      { id: 'q3', type: 'fill_blank' as const, text: 'The y-intercept of y = 2x + 3 is ___', points: 10, correctAnswer: '3' },
      { id: 'q4', type: 'mcq' as const, text: 'Which of these is a linear equation?', options: ['y = x²', 'y = 2x + 1', 'y = 1/x', 'y = √x'], points: 10, correctAnswer: 'y = 2x + 1' },
      { id: 'q5', type: 'short_answer' as const, text: 'Find the slope between points (2,5) and (4,9).', points: 10, correctAnswer: '2' },
    ],
  };

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

  const q = quiz.questions[currentQ];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / quiz.questions.length) * 100;

  if (phase === 'intro') {
    return (
      <>
        <SEOHead title={quiz.title} description={`Quiz: ${quiz.title}`} canonical={`/quizzes/${quizId}`} />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">{quiz.title}</CardTitle>
            <CardDescription>{quiz.description}</CardDescription>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-3"><p className="font-bold text-lg">{quiz.questionsCount}</p><p className="text-xs text-muted-foreground">Questions</p></div>
              <div className="bg-muted rounded-lg p-3"><p className="font-bold text-lg">{quiz.timeLimit}m</p><p className="text-xs text-muted-foreground">Time Limit</p></div>
              <div className="bg-muted rounded-lg p-3"><p className="font-bold text-lg">{quiz.totalPoints}</p><p className="text-xs text-muted-foreground">Points</p></div>
            </div>
            <div className="text-left text-sm text-muted-foreground bg-muted rounded-lg p-3">
              <p className="font-medium mb-1">Instructions:</p>
              <p>{quiz.instructions}</p>
              <p className="mt-1">Passing score: {quiz.passingScore}%</p>
            </div>
            <Button className="w-full" onClick={() => setPhase('taking')}><Play className="h-4 w-4 mr-2" />Start Quiz</Button>
          </CardContent>
        </Card>
      </motion.div>
      </>
    );
  }

  const quizQ = quiz.questions[currentQ];
  const quizTotalCorrect = quiz.questions.filter(q => answers[q.id] === q.correctAnswer).length;
  const quizTotalScore = quizTotalCorrect * (quiz.totalPoints / quiz.questions.length);
  const quizPercentage = Math.round((quizTotalScore / quiz.totalPoints) * 100);
  const quizPassed = quizPercentage >= quiz.passingScore;

  if (phase === 'results') {
    return (
      <>
        <SEOHead title={`${quiz.title} - Results`} description="Quiz results" />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className={cn('h-20 w-20 rounded-full mx-auto flex items-center justify-center', quizPassed ? 'bg-emerald-500/10' : 'bg-destructive/10')}>
              {quizPassed ? <CheckCircle className="h-10 w-10 text-emerald-500" /> : <XCircle className="h-10 w-10 text-destructive" />}
            </div>
            <CardTitle className="text-xl">{quizPassed ? 'Congratulations!' : 'Keep Practicing'}</CardTitle>
            <p className="text-4xl font-bold">{quizTotalScore}/{quiz.totalPoints}</p>
            <p className="text-sm text-muted-foreground">{quizPercentage}% &middot; {quizTotalCorrect}/{quiz.questionsCount} correct</p>
            <Badge variant={quizPassed ? 'success' : 'destructive'} className="mx-auto">{quizPassed ? 'Passed' : 'Failed'}</Badge>
            <div className="text-left space-y-2 mt-4">
              {quiz.questions.map((question, i) => (
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
          {quiz.questions.map((_, i) => (
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
            <Badge variant="outline">Question {currentQ + 1} of {quiz.questions.length}</Badge>
            <span className="text-xs text-muted-foreground">{q.points} pts</span>
          </div>
          <p className="font-medium mb-4">{q.text}</p>

          {q.type === 'mcq' && (
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

          {q.type === 'fill_blank' && (
            <Input
              placeholder="Type your answer..."
              value={answers[q.id] || ''}
              onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
            />
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
        {currentQ < quiz.questions.length - 1 ? (
          <Button onClick={() => setCurrentQ(i => i + 1)} disabled={currentQ === quiz.questions.length - 1}>
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
            <CardHeader><CardTitle>Submit Quiz</CardTitle><CardDescription>You have answered {answeredCount} of {quiz.questions.length} questions. Unanswered questions will be marked wrong.</CardDescription></CardHeader>
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
