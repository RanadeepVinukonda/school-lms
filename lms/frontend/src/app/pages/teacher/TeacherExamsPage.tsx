import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { cardStackReveal } from '@/lib/motion';
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
  totalPoints: number;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showResults: boolean;
  releasedAt: string | null;
  status: string;
  createdAt: string;
  attemptCount?: number;
}

const QUESTION_MODELS = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'matching', label: 'Matching' },
] as const;

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
                exam.releasedAt ? 'bg-success-container' : 'bg-secondary-container'
              }`}
            >
              <Icon
                name="fact_check"
                size={20}
                className={exam.releasedAt ? 'text-on-success-container' : 'text-on-secondary-container'}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold truncate">{exam.title}</p>
                <Badge
                  variant={exam.releasedAt ? 'success' : 'secondary'}
                  className="text-[10px] flex-shrink-0 capitalize"
                >
                  {exam.releasedAt ? _t('Released') : _t('Draft')}
                </Badge>
              </div>
              <p className="text-label-xs text-muted-foreground line-clamp-1">{exam.description}</p>
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
                <span>{formatDate(exam.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!exam.releasedAt && (
                <Button size="sm" onClick={onRelease} loading={isReleasing} className="gap-1">
                  <Icon name="publish" size={15} />
                  {_t('Release')}
                </Button>
              )}
              {exam.releasedAt && (
                <div className="flex items-center gap-2">
                  <span className="text-label-xs text-muted-foreground">{_t('Grades')}</span>
                  <Switch
                    checked={exam.showResults}
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

export default function TeacherExamsPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const teacherId = user?.id ?? '';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('create');

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

  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);

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

  const { data: allTeacherExams, isLoading: allExamsLoading, refetch: refetchAllExams } = useQuery({
    queryKey: ['exams-v2-teacher', teacherId],
    queryFn: () => api.get('/exams-v2/my').then((r) => r.data.data),
    enabled: !!teacherId,
  });

  const teacherExams: ExamV2[] = allTeacherExams ?? [];

  const toCorrect = useMemo(() => {
    return teacherExams.filter((e) => e.releasedAt && (e.attemptCount ?? 0) > 0);
  }, [teacherExams]);

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      try {
        const res = await api.post('/exams-v2', body);
        return res.data.data;
      } catch (err: unknown) {
        const axErr = err as { response?: { data?: { error?: unknown }; status?: number }; message?: string };
        console.log('RAW_CREATE_ERR', 'status:', axErr?.response?.status, 'body:', JSON.stringify(axErr?.response?.data?.error).substring(0, 500), 'msg:', axErr?.message);
        throw err;
      }
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
      setReviewQuestions([]);
      queryClient.invalidateQueries({ queryKey: ['exams-v2-teacher', teacherId] });
    },
    onError: (err: unknown) => {
      console.log('CREATE_ERR', err);
      const e = err as Record<string, unknown>;
      let message = (e?.message as string) || _('Failed to create exam');
      const raw = JSON.stringify(e).substring(0, 300);
      toast.error(message + ' | raw=' + raw);
    },
  });

  const generatePreviewMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post('/exams-v2', body);
      return res.data.data;
    },
    onSuccess: (data) => {
      if (data.questions?.length) {
        setReviewQuestions(data.questions);
        toast.success(data.questions.length + ' ' + _('questions') + ' ' + _('loaded'));
      } else {
        toast.error(_('No questions found for this chapter'));
      }
    },
    onError: (err: unknown) => {
      console.log('PREVIEW_ERR', err);
      const e = err as Record<string, unknown>;
      let message = (e?.message as string) || _('Failed to generate preview');
      const raw = JSON.stringify(e).substring(0, 300);
      toast.error(message + ' | raw=' + raw);
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (examId: string) => {
      await api.post(`/exams-v2/${examId}/release`);
    },
    onSuccess: () => {
      toast.success(_('Exam released to students'));
      queryClient.invalidateQueries({ queryKey: ['exams-v2-teacher', teacherId] });
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
      queryClient.invalidateQueries({ queryKey: ['exams-v2-teacher', teacherId] });
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
    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description || '',
      classId: selectedClassId,
      subjectId: selectedAssignment?.subjectId || '',
      textbookId: selectedTextbookId,
      chapterId: selectedChapterId,
      teacherId,
      timeLimitMinutes: Number(timeLimitMinutes),
      selectedModels: [...selectedModels],
      questionCountPerConcept: Number(questionCountPerConcept),
      passingScore: Number(passingScore),
      maxAttempts: Number(maxAttempts),
      shuffleQuestions: true,
      showResults: true,
    };
    if (reviewQuestions.length > 0) {
      (body as any).questions = reviewQuestions;
    }
    createMutation.mutate(body);
  }

  function handleGeneratePreview() {
    if (!selectedClassId || !selectedTextbookId || !selectedChapterId) return;
    generatePreviewMutation.mutate({
      title: title.trim() || 'Preview',
      description: description || '',
      classId: selectedClassId,
      subjectId: selectedAssignment?.subjectId || '',
      textbookId: selectedTextbookId,
      chapterId: selectedChapterId,
      teacherId,
      timeLimitMinutes: Number(timeLimitMinutes),
      selectedModels: [...selectedModels],
      questionCountPerConcept: Number(questionCountPerConcept),
      preview: true,
    });
  }

  const renderCreateForm = () => (
    <div className="space-y-16">
      {/* Teacher Assignment */}
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
                  setReviewQuestions([]);
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">{_('Select a class...')}</option>
                {[...new Map(assignmentList.map((a) => [a.classId, a]))].map(([_, a]) => (
                  <option key={a.classId} value={a.classId}>{a.className}</option>
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
                      setReviewQuestions([]);

                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {classAssignments.map((a) => (
                      <option key={a.subjectId} value={a.subjectId}>{a.subjectName}</option>
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
                  setReviewQuestions([]);
                  setIsPreviewMode(false);
                }}
                disabled={!selectedAssignment || textbooksLoading}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {textbooksLoading ? _('Loading textbooks...') : _('Select a textbook...')}
                </option>
                {textbooks.map((t: Textbook) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
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
                onChange={(e) => {
                  setSelectedChapterId(e.target.value);
                  setReviewQuestions([]);
                  setIsPreviewMode(false);
                }}
                disabled={!selectedTextbookId || chaptersLoading}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {chaptersLoading ? _('Loading chapters...') : _('Select a chapter...')}
                </option>
                {chapters.map((ch: Chapter) => (
                  <option key={ch.id} value={ch.id}>{ch.title}</option>
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

      {/* Exam Details */}
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
                  type="number" min={1}
                  placeholder="60"
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="questions-per-concept">{_('Questions Per Concept')}</Label>
                <Input
                  id="questions-per-concept"
                  type="number" min={1}
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
                  type="number" min={0} max={100}
                  placeholder="50"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-attempts">{_('Max Attempts')}</Label>
                <Input
                  id="max-attempts"
                  type="number" min={1}
                  placeholder="1"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{_('Question Models')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                {QUESTION_MODELS.map((model) => (
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
                  </label>
                ))}
              </div>
              {selectedModels.length === 0 && (
                <p className="text-label-xs text-error">{_('Select at least one question model')}</p>
              )}
            </div>

            {/* Editable preview */}
            {reviewQuestions.length > 0 && (
              <div className="space-y-3 border rounded-lg p-3 bg-muted/10">
                <p className="text-sm font-medium text-primary flex items-center gap-1">
                  <Icon name="visibility" size={14} />
                  {_('All Questions')} — {reviewQuestions.length} {_('total')}
                </p>
                <p className="text-xs text-muted-foreground">{_('Edit any question below, then click Create Exam to save')}</p>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reviewQuestions.map((q: any, i: number) => (
                    <div key={q.id || i} className="border rounded-lg p-3 space-y-2 bg-background">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{q.type}</span>
                        <input
                          className="w-16 rounded border border-border bg-background text-on-surface px-1 py-0.5 text-xs text-center placeholder:text-muted-foreground/50"
                          value={q.points}
                          onChange={(e) => {
                            const updated = [...reviewQuestions];
                            updated[i] = { ...updated[i], points: Number(e.target.value) };
                            setReviewQuestions(updated);
                          }}
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground">{q.difficulty}</span>
                      </div>
                      <input
                        className="w-full rounded border border-border bg-background text-on-surface px-2 py-1 text-sm placeholder:text-muted-foreground/50"
                        value={q.text}
                        onChange={(e) => {
                          const updated = [...reviewQuestions];
                          updated[i] = { ...updated[i], text: e.target.value };
                          setReviewQuestions(updated);
                        }}
                        placeholder={_('Question text')}
                      />
                      {q.options && (
                        <div className="space-y-1 pl-2 border-l-2 border-border">
                          {q.options.map((opt: string, oi: number) => (
                            <div key={oi} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-4">{String.fromCharCode(65 + oi)}.</span>
                              <input
                                className="flex-1 rounded border border-border bg-background text-on-surface px-2 py-1 text-sm placeholder:text-muted-foreground/50"
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...reviewQuestions];
                                  const newOpts = [...updated[i].options];
                                  newOpts[oi] = e.target.value;
                                  updated[i] = { ...updated[i], options: newOpts };
                                  setReviewQuestions(updated);
                                }}
                                placeholder={_('Option')}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{_('Answer:')}</span>
                        <input
                          className="flex-1 rounded border border-border bg-background text-on-surface px-2 py-1 text-sm font-medium placeholder:text-muted-foreground/50"
                          value={q.correctAnswer}
                          onChange={(e) => {
                            const updated = [...reviewQuestions];
                            updated[i] = { ...updated[i], correctAnswer: e.target.value };
                            setReviewQuestions(updated);
                          }}
                          placeholder={_('Correct answer')}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedChapterId && reviewQuestions.length === 0 && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleGeneratePreview}
                disabled={generatePreviewMutation.isPending || !selectedChapterId}
              >
                {generatePreviewMutation.isPending ? (
                  <>{_('Generating...')}</>
                ) : (
                  <><Icon name="visibility" size={16} /> {_('Generate Preview')} ({questionCountPerConcept} {_('per concept')})</>
                )}
              </Button>
            )}

            {/* Create Button */}
            <div className="flex gap-2">
              {reviewQuestions.length > 0 && (
                <Button
                  variant="secondary"
                  className="flex-1 gap-2"
                  onClick={() => { setReviewQuestions([]); }}
                >
                  <Icon name="close" size={16} />
                  {_('Clear Preview')}
                </Button>
              )}
              <Button
                className={reviewQuestions.length > 0 ? 'flex-1 gap-2' : 'w-full gap-2'}
                size="lg"
                onClick={handleCreate}
                disabled={!canCreate()}
                loading={createMutation.isPending}
              >
                <Icon name="add" size={18} />
                {_('Create Exam')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  const renderAllExams = () => (
    <DataFetchWrapper
      data={teacherExams}
      isLoading={allExamsLoading}
      error={null}
      onRetry={() => refetchAllExams()}
      loadingType="list"
      emptyMessage={_('No exams created yet')}
      emptyIcon={<Icon name="fact_check" size={40} className="text-muted-foreground/50" />}
    >
      {() => (
        <div className="space-y-3">
          {teacherExams.map((exam) => (
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
  );

  const renderToCorrect = () => (
    <DataFetchWrapper
      data={toCorrect}
      isLoading={allExamsLoading}
      error={null}
      onRetry={() => refetchAllExams()}
      loadingType="list"
      emptyMessage={_('No exams needing correction')}
      emptyIcon={<Icon name="fact_check" size={40} className="text-muted-foreground/50" />}
    >
      {() => (
        <div className="space-y-3">
          {toCorrect.map((exam) => (
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
  );

  return (
    <>
      <SEOHead title={_('Exams')} description={_('Create and manage exams')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <h1 className="text-headline-sm">{_('Exams')}</h1>
          <p className="text-body-md text-muted-foreground">
            {_('Create chapter-level exams from all concepts in a chapter')}
          </p>
        </motion.div>

        {assignmentsLoading ? (
          <div className="space-y-16">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : assignmentsError ? (
          <Card className="border-border/60">
            <CardContent className="p-5 text-center space-y-4">
              <Icon name="error" size={48} className="text-destructive mx-auto" />
              <p className="text-muted-foreground">{_('Failed to load your class assignments.')}</p>
              <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['teacher-assignments', user?.id] })}>
                <Icon name="refresh" size={16} className="mr-1" />
                {_('Retry')}
              </Button>
            </CardContent>
          </Card>
        ) : assignmentList.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="p-5 text-center space-y-4">
              <Icon name="school" size={48} className="text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                {_('You haven\'t been assigned to any class yet. Contact your administrator to get started.')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full overflow-x-auto inline-flex">
              <TabsTrigger value="create" className="gap-2">
                <Icon name="add" size={16} />
                {_('Create Exam')}
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                <Icon name="fact_check" size={16} />
                {_('All Exams')}
                {teacherExams.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-label-xs px-1.5">{teacherExams.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="correct" className="gap-2">
                <Icon name="rate_review" size={16} />
                {_('To Correct')}
                {toCorrect.length > 0 && (
                  <Badge variant="warning" className="ml-1 text-label-xs px-1.5">{toCorrect.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-6">
              {renderCreateForm()}
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              {renderAllExams()}
            </TabsContent>

            <TabsContent value="correct" className="mt-6">
              {renderToCorrect()}
            </TabsContent>
          </Tabs>
        )}
      </motion.div>
    </>
  );
}
