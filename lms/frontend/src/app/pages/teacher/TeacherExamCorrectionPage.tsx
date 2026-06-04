import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listItem } from '@/lib/motion';
import { mockUsers, mockExams, mockSubjects, mockEnrollments, mockCorrections } from '@/lib/mockData';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

const studentAnswers: Record<string, Record<string, string>> = {
  s1: { eq1: 'x = (-b ± √(b²-4ac))/2a', eq2: 'Take coefficient of x, halve it, square it, add to both sides. Factor perfect square trinomial and solve.' },
  s2: { eq1: 'x = (-b ± √(b²-4ac))/2a', eq2: 'Completing the square rewrites ax²+bx+c as a(x-h)²+k. Find h=-b/2a and k=c-b²/4a.' },
  s3: { eq1: 'x = b²-4ac', eq2: 'I think you complete the square by adding and subtracting the same value to both sides of the equation.' },
};
const selectedWrong: Record<string, Record<string, string>> = { s3: { eq1: 'x = b²-4ac' } };
const shortcuts = [
  { k: 'Ctrl+Enter', a: 'Save & advance' },
  { k: 'Ctrl+←', a: 'Previous question' },
  { k: 'Ctrl+→', a: 'Next question' },
  { k: 'Ctrl+S', a: 'Save all' },
];

function getMark(marks: Record<string, number>, correction: typeof mockCorrections[0] | null, qId: string): number {
  return marks[qId] ?? correction?.questionMarks.find((qm) => qm.questionId === qId)?.marks ?? 0;
}

