import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Clock, AlertCircle, CheckCircle, XCircle, Loader2,
  Send, Play, Shield, AlertTriangle
} from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

function ExamSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function ExamAttemptPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'intro' | 'taking' | 'results'>('intro');
  const [understood, setUnderstood] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(1800);
  const [showConfirm, setShowConfirm] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ['exam', examId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 500));
      return null;
    },
  });

  const exam = {
    id: examId,
    title: 'Midterm Exam',
    description: 'Covers all topics from Chapters 1-3.',
    timeLimit: 30,
    questionsCount: 10,
    totalPoints: 100,
    passingScore: 50,
    instructions: 'This exam will be taken in full-screen mode. Do not navigate away.',
    questions: [
      { id: 'e1', type: 'mcq' as const, text: 'What is the slope of y = 3x + 2?', options: ['2', '3', '-2', '-3'], points: 10, correctAnswer: '3' },
      { id: 'e2', type: 'true_false' as const, text: 'A linear equation has degree 1.', options: ['True', 'False'], points: 10, correctAnswer: 'True' },
      { id: 'e3', type: 'fill_blank' as const, text: 'The x-intercept of y = 2x - 6 is ___', points: 10, correctAnswer: '3' },
      { id: 'e4', type: 'mcq' as const, text: 'Which graph represents a function?', options: ['Vertical line', 'Horizontal line', 'Circle', 'Parabola (opening sideways)'], points: 10, correctAnswer: 'Horizontal line' },
      { id: 'e5', type: 'short_answer' as const, text: 'Simplify: 3(2x - 1) + 4', points: 10, correctAnswer: '6x + 1' },
    ],
  };

  useEffect(() => {
    if (phase === 'taking' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    }
    if (timeLeft === 0 && phase === 'taking') {
      toast.error('Time is up! Auto-submitting...');
      setPhase('results');
    }
  }, [phase, timeLeft]);

  const handleSubmit = useCallback(() => {
    setPhase('results');
    setShowConfirm(false);
    toast.success('Exam submitted!');
  }, []);

  if (isLoading) return <ExamSkeleton />;

  if (phase === 'intro') {
    return (
      <>
        <SEOHead title={exam.title} description={`Exam: ${exam.title}`} canonical={`/exams/${examId}`} />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <Shield className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle className="text-xl">{exam.title}</CardTitle>
            <CardDescription>{exam.description}</CardDescription>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-3"><p className="font-bold text-lg">{exam.questionsCount}</p><p className="text-xs text-muted-foreground">Questions</p></div>
              <div className="bg-muted rounded-lg p-3"><p className="font-bold text-lg">{exam.timeLimit}m</p><p className="text-xs text-muted-foreground">Time Limit</p></div>
              <div className="bg-muted rounded-lg p-3"><p className="font-bold text-lg">{exam.totalPoints}</p><p className="text-xs text-muted-foreground">Points</p></div>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-left text-sm">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="font-medium">Important</span></div>
              <p className="text-muted-foreground text-xs">{exam.instructions}</p>
              <p className="text-muted-foreground text-xs mt-1">Auto-submitted when time expires.</p>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Checkbox id="understood" checked={understood} onCheckedChange={c => setUnderstood(c as boolean)} />
              <Label htmlFor="understood" className="text-sm">I understand and agree to the exam rules</Label>
            </div>
            <Button className="w-full" disabled={!understood} onClick={() => setPhase('taking')}>
              <Play className="h-4 w-4 mr-2" />Start Exam
            </Button>
          </CardContent>
        </Card>
      </motion.div>
      </>
    );
  }

  const totalCorrect = exam.questions.filter(q => answers[q.id] === q.correctAnswer).length;
  const totalScore = totalCorrect * (exam.totalPoints / exam.questions.length);
  const examPercentage = Math.round((totalScore / exam.totalPoints) * 100);
  const examPassed = examPercentage >= exam.passingScore;

  if (phase === 'results') {
    return (
      <>
        <SEOHead title={`${exam.title} - Results`} description="Exam results" />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className={cn('h-20 w-20 rounded-full mx-auto flex items-center justify-center', examPassed ? 'bg-emerald-500/10' : 'bg-destructive/10')}>
              {examPassed ? <CheckCircle className="h-10 w-10 text-emerald-500" /> : <XCircle className="h-10 w-10 text-destructive" />}
            </div>
            <CardTitle className="text-xl">{examPassed ? 'You Passed!' : 'Better Luck Next Time'}</CardTitle>
            <p className="text-4xl font-bold">{totalScore}/{exam.totalPoints}</p>
            <p className="text-sm text-muted-foreground">{examPercentage}% &middot; {totalCorrect}/{exam.questionsCount} correct</p>
            <Badge variant={examPassed ? 'success' : 'destructive'} className="mx-auto">{examPassed ? 'Passed' : 'Failed'}</Badge>
            <div className="text-left space-y-2 mt-4">
              {exam.questions.map((q, i) => (
                <div key={q.id} className={cn('p-3 rounded-lg text-sm', answers[q.id] === q.correctAnswer ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-destructive/5 border border-destructive/20')}>
                  <p className="font-medium mb-1">Q{i + 1}. {q.text}</p>
                  <p className="text-xs text-muted-foreground">Your answer: {answers[q.id] || 'Not answered'}</p>
                  {answers[q.id] !== q.correctAnswer && <p className="text-xs text-emerald-500">Correct: {q.correctAnswer}</p>}
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
  const q = exam.questions[currentQ];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / exam.questions.length) * 100;

  return (
    <>
      <SEOHead title={`${exam.title} - In Progress`} description="Exam in progress" />
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="bg-destructive/5 border-b border-destructive/20 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium">Exam in progress</span>
        </div>
        <div className={cn('flex items-center gap-1 text-sm font-mono font-bold', timeLeft < 120 ? 'text-destructive animate-pulse' : '')}>
          <Clock className="h-4 w-4" />
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {exam.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={cn(
                  'h-8 w-8 rounded-full text-xs font-medium flex-shrink-0 transition-colors',
                  currentQ === i ? 'bg-primary text-primary-foreground' :
                  answers[exam.questions[i].id] ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <Progress value={progress} className="h-1 mb-4" />

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline">Question {currentQ + 1} of {exam.questions.length}</Badge>
                <span className="text-xs text-muted-foreground">{q.points} pts</span>
              </div>
              <p className="font-medium mb-4">{q.text}</p>

              <div className="space-y-2">
                {q.options?.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors text-sm',
                      answers[q.id] === opt ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent',
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={() => setCurrentQ(i => Math.max(0, i - 1))} disabled={currentQ === 0}>Previous</Button>
            {currentQ < exam.questions.length - 1 ? (
              <Button onClick={() => setCurrentQ(i => i + 1)}>Next</Button>
            ) : (
              <Button onClick={() => setShowConfirm(true)}><Send className="h-4 w-4 mr-1" />Submit</Button>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader><CardTitle>Submit Exam</CardTitle><CardDescription>You answered {answeredCount} of {exam.questions.length} questions. This action cannot be undone.</CardDescription></CardHeader>
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
