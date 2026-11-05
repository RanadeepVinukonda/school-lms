import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Clock, AlertCircle, CheckCircle, XCircle, Send, Play, ChevronLeft, ChevronRight, FileText, CheckCheck, TrendingUp, TrendingDown, BookOpen, Lightbulb, MessageSquareText, AlertTriangle } from 'lucide-react';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getExam, getCorrectionsByExam } from '@/services/dataService';
import { useAuthStore } from '@/store/authStore';
import type { Exam, ExamQuestion } from '@/types';

function qText(q: ExamQuestion): string { return ((q as unknown) as { question?: string }).question ?? q.text ?? ''; }
function fmt(s: number): string { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

function ExamSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-48 mx-auto" /><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

const typeLbl: Record<string, string> = { multiple_choice: 'Multiple Choice', true_false: 'True / False', essay: 'Essays', short_answer: 'Short Answer', problem_solving: 'Problem Solving' };

export default function ExamAttemptPage() {
  const { _ } = useTranslation();
  const { examId } = useParams();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const [phase, setPhase] = useState<'intro' | 'taking' | 'results'>('intro');
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [saveSt, setSaveSt] = useState<'saved' | 'unsaved'>('saved');
  const st = useRef<ReturnType<typeof setTimeout>>();

  const { data: exam, isLoading, isError } = useQuery({
    queryKey: ['exam', examId],
    queryFn: async () => {
      if (!examId) return null;
      const item = await getExam(examId);
      if (!item) return null;
      return {
        id: item.id,
        courseId: '',
        title: item.title,
        description: item.description ?? '',
        instructions: '',
        duration: item.duration ?? 30,
        totalPoints: 0,
        passingScore: 50,
        questions: (item.questions ?? []) as ExamQuestion[],
        status: (item.status as Exam['status']) ?? 'published',
        startDate: item.startDate ?? '',
        endDate: item.endDate ?? '',
        isProctored: false,
        shuffleQuestions: false,
        showResults: true,
        createdAt: item.createdAt ?? '',
        updatedAt: '',
      } satisfies Exam;
    },
    enabled: !!examId,
  });

  const { data: corrections } = useQuery({
    queryKey: ['corrections', examId],
    queryFn: async () => {
      if (!examId) return [];
      return getCorrectionsByExam(examId);
    },
    enabled: !!examId,
  });

  const timerOn = phase === 'taking' && timeLeft > 0;
  useEffect(() => { if (!timerOn) return; const id = setInterval(() => setTimeLeft(t => t - 1), 1000); return () => clearInterval(id); }, [timerOn]);
  useEffect(() => { if (timeLeft === 0 && phase === 'taking') { toast.error(_('Time is up! Auto-submitting...')); setPhase('results'); } }, [timeLeft, phase]);
  useEffect(() => {
    if (saveSt === 'unsaved') { clearTimeout(st.current); st.current = setTimeout(() => setSaveSt('saved'), 1500); }
    return () => clearTimeout(st.current);
  }, [answers, saveSt]);

  const onAnswer = useCallback((v: string) => { if (!exam?.questions?.[cur]) return; setAnswers(p => ({ ...p, [exam.questions[cur].id]: v })); setSaveSt('unsaved'); }, [cur, exam]);
  const onSubmit = useCallback(() => { setPhase('results'); setConfirm(false); toast.success(_('Exam submitted successfully!')); }, []);
  const goTo = useCallback((i: number) => setCur(i), []);

  if (isLoading) return <ExamSkeleton />;
  if (isError || !exam) return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md border-border/60">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="font-semibold text-headline-sm">{_('Failed to load exam')}</p>
          <p className="text-body-md text-muted-foreground">{_('The exam you are looking for does not exist or has been removed.')}</p>
          <Button variant="outline" onClick={() => navigate('/student/exams')}>{_('Back to Exams')}</Button>
        </CardContent>
      </Card>
    </div>
  );

  const qs = exam.questions?.length ?? 0;
  const totalPts = exam.questions?.reduce((s, q) => s + q.points, 0) ?? 0;
  const passAt = exam.passingScore ?? 50;

  // INTRO PHASE
  if (phase === 'intro') return (
    <>
      <SEOHead title={exam.title} description={exam.description} canonical={`/exams/${examId}`} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center min-h-[80vh] sm:p-6 p-4">
        <motion.div variants={cardStackReveal} custom={0} className="w-full max-w-md">
          <Card className="border-border/60">
            <CardContent className="p-6 text-center space-y-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto"><FileText className="h-6 w-6 text-primary" /></div>
              <div><CardTitle className="text-headline-sm">{exam.title}</CardTitle><CardDescription className="text-body-lg">{exam.description}</CardDescription></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[{ l: _('Questions'), v: qs }, { l: _('Duration'), v: `${exam.duration}m` }, { l: _('Points'), v: totalPts }].map(s => (
                  <div key={s.l} className="bg-muted rounded-xl p-3"><p className="text-display-xs font-bold">{s.v}</p><p className="text-label-xs text-muted-foreground">{s.l}</p></div>
                ))}
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-left text-body-md space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400"><AlertTriangle className="h-4 w-4" /><span>{_('Important')}</span></div>
                <p className="text-muted-foreground">{exam.instructions || _('Read each question carefully. You can navigate between questions freely.')}</p>
                <p className="text-muted-foreground">{_('Your exam will be auto-submitted when time expires.')}</p>
              </div>
              <Button size="lg" className="w-full text-body-lg" onClick={() => { setTimeLeft((exam.duration || 30) * 60); setPhase('taking'); }}>
                <Play className="h-5 w-5 mr-2" /> {_('Start Exam')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );

  const correct = exam.questions?.filter(q => answers[q.id] === q.correctAnswer).length ?? 0;
  const ppq = qs > 0 ? totalPts / qs : 0;
  const score = correct * ppq;
  const pct = totalPts > 0 ? Math.round((score / totalPts) * 100) : 0;
  const passed = pct >= passAt;

  // RESULTS PHASE
  if (phase === 'results') {
    const grp: Record<string, { t: number; c: number }> = {};
    exam.questions?.forEach(q => { const k = q.type; if (!grp[k]) grp[k] = { t: 0, c: 0 }; grp[k].t++; if (answers[q.id] === q.correctAnswer) grp[k].c++; });
    const str = Object.entries(grp).filter(([, v]) => v.t > 0 && v.c / v.t >= 0.7).map(([k]) => _(typeLbl[k] ?? k));
    const wk = Object.entries(grp).filter(([, v]) => v.t > 0 && v.c / v.t < 0.7).map(([k]) => _(typeLbl[k] ?? k));
    if (!str.length && !wk.length) str.push(_('No significant strengths identified'));

    const cr = corrections?.[0];
    const fb = cr?.overallFeedback ?? (passed
      ? _('Excellent work! You have demonstrated a strong understanding of the material. Keep up the great effort!')
      : _('You are making progress but there are areas that need attention. Focus on reviewing the topics listed below and practice with additional exercises.'));
    const sug = [`${exam.title} \u2013 ${_('Core Concepts Review')}`, `${_('Practice Problems for')} ${exam.title}`, `${exam.title} ${_('Study Guide & Tips')}`];

    return (
      <>
        <SEOHead title={`${exam.title} - ${_('Results')}`} description={_('Exam results')} />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16">
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardContent className="p-6 text-center space-y-4">
                <div className={cn('h-12 w-12 rounded-xl mx-auto flex items-center justify-center', passed ? 'bg-success-container' : 'bg-error-container')}>
                  {passed ? <CheckCircle className="h-6 w-6 text-success" /> : <XCircle className="h-6 w-6 text-error" />}
                </div>
                <div><CardTitle className="text-headline-sm">{passed ? _('Congratulations!') : _('Keep Practicing')}</CardTitle><p className="text-muted-foreground mt-1">{exam.title}</p></div>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div className="text-center"><p className="text-display-xs font-bold">{score}/{totalPts}</p><p className="text-label-xs text-muted-foreground">{_('Final Score')}</p></div>
                  <Separator orientation="vertical" className="h-12 hidden sm:block" />
                  <div className="text-center"><p className={cn('text-display-xs font-bold', passed ? 'text-success' : 'text-error')}>{pct}%</p><p className="text-label-xs text-muted-foreground">{_('Percentage')}</p></div>
                  <Separator orientation="vertical" className="h-12 hidden sm:block" />
                  <div className="text-center"><Badge variant={passed ? 'success' : 'destructive'} className="text-body-md px-4 py-1">{passed ? _('PASSED') : _('FAILED')}</Badge><p className="text-label-xs text-muted-foreground mt-1">{_('Status')}</p></div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={cardStackReveal} custom={0} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-border/60"><CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2 text-success"><TrendingUp className="h-5 w-5" /><h3 className="font-semibold text-title-sm">{_('Strengths')}</h3></div>
              {str.length ? <ul className="space-y-1">{str.map(s => <li key={s} className="text-body-md text-muted-foreground flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0" />{s}</li>)}</ul> : <p className="text-body-md text-muted-foreground">{_('No strengths yet.')}</p>}
            </CardContent></Card>
            <Card className="border-border/60"><CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2 text-error"><TrendingDown className="h-5 w-5" /><h3 className="font-semibold text-title-sm">{_('Areas to Improve')}</h3></div>
              {wk.length ? <ul className="space-y-1">{wk.map(w => <li key={w} className="text-body-md text-muted-foreground flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 text-error flex-shrink-0" />{w}</li>)}</ul> : <p className="text-body-md text-muted-foreground">{_('Great job — keep maintaining your skills!')}</p>}
            </CardContent></Card>
          </motion.div>
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardHeader><CardTitle className="text-title-md">{_('Question Review')}</CardTitle><CardDescription>{_('Review your answers with the correct solutions')}</CardDescription></CardHeader>
              <CardContent className="p-5 space-y-3">
                {exam.questions?.map((q, i) => { const u = answers[q.id]; const ok = u === q.correctAnswer; return (
                  <div key={q.id} className={cn('p-4 rounded-xl border text-body-md space-y-2', ok ? 'bg-success-container/30 border-success/30' : 'bg-error-container/30 border-error/30')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 font-medium">
                        {ok ? <CheckCircle className="h-4 w-4 text-success flex-shrink-0" /> : <XCircle className="h-4 w-4 text-error flex-shrink-0" />}
                        <span>Q{i + 1}. {qText(q)}</span>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0">{q.points} {_('pts')}</Badge>
                    </div>
                    <div className="pl-6 space-y-1">
                      <p className="text-muted-foreground">{_('Your answer:')} <span className={cn('font-medium', ok ? 'text-success' : 'text-error')}>{u || _('Not answered')}</span></p>
                      {!ok && q.correctAnswer && <p className="text-success font-medium">{_('Correct answer:')} {q.correctAnswer}</p>}
                    </div>
                  </div>
                );})}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardHeader><CardTitle className="text-title-md flex items-center gap-2"><MessageSquareText className="h-5 w-5" /> {_('Teacher Feedback')}</CardTitle></CardHeader>
              <CardContent className="p-5"><p className="text-body-md text-muted-foreground leading-relaxed">{fb}</p></CardContent>
            </Card>
          </motion.div>
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardHeader><CardTitle className="text-title-md flex items-center gap-2"><Lightbulb className="h-5 w-5" /> {_('Suggested Topics to Study')}</CardTitle><CardDescription>{_('Based on your performance, focus on these areas')}</CardDescription></CardHeader>
              <CardContent className="p-5 space-y-2">{sug.map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><BookOpen className="h-4 w-4 text-primary" /></div>
                  <span className="text-body-md font-medium">{t}</span>
                </div>
              ))}</CardContent>
            </Card>
          </motion.div>
          <Button className="w-full" size="lg" onClick={() => navigate('/student/exams')}>{_('Back to Exams')}</Button>
        </motion.div>
      </>
    );
  }

  // TAKING PHASE (FOCUS MODE)
  const warn = timeLeft > 0 && timeLeft <= 300;
  const q = exam.questions?.[cur];
  const ans = Object.keys(answers).length;

  return (
    <>
      <SEOHead title={`${exam.title} - ${_('In Progress')}`} description={_('Exam in progress')} />
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        <div className={cn('px-4 py-3 flex items-center justify-between border-b transition-colors', warn ? 'bg-error-container text-on-error-container' : 'bg-card')}>
          <div className="flex items-center gap-3">
            <div className={cn('flex items-center gap-2 font-mono text-title-md font-bold', warn && 'animate-pulse')}>
              <Clock className="h-5 w-5" />{fmt(timeLeft)}
            </div>
            {warn && <Badge variant="destructive" className="animate-pulse text-label-xs"><AlertTriangle className="h-3 w-3 mr-1" />{_('Time running out')}</Badge>}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-body-md font-medium"><span className="text-title-sm">{cur + 1}</span>/{qs}</span>
            <div className="text-label-xs font-medium">{saveSt === 'saved'
              ? <span className="flex items-center gap-1 text-success"><CheckCheck className="h-3.5 w-3.5" /> {_('Saved')}</span>
              : <span className="flex items-center gap-1 text-warning"><Clock className="h-3.5 w-3.5" /> {_('Unsaved')}</span>}</div>
          </div>
        </div>
        {qs === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-medium text-headline-sm">{_('No questions available')}</p>
              <p className="text-body-md text-muted-foreground">{_('This exam has no questions yet. Please contact your teacher.')}</p>
              <Button variant="outline" onClick={() => navigate('/student/exams')}>{_('Back to Exams')}</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto p-4 md:p-8">
                <AnimatePresence mode="wait">
                  <motion.div key={cur} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-body-md px-3 py-1">{_('Question')} {cur + 1} {_('of')} {qs}</Badge>
                        <span className="text-body-md text-muted-foreground font-medium">{q?.points} {_('pts')}</span>
                      </div>
                      <p className="text-headline-sm font-semibold leading-relaxed">{q ? qText(q) : ''}</p>
                      {q?.type === 'essay' || q?.type === 'short_answer' || q?.type === 'problem_solving' ? (
                        <Textarea placeholder={_('Type your answer here...')} className="min-h-[220px] text-body-lg leading-relaxed" value={answers[q.id] ?? ''} onChange={e => onAnswer(e.target.value)} />
                      ) : (
                        <RadioGroup value={answers[q?.id ?? ''] ?? ''} onValueChange={onAnswer} className="space-y-3">
                          {q?.options?.map(opt => (
                            <div key={opt}>
                              <RadioGroupItem value={opt} id={`${q.id}-${opt}`} className="peer sr-only" />
                              <Label htmlFor={`${q.id}-${opt}`}
                                className={cn('flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all text-body-lg', 'hover:bg-accent hover:border-primary/50',
                                  'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary/20')}>
                                <div className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', answers[q.id] === opt ? 'border-primary bg-primary' : 'border-muted-foreground/30')}>
                                  {answers[q.id] === opt && <div className="h-2 w-2 rounded-full bg-white" />}
                                </div>
                                <span>{opt}</span>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <div className="border-t bg-card px-4 py-3">
              <div className="max-w-2xl mx-auto space-y-3">
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {exam.questions?.map((question, i) => (
                    <button key={question.id} onClick={() => goTo(i)}
                      className={cn('h-8 w-8 rounded-full text-label-xs font-medium transition-all flex items-center justify-center',
                        cur === i ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 scale-110'
                          : answers[question.id] ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:bg-accent')}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Button variant="outline" onClick={() => goTo(Math.max(0, cur - 1))} disabled={cur === 0} className="gap-1">
                    <ChevronLeft className="h-4 w-4" /> {_('Previous')}
                  </Button>
                  {cur < qs - 1 ? (
                    <Button onClick={() => goTo(cur + 1)} className="gap-1">{_('Next')} <ChevronRight className="h-4 w-4" /></Button>
                  ) : (
                    <Button onClick={() => setConfirm(true)} className="gap-1"><Send className="h-4 w-4" /> {_('Submit')}</Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {confirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
            <Card className="w-full max-w-sm border-border/60">
              <CardHeader><CardTitle className="text-title-sm">{_('Submit Exam')}</CardTitle><CardDescription>{_('You answered')} {ans} {_('of')} {qs} {_('questions.')}{ans < qs && ` ${qs - ans} ${_('unanswered.')}`} {_('This action cannot be undone.')}</CardDescription></CardHeader>
              <CardContent className="p-5 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirm(false)}>{_('Review')}</Button>
                <Button className="flex-1" onClick={onSubmit}><Send className="h-4 w-4 mr-1" /> {_('Submit')}</Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </>
  );
}