export default function TeacherExamCorrectionPage() {
  const { id } = useParams<{ id: string }>();
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const [qIdx, setQIdx] = useState(0);
  const [studentId, setStudentId] = useState('');
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [overallFb, setOverallFb] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  const exam = useMemo(() => mockExams.find((e) => e.id === id) ?? null, [id]);
  const subject = useMemo(() => mockSubjects.find((s) => s.id === exam?.subjectId) ?? null, [exam]);
  const corrections = useMemo(() => (exam ? mockCorrections.filter((c) => c.examId === exam.id) : []), [exam]);
  const questions = exam?.questions ?? [];

  const enrolled = useMemo(() => {
    if (!exam) return [];
    const ids = mockEnrollments.filter((e) => e.subjectId === exam.subjectId && e.status === 'active').map((e) => e.studentId);
    return ids.map((sid) => Object.values(mockUsers).find((u) => u.id === sid && u.role === 'student')).filter(Boolean) as typeof mockUsers.student1[];
  }, [exam]);

  const student = useMemo(() => enrolled.find((s) => s.id === studentId) ?? null, [enrolled, studentId]);
  const correction = useMemo(() => corrections.find((c) => c.studentId === studentId) ?? null, [corrections, studentId]);
  const question = questions[qIdx];
  const totalGiven = questions.reduce((s, q) => s + getMark(marks, correction, q.id), 0);
  const totalMax = questions.reduce((s, q) => s + q.points, 0);

  useEffect(() => {
    if (enrolled.length > 0 && !studentId) setStudentId(enrolled[0].id);
  }, [enrolled, studentId]);

  useEffect(() => {
    if (!exam) return;
    if (correction) {
      const m: Record<string, number> = {};
      const f: Record<string, string> = {};
      for (const qm of correction.questionMarks) { m[qm.questionId] = qm.marks; f[qm.questionId] = qm.feedback; }
      setMarks(m);
      setFeedback(f);
      setOverallFb(correction.overallFeedback);
    } else {
      setMarks({}); setFeedback({}); setOverallFb('');
    }
    setQIdx(0);
    setSaveStatus('saved');
  }, [correction, exam]);

  function markUnsaved() {
    setSaveStatus('unsaved');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus('saving');
      setTimeout(() => setSaveStatus('saved'), 600);
    }, 1500);
  }

  function saveAndAdvance() {
    setSaveStatus('saving');
    toast.success('Mark saved');
    setTimeout(() => setSaveStatus('saved'), 400);
    if (qIdx < questions.length - 1) setQIdx((p) => p + 1);
  }

  const qsRef = useRef(questions);
  qsRef.current = questions;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
    if (ctrl && e.key === 'Enter') { e.preventDefault(); saveAndAdvance(); }
    else if (ctrl && e.key === 'ArrowLeft' && !isInput) { e.preventDefault(); setQIdx((p) => Math.max(0, p - 1)); }
    else if (ctrl && e.key === 'ArrowRight' && !isInput) { e.preventDefault(); setQIdx((p) => Math.min(qsRef.current.length - 1, p + 1)); }
    else if (ctrl && (e.key === 's' || e.key === 'S')) { e.preventDefault(); toast.success('All marks saved'); setSaveStatus('saved'); }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function renderNav() {
    return (
      <div className="lg:w-64 border-r border-border overflow-y-auto max-h-[calc(100vh-16rem)] lg:max-h-[calc(100vh-18rem)] shrink-0">
        <div className="p-3 space-y-1">
          {questions.map((q, i) => {
            const qMark = getMark(marks, correction, q.id);
            const graded = qMark > 0;
            const active = i === qIdx;
            return (
              <button key={q.id} type="button" onClick={() => setQIdx(i)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${active ? 'bg-primary/10 text-primary font-medium ring-1 ring-primary/20' : 'hover:bg-accent/50 text-foreground/80'}`}
              >
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold shrink-0 ${active ? 'bg-primary text-primary-foreground' : graded ? 'bg-success-container text-on-success-container' : 'bg-muted text-muted-foreground'}`}>
                  {graded ? <Icon name="check" size={14} /> : i + 1}
                </span>
                <span className="flex-1 truncate text-xs">
                  <Icon name={q.type === 'multiple_choice' ? 'radio_button_checked' : 'text_fields'} size={13} className="inline mr-1 -mt-0.5 text-muted-foreground/60" />
                  Q{i + 1}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 tabular-nums">{q.points}pt</Badge>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderAnswer() {
    if (!question) return null;
    const answer = studentAnswers[studentId]?.[question.id] ?? 'No answer submitted';
    const wrongSel = selectedWrong[studentId]?.[question.id];

    return (
      <div className="flex-1 p-4 lg:p-6 overflow-y-auto max-h-[calc(100vh-16rem)] lg:max-h-[calc(100vh-18rem)] min-w-0">
        <div className="max-w-3xl space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px]">Q{qIdx + 1}</Badge>
              <Badge variant={question.type === 'multiple_choice' ? 'info' : 'secondary'} className="text-[10px]">
                {question.type === 'multiple_choice' ? 'Multiple Choice' : 'Essay'} · {question.points} pts
              </Badge>
            </div>
            <h3 className="text-lg font-semibold leading-relaxed">{question.question}</h3>
          </div>
          <Separator />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Student Answer</p>
            {question.type === 'multiple_choice' ? (
              <div className="space-y-2">
                {question.options?.map((opt) => {
                  const correct = opt === question.correctAnswer;
                  const selected = opt === answer || opt === wrongSel;
                  return (
                    <div key={opt} className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${correct ? 'border-success bg-success/5' : selected ? 'border-error bg-error/5' : 'border-border bg-card'}`}>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${correct ? 'border-success' : selected ? 'border-error' : 'border-muted-foreground/30'}`}>
                        {(correct || selected) && <span className={`w-2 h-2 rounded-full ${correct ? 'bg-success' : 'bg-error'}`} />}
                      </span>
                      <span className="flex-1 text-foreground">{opt}</span>
                      {correct && <Badge variant="success" className="text-[10px]">Correct</Badge>}
                      {selected && !correct && <Badge variant="destructive" className="text-[10px]">Selected</Badge>}
                      {correct && selected && <Icon name="check" size={16} className="text-success shrink-0" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-4 max-h-80 overflow-y-auto">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
              </div>
            )}
          </div>
          {question.type === 'multiple_choice' && (
            <div className="rounded-lg bg-success/5 border border-success/20 p-3">
              <p className="text-xs text-on-success-container"><span className="font-semibold">Correct answer: </span>{question.correctAnswer}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderTools() {
    if (!question) return null;
    return (
      <div className="lg:w-80 border-l border-border p-4 lg:p-6 space-y-5 shrink-0">
        <h4 className="text-sm font-semibold">Marking Tools</h4>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">Score (max {question.points})</label>
          <Input type="number" min={0} max={question.points}
            value={marks[question.id] ?? ''}
            placeholder={`0 – ${question.points}`}
            onChange={(e) => {
              const v = e.target.value;
              const n = Number(v);
              if (v !== '' && (isNaN(n) || n < 0)) return;
              setMarks((p) => ({ ...p, [question.id]: Math.min(n, question.points) }));
              markUnsaved();
            }}
            className="h-10 tabular-nums" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">Feedback</label>
          <Textarea value={feedback[question.id] ?? ''}
            onChange={(e) => { setFeedback((p) => ({ ...p, [question.id]: e.target.value })); markUnsaved(); }}
            placeholder="Write feedback for this question..." className="min-h-[120px] resize-y" />
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={saveAndAdvance} className="w-full gap-1" size="sm">
            <Icon name="save" size={15} /> Save &amp; Next
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1"
              onClick={() => setQIdx((p) => Math.max(0, p - 1))} disabled={qIdx === 0}>
              <Icon name="chevron_left" size={15} /> Prev
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1"
              onClick={() => setQIdx((p) => Math.min(questions.length - 1, p + 1))} disabled={qIdx === questions.length - 1}>
              Next <Icon name="chevron_right" size={15} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const saveIcon = saveStatus === 'saved' ? 'cloud_done' : saveStatus === 'saving' ? 'cloud_sync' : 'cloud_off';
  const saveLabel = saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved';
  const saveVariant = saveStatus === 'saved' ? 'success' : saveStatus === 'saving' ? 'warning' : 'outline';

  if (!exam) return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-5xl mx-auto">
      <SEOHead title="Exam Correction" description="Grade student exam submissions" />
      <Card><CardContent className="flex flex-col items-center gap-3 py-12">
        <Icon name="fact_check" size={48} className="text-muted-foreground/40" />
        <p className="text-lg font-medium">Exam not found</p>
        <p className="text-sm text-muted-foreground">The exam you&apos;re looking for doesn&apos;t exist.</p>
        <Button asChild><Link to="/teacher/exams"><Icon name="arrow_back" size={16} className="mr-1" /> Back to Exams</Link></Button>
      </CardContent></Card>
    </motion.div>
  );

  if (enrolled.length === 0) return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-5xl mx-auto">
      <SEOHead title={`Correcting: ${exam.title}`} description={`Grade submissions for ${exam.title}`} />
      <div className="flex flex-col items-center gap-3 py-12">
        <Icon name="group_off" size={48} className="text-muted-foreground/40" />
        <p className="text-lg font-medium">No students enrolled</p>
        <p className="text-sm text-muted-foreground">There are no students enrolled in {subject?.name ?? 'this subject'}.</p>
        <Button asChild><Link to="/teacher/exams"><Icon name="arrow_back" size={16} className="mr-1" /> Back to Exams</Link></Button>
      </div>
    </motion.div>
  );

  return (
    <>
      <SEOHead title={`Correcting: ${exam.title}`} description={`Grade submissions for ${exam.title}`} />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="min-h-screen flex flex-col">
        <motion.div variants={listItem} className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon-sm" asChild><Link to="/teacher/exams"><Icon name="arrow_back" size={20} /></Link></Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="min-w-0">
                <h1 className="text-sm font-semibold truncate">{exam.title}</h1>
                <p className="text-[11px] text-muted-foreground">{subject?.name ?? 'Unknown'} · {questions.length} questions · {totalMax} pts</p>
              </div>
            </div>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {enrolled.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
            </select>
          </div>
        </motion.div>

        <motion.div variants={listItem} className="flex-1 flex flex-col lg:flex-row">
          {renderNav()}
          {renderAnswer()}
          {renderTools()}
        </motion.div>

        <motion.div variants={listItem} className="border-t bg-card/80 backdrop-blur-sm px-4 lg:px-6 py-3">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-6">
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-semibold tabular-nums">{totalGiven}/{totalMax}</span>
              <span className="text-xs text-muted-foreground">({totalMax > 0 ? Math.round((totalGiven / totalMax) * 100) : 0}%)</span>
              <Badge variant={saveVariant} className="text-[10px] gap-1"><Icon name={saveIcon} size={12} />{saveLabel}</Badge>
            </div>
            <div className="flex-1 w-full lg:w-auto">
              <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Overall Feedback</label>
              <Textarea value={overallFb} onChange={(e) => { setOverallFb(e.target.value); markUnsaved(); }}
                placeholder="Write overall feedback for this student..." className="min-h-[48px] h-10 resize-none text-sm" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="default" size="sm" onClick={() => {
                if (!student) return toast.error('No student selected');
                toast.success(`Published grades for ${student.displayName} — ${totalGiven}/${totalMax}`);
              }} className="gap-1"><Icon name="send" size={15} /> Publish</Button>
              <Button variant="outline" size="sm" onClick={() => toast.success(`Published grades for ${enrolled.length} students`)} className="gap-1"><Icon name="publish" size={15} /> All</Button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={listItem} className="border-t bg-muted/30 px-4 lg:px-6 py-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[11px] text-muted-foreground font-medium">Shortcuts:</span>
            {shortcuts.map((s) => (
              <kbd key={s.k} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="inline-flex rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] shadow-sm">{s.k}</span>
                <span>{s.a}</span>
              </kbd>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
