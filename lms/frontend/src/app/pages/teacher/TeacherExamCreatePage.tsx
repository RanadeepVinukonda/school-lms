import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { formatDate } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { getTextbooksBySubject, getChaptersForTextbook } from '@/services/textbookService';
import type { Textbook, Chapter } from '@/types/textbook';

interface TeacherAssignment {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
}

interface ExamV2 {
  id: string;
  title: string;
  description: string;
  classId: string;
  textbookId: string;
  chapterId: string;
  teacherId: string;
  timeLimitMinutes: number;
  selectedModels: string[];
  questionCountPerConcept: number;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showResults: boolean;
  isReleased: boolean;
  gradesReleased: boolean;
  status: string;
  createdAt: string;
  attemptCount?: number;
}

function ExamCard({
  exam,
  onRelease,
  onToggleGrades,
  isReleasing,
  isTogglingGrades,
  _t,
}: {
  exam: ExamV2;
  onRelease: () => void;
  onToggleGrades: () => void;
  isReleasing: boolean;
  isTogglingGrades: boolean;
  _t: (s: string) => string;
}) {
  return (
    <motion.div variants={cardStackReveal} custom={0}>
      <Card className="border-border/60 hover:shadow-md transition-all duration-200">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                exam.isReleased
                  ? 'bg-success-container'
                  : 'bg-secondary-container'
              }`}
            >
              <Icon
                name="fact_check"
                size={20}
                className={
                  exam.isReleased
                    ? 'text-on-success-container'
                    : 'text-on-secondary-container'
                }
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold truncate">{exam.title}</p>
                <Badge
                  variant={exam.isReleased ? 'success' : 'secondary'}
                  className="text-[10px] flex-shrink-0 capitalize"
                >
                  {exam.isReleased ? _t('Released') : _t('Draft')}
                </Badge>
              </div>
              <p className="text-label-xs text-muted-foreground line-clamp-1">
                {exam.description}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-label-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Icon name="schedule" size={14} />
                  {exam.timeLimitMinutes} {_t('min')}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="percent" size={14} />
                  {_t('Pass')}: {exam.passingScore}%
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="people" size={14} />
                  {exam.attemptCount ?? 0} {_t('attempt')}{(exam.attemptCount ?? 0) !== 1 ? _t('s') : ''}
                </span>
                <span className="text-muted-foreground">
                  {formatDate(exam.createdAt)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!exam.isReleased && (
                <Button
                  size="sm"
                  onClick={onRelease}
                  loading={isReleasing}
                  className="gap-1"
                >
                  <Icon name="publish" size={15} />
                  {_t('Release')}
                </Button>
              )}
              {exam.isReleased && (
                <div className="flex items-center gap-2">
                  <span className="text-label-xs text-muted-foreground">{_t('Grades')}</span>
                  <Switch
                    checked={exam.gradesReleased}
                    onCheckedChange={onToggleGrades}
                    disabled={isTogglingGrades}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function TeacherExamCreatePage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const teacherId = user?.id ?? '';
  const queryClient = useQueryClient();
  const QUESTION_MODELS = [
    { value: 'multiple_choice', label: _('Multiple Choice') },
    { value: 'true_false', label: _('True / False') },
    { value: 'short_answer', label: _('Short Answer') },
    { value: 'fill_blank', label: _('Fill in the Blank') },
    { value: 'matching', label: _('Matching') },
  ] as const;

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTextbookId, setSelectedTextbookId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('60');
  const [selectedModels, setSelectedModels] = useState<string[]>(['multiple_choice', 'true_false']);
  const [questionCountPerConcept, setQuestionCountPerConcept] = useState('5');
  const [passingScore, setPassingScore] = useState('50');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [distribution, setDistribution] = useState<Record<string, Record<string, number>>>({
    easy: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    medium: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    hard: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    hots: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
  });
  const [generatedPaper, setGeneratedPaper] = useState<any[] | null>(null);

  const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const assignmentList: TeacherAssignment[] = assignments ?? [];
  const classAssignments = assignmentList.filter((a) => a.classId === selectedClassId);
  const effectiveSubjectId = selectedSubjectId || classAssignments[0]?.subjectId || '';
  const selectedAssignment = classAssignments.find((a) => a.subjectId === effectiveSubjectId);

  useEffect(() => {
    if (classAssignments.length > 0) {
      setSelectedSubjectId(classAssignments[0].subjectId);
    } else {
      setSelectedSubjectId('');
    }
  }, [selectedClassId, classAssignments]);

  const { data: textbooks = [], isLoading: textbooksLoading } = useQuery({
    queryKey: ['textbooks-by-subject', selectedAssignment?.subjectId],
    queryFn: () => getTextbooksBySubject(selectedAssignment!.subjectId),
    enabled: !!selectedAssignment?.subjectId,
  });

  const { data: chapters = [], isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters-for-textbook', selectedTextbookId],
    queryFn: () => getChaptersForTextbook(selectedTextbookId),
    enabled: !!selectedTextbookId,
  });

  const { data: breakdown } = useQuery({
    queryKey: ['question-breakdown', selectedTextbookId, selectedChapterId],
    queryFn: () => api.get(`/exams-v2/breakdown/${selectedTextbookId}/${selectedChapterId}`).then((r) => r.data.data),
    enabled: !!selectedTextbookId && !!selectedChapterId,
  });

  const typeCountMap: Record<string, number> = {};
  const diffCountMap: Record<string, number> = {};
  if (breakdown) {
    for (const t of breakdown.types || []) typeCountMap[t.type] = t.count;
    for (const d of breakdown.difficulties || []) diffCountMap[d.difficulty] = d.count;
  }

  const { data: classExams, isLoading: examsLoading, isError: examsError, error: examsErrorObj, refetch: refetchExams } = useQuery({
    queryKey: ['exams-v2-class', selectedClassId],
    queryFn: () => api.get(`/exams-v2/class/${selectedClassId}`).then((r) => r.data.data),
    enabled: !!selectedClassId,
  });

  const examsList: ExamV2[] = classExams ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title,
        description,
        classId: selectedClassId,
        textbookId: selectedTextbookId,
        chapterId: selectedChapterId,
        teacherId,
        timeLimitMinutes: Number(timeLimitMinutes),
        selectedModels,
        questionCountPerConcept: Number(questionCountPerConcept),
        passingScore: Number(passingScore),
        maxAttempts: Number(maxAttempts),
        shuffleQuestions: true,
        showResults: true,
      };
      const res = await api.post('/exams-v2', body);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success(_('Exam created successfully'));
      setTitle('');
      setDescription('');
      setTimeLimitMinutes('60');
      setSelectedModels(['multiple_choice', 'true_false']);
      setQuestionCountPerConcept('5');
      setPassingScore('50');
      setMaxAttempts('1');
      queryClient.invalidateQueries({ queryKey: ['exams-v2-class', selectedClassId] });
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : _('Failed to create exam');
      toast.error(message);
    },
  });

  const generatePaperMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/exams-v2/generate-paper', {
        textbookId: selectedTextbookId,
        chapterId: selectedChapterId,
        classId: selectedClassId,
        distribution,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Paper generated: ${data.questionCount} questions`);
      setGeneratedPaper(data.questions);
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to generate paper';
      toast.error(msg);
    },
  });

  const createFromPaperMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title,
        description,
        classId: selectedClassId,
        textbookId: selectedTextbookId,
        chapterId: selectedChapterId,
        teacherId,
        timeLimitMinutes: Number(timeLimitMinutes),
        selectedModels,
        questionCountPerConcept: (generatedPaper || []).length,
        passingScore: Number(passingScore),
        maxAttempts: Number(maxAttempts),
        shuffleQuestions: true,
        showResults: true,
        questions: generatedPaper,
      };
      const res = await api.post('/exams-v2', body);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success(_('Exam created from paper'));
      setTitle('');
      setGeneratedPaper(null);
      queryClient.invalidateQueries({ queryKey: ['exams-v2-class', selectedClassId] });
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to create exam';
      toast.error(msg);
    },
  });

  const setDist = (difficulty: string, type: string, value: number) => {
    setDistribution((prev) => ({
      ...prev,
      [difficulty]: { ...prev[difficulty], [type]: Math.max(0, value || 0) },
    }));
  };

  const distributionTotal = Object.values(distribution).reduce(
    (sum, types) => sum + Object.values(types).reduce((s, v) => s + v, 0), 0,
  );

  const releaseMutation = useMutation({
    mutationFn: async (examId: string) => {
      await api.post(`/exams-v2/${examId}/release`);
    },
    onSuccess: () => {
      toast.success(_('Exam released to students'));
      queryClient.invalidateQueries({ queryKey: ['exams-v2-class', selectedClassId] });
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : _('Failed to release exam');
      toast.error(message);
    },
  });

  const toggleGradesMutation = useMutation({
    mutationFn: async (examId: string) => {
      await api.put(`/exams-v2/${examId}/grades`);
    },
    onSuccess: () => {
      toast.success(_('Grades visibility updated'));
      queryClient.invalidateQueries({ queryKey: ['exams-v2-class', selectedClassId] });
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : _('Failed to update grades visibility');
      toast.error(message);
    },
  });

  function handleToggleModel(model: string) {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model],
    );
  }

  function canCreate(): boolean {
    return (
      !!title.trim() &&
      !!selectedClassId &&
      !!selectedTextbookId &&
      !!selectedChapterId &&
      selectedModels.length > 0 &&
      Number(timeLimitMinutes) > 0 &&
      Number(questionCountPerConcept) > 0 &&
      Number(passingScore) >= 0 &&
      Number(maxAttempts) > 0 &&
      !createMutation.isPending
    );
  }

  function handleCreate() {
    if (!canCreate()) return;
    createMutation.mutate();
  }

  if (assignmentsLoading) {
    return (
      <>
        <SEOHead title={_('Create Exam')} description={_('Create chapter-level exams for your class')} />
        <div className="p-6 max-w-4xl mx-auto pb-32 space-y-16">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
          <Skeleton className="h-40 w-full mt-6" />
          <Skeleton className="h-64 w-full mt-4" />
        </div>
      </>
    );
  }

  if (assignmentsError) {
    return (
      <>
        <SEOHead title={_('Create Exam')} description={_('Create chapter-level exams for your class')} />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 max-w-4xl mx-auto pb-32 space-y-16">
          <motion.div variants={cardStackReveal} custom={0}>
            <h1 className="text-headline-sm">{_('Create Exam')}</h1>
            <p className="text-body-md text-muted-foreground">{_('Something went wrong loading your assignments')}</p>
          </motion.div>
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardContent className="p-5 text-center space-y-4">
                <Icon name="error" size={48} className="text-destructive mx-auto" />
                <p className="text-muted-foreground">{_('Failed to load your class assignments. Please try again.')}</p>
                <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['teacher-assignments', user?.id] })}>
                  <Icon name="refresh" size={16} className="mr-1" />
                  {_('Retry')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </>
    );
  }

  if (!assignmentsLoading && assignmentList.length === 0) {
    return (
      <>
        <SEOHead title="Create Exam" description="Create chapter-level exams for your class" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 max-w-4xl mx-auto pb-32 space-y-16">
          <motion.div variants={cardStackReveal} custom={0}>
            <h1 className="text-headline-sm">{_('Create Exam')}</h1>
            <p className="text-body-md text-muted-foreground">{_('Create chapter-level exams for your students')}</p>
          </motion.div>
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardContent className="p-5 text-center space-y-4">
                <Icon name="school" size={48} className="text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  {_('You haven\'t been assigned to any class yet. Contact your administrator to get started.')}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <SEOHead title={_('Create Exam')} description={_('Create chapter-level exams for your class')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-4xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <h1 className="text-headline-sm">{_('Create Exam')}</h1>
          <p className="text-body-md text-muted-foreground">
            {_('Create chapter-level exams from all concepts in a chapter')}
          </p>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={0}>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-title-sm flex items-center gap-2">
                <Icon name="class" size={18} className="text-primary" />
                {_('Teacher Assignment')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <Label htmlFor="class-select">{_('Class')}</Label>
                <select
                  id="class-select"
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSubjectId('');
                    setSelectedTextbookId('');
                    setSelectedChapterId('');
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">{_('Select a class...')}</option>
                  {[...new Map(assignmentList.map((a) => [a.classId, a]))].map(([_, a]) => (
                    <option key={a.classId} value={a.classId}>
                      {a.className}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAssignment && (
                <div>
                  <Label htmlFor="subject-select">{_('Subject')}</Label>
                  {classAssignments.length > 1 ? (
                    <select
                      id="subject-select"
                      value={selectedSubjectId}
                      onChange={(e) => {
                        setSelectedSubjectId(e.target.value);
                        setSelectedTextbookId('');
                        setSelectedChapterId('');
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {classAssignments.map((a) => (
                        <option key={a.subjectId} value={a.subjectId}>
                          {a.subjectName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground mt-1.5">
                      {selectedAssignment.subjectName}
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="textbook-select">{_('Textbook')}</Label>
                <select
                  id="textbook-select"
                  value={selectedTextbookId}
                  onChange={(e) => {
                    setSelectedTextbookId(e.target.value);
                    setSelectedChapterId('');
                  }}
                  disabled={!selectedAssignment || textbooksLoading}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {textbooksLoading ? _('Loading textbooks...') : _('Select a textbook...')}
                  </option>
                  {textbooks.map((t: Textbook) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                {textbooks.length === 0 && selectedAssignment && !textbooksLoading && (
                  <p className="text-label-xs text-muted-foreground mt-1">
                    {_('No textbooks available for this subject')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="chapter-select">{_('Chapter')}</Label>
                <select
                  id="chapter-select"
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  disabled={!selectedTextbookId || chaptersLoading}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {chaptersLoading ? _('Loading chapters...') : _('Select a chapter...')}
                  </option>
                  {chapters.map((ch: Chapter) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}
                    </option>
                  ))}
                </select>
                {chapters.length === 0 && selectedTextbookId && !chaptersLoading && (
                  <p className="text-label-xs text-muted-foreground mt-1">
                    {_('No chapters found in this textbook')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={0}>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-title-sm flex items-center gap-2">
                <Icon name="edit_note" size={18} className="text-primary" />
                {_('Exam Details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="exam-title">{_('Title')}</Label>
                <Input
                  id="exam-title"
                  placeholder={_('e.g. Chapter 1: Introduction to Algebra')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exam-description">{_('Description')}</Label>
                <Textarea
                  id="exam-description"
                  placeholder={_('Brief description of the exam')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="time-limit">{_('Time Limit (minutes)')}</Label>
                  <Input
                    id="time-limit"
                    type="number"
                    min={1}
                    placeholder="60"
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="questions-per-concept">{_('Total Questions')}</Label>
                  <Input
                    id="questions-per-concept"
                    type="number"
                    min={1}
                    placeholder="5"
                    value={questionCountPerConcept}
                    onChange={(e) => setQuestionCountPerConcept(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="passing-score">{_('Passing Score (%)')}</Label>
                  <Input
                    id="passing-score"
                    type="number"
                    min={0}
                    max={100}
                    placeholder="50"
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max-attempts">{_('Max Attempts')}</Label>
                  <Input
                    id="max-attempts"
                    type="number"
                    min={1}
                    placeholder="1"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{_('Available Question Types')}</Label>
                {selectedChapterId && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(diffCountMap).map(([d, c]) => (
                      <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {d.charAt(0).toUpperCase() + d.slice(1)}: {c}
                      </span>
                    ))}
                    {breakdown?.hotsCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        HOTS: {breakdown.hotsCount}
                      </span>
                    )}
                    {breakdown?.total > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        Total: {breakdown.total}
                      </span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                  {QUESTION_MODELS.map((model) => {
                    const mappedType = model.value === 'multiple_choice' ? 'mcq' : model.value;
                    const available = typeCountMap[mappedType] || 0;
                    return (
                      <label
                        key={model.value}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                          selectedModels.includes(model.value)
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-primary hover:bg-accent'
                        }`}
                      >
                        <Checkbox
                          checked={selectedModels.includes(model.value)}
                          onCheckedChange={() => handleToggleModel(model.value)}
                        />
                        <span className="text-sm font-medium">{model.label}</span>
                        {selectedChapterId && (
                          <span className="ml-auto text-xs text-muted-foreground">{available > 0 ? `(${available})` : ''}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {selectedModels.length === 0 && (
                  <p className="text-label-xs text-error">{_('Select at least one question model')}</p>
                )}
              </div>

              {selectedChapterId && (
                <div className="border-t border-border/60 pt-4 mt-4">
                  <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Set how many questions per difficulty and type. System auto-selects matching questions.
                      </p>
                      <p className="text-xs font-semibold">Total: {distributionTotal} questions</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/60">
                            <th className="text-left py-2 pr-3">Difficulty</th>
                            {QUESTION_MODELS.map((m) => (
                              <th key={m.value} className="text-center px-2 py-2">{m.label}</th>
                            ))}
                            <th className="text-center px-2 py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard', 'hots'].map((diff) => (
                            <tr key={diff} className="border-b border-border/40">
                              <td className={`py-2 pr-3 font-medium capitalize ${diff === 'hots' ? 'text-purple-600' : ''}`}>{diff}</td>
                              {QUESTION_MODELS.map((m) => {
                                const mappedType = m.value === 'multiple_choice' ? 'mcq' : m.value;
                                const avail = typeCountMap[mappedType] || 0;
                                return (
                                  <td key={m.value} className="text-center px-1 py-1">
                                    <input
                                      type="number"
                                      min={0}
                                      max={avail}
                                      value={distribution[diff]?.[mappedType] ?? 0}
                                      onChange={(e) => setDist(diff, mappedType, parseInt(e.target.value) || 0)}
                                      className="w-14 text-center rounded border border-border bg-background px-1 py-1 text-xs"
                                    />
                                    <div className="text-[10px] text-muted-foreground">/ {avail}</div>
                                  </td>
                                );
                              })}
                              <td className="text-center px-2 py-2 font-semibold">
                                {Object.values(distribution[diff] || {}).reduce((s: number, v: any) => s + (v || 0), 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      {generatedPaper && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setGeneratedPaper(null)}
                        >
                          Clear Preview
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => generatePaperMutation.mutate()}
                        loading={generatePaperMutation.isPending}
                        disabled={distributionTotal === 0}
                        className="gap-1"
                      >
                        <Icon name="auto_awesome" size={14} />
                        {generatedPaper ? 'Regenerate' : 'Generate Paper'}
                      </Button>
                    </div>

                    {generatedPaper && (
                      <div className="border rounded-lg p-3 bg-background space-y-2 max-h-60 overflow-y-auto">
                        <p className="text-xs font-semibold text-primary">Preview ({generatedPaper.length} questions)</p>
                        {generatedPaper.map((q, i) => (
                          <div key={q.id || i} className="flex items-center gap-2 text-xs border-b border-border/40 pb-1">
                            <span className="text-muted-foreground">#{i + 1}</span>
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{q.type}</span>
                            <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{q.difficulty}</span>
                            <span className="truncate flex-1">{q.text}</span>
                            {q.hots && <span className="text-purple-500">HOTS</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {generatedPaper ? (
                <div className="flex gap-3">
                  <Button
                    className="flex-1 gap-2"
                    size="lg"
                    onClick={() => createFromPaperMutation.mutate()}
                    loading={createFromPaperMutation.isPending}
                  >
                    <Icon name="fact_check" size={18} />
                    Create Exam from Paper
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleCreate}
                    className="gap-2"
                  >
                    <Icon name="add" size={18} />
                    Simple Create
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleCreate}
                  disabled={!canCreate()}
                  loading={createMutation.isPending}
                >
                  <Icon name="add" size={18} />
                  {_('Create Exam')}
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {selectedClassId && (
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-title-sm flex items-center gap-2">
                  <Icon name="fact_check" size={18} className="text-primary" />
                  {_('Existing Exams')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <DataFetchWrapper
                  data={examsList}
                  isLoading={examsLoading}
                  error={examsError ? (examsErrorObj as Error) ?? new Error('Failed to load exams') : null}
                  onRetry={() => refetchExams()}
                  loadingType="list"
                  emptyMessage={_('No exams created for this class yet')}
                  emptyIcon={<Icon name="fact_check" size={40} className="text-muted-foreground/50" />}
                >
                  {() => (
                    <div className="space-y-3">
                      {examsList.map((exam) => (
                        <ExamCard
                          key={exam.id}
                          exam={exam}
                          onRelease={() => releaseMutation.mutate(exam.id)}
                          onToggleGrades={() => toggleGradesMutation.mutate(exam.id)}
                          isReleasing={releaseMutation.isPending && releaseMutation.variables === exam.id}
                          isTogglingGrades={toggleGradesMutation.isPending && toggleGradesMutation.variables === exam.id}
                          _t={_}
                        />
                      ))}
                    </div>
                  )}
                </DataFetchWrapper>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
