import { useState } from 'react';
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

const QUESTION_MODELS = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'matching', label: 'Matching' },
] as const;

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
}: {
  exam: ExamV2;
  onRelease: () => void;
  onToggleGrades: () => void;
  isReleasing: boolean;
  isTogglingGrades: boolean;
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
                  {exam.isReleased ? 'Released' : 'Draft'}
                </Badge>
              </div>
              <p className="text-label-xs text-muted-foreground line-clamp-1">
                {exam.description}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-label-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Icon name="schedule" size={14} />
                  {exam.timeLimitMinutes} min
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="percent" size={14} />
                  Pass: {exam.passingScore}%
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="people" size={14} />
                  {exam.attemptCount ?? 0} attempt{(exam.attemptCount ?? 0) !== 1 ? 's' : ''}
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
                  Release
                </Button>
              )}
              {exam.isReleased && (
                <div className="flex items-center gap-2">
                  <span className="text-label-xs text-muted-foreground">Grades</span>
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
  const user = useAuthStore((s) => s.user);
  const teacherId = user?.id ?? '';
  const queryClient = useQueryClient();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTextbookId, setSelectedTextbookId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('60');
  const [selectedModels, setSelectedModels] = useState<string[]>(['multiple_choice', 'true_false']);
  const [questionCountPerConcept, setQuestionCountPerConcept] = useState('5');
  const [passingScore, setPassingScore] = useState('50');
  const [maxAttempts, setMaxAttempts] = useState('1');

  const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const assignmentList: TeacherAssignment[] = assignments ?? [];
  const selectedAssignment = assignmentList.find((a) => a.classId === selectedClassId);

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
      toast.success('Exam created successfully');
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
        : 'Failed to create exam';
      toast.error(message);
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (examId: string) => {
      await api.post(`/exams-v2/${examId}/release`);
    },
    onSuccess: () => {
      toast.success('Exam released to students');
      queryClient.invalidateQueries({ queryKey: ['exams-v2-class', selectedClassId] });
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to release exam';
      toast.error(message);
    },
  });

  const toggleGradesMutation = useMutation({
    mutationFn: async (examId: string) => {
      await api.put(`/exams-v2/${examId}/grades`);
    },
    onSuccess: () => {
      toast.success('Grades visibility updated');
      queryClient.invalidateQueries({ queryKey: ['exams-v2-class', selectedClassId] });
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to update grades visibility';
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
        <SEOHead title="Create Exam" description="Create chapter-level exams for your class" />
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
        <SEOHead title="Create Exam" description="Create chapter-level exams for your class" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 max-w-4xl mx-auto pb-32 space-y-16">
          <motion.div variants={cardStackReveal} custom={0}>
            <h1 className="text-headline-sm">Create Exam</h1>
            <p className="text-body-md text-muted-foreground">Something went wrong loading your assignments</p>
          </motion.div>
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardContent className="p-5 text-center space-y-4">
                <Icon name="error" size={48} className="text-destructive mx-auto" />
                <p className="text-muted-foreground">Failed to load your class assignments. Please try again.</p>
                <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['teacher-assignments', user?.id] })}>
                  <Icon name="refresh" size={16} className="mr-1" />
                  Retry
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
            <h1 className="text-headline-sm">Create Exam</h1>
            <p className="text-body-md text-muted-foreground">Create chapter-level exams for your students</p>
          </motion.div>
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardContent className="p-5 text-center space-y-4">
                <Icon name="school" size={48} className="text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  You haven't been assigned to any class yet. Contact your administrator to get started.
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
      <SEOHead title="Create Exam" description="Create chapter-level exams for your class" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-4xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <h1 className="text-headline-sm">Create Exam</h1>
          <p className="text-body-md text-muted-foreground">
            Create chapter-level exams from all concepts in a chapter
          </p>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={0}>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-title-sm flex items-center gap-2">
                <Icon name="class" size={18} className="text-primary" />
                Teacher Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <Label htmlFor="class-select">Class</Label>
                <select
                  id="class-select"
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedTextbookId('');
                    setSelectedChapterId('');
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select a class...</option>
                  {assignmentList.map((a) => (
                    <option key={a.classId} value={a.classId}>
                      {a.className}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAssignment && (
                <div>
                  <Label>Subject</Label>
                  <div className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground mt-1.5">
                    {selectedAssignment.subjectName}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="textbook-select">Textbook</Label>
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
                    {textbooksLoading ? 'Loading textbooks...' : 'Select a textbook...'}
                  </option>
                  {textbooks.map((t: Textbook) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                {textbooks.length === 0 && selectedAssignment && !textbooksLoading && (
                  <p className="text-label-xs text-muted-foreground mt-1">
                    No textbooks available for this subject
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="chapter-select">Chapter</Label>
                <select
                  id="chapter-select"
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  disabled={!selectedTextbookId || chaptersLoading}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {chaptersLoading ? 'Loading chapters...' : 'Select a chapter...'}
                  </option>
                  {chapters.map((ch: Chapter) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}
                    </option>
                  ))}
                </select>
                {chapters.length === 0 && selectedTextbookId && !chaptersLoading && (
                  <p className="text-label-xs text-muted-foreground mt-1">
                    No chapters found in this textbook
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
                Exam Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="exam-title">Title</Label>
                <Input
                  id="exam-title"
                  placeholder="e.g. Chapter 1: Introduction to Algebra"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exam-description">Description</Label>
                <Textarea
                  id="exam-description"
                  placeholder="Brief description of the exam"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="time-limit">Time Limit (minutes)</Label>
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
                  <Label htmlFor="questions-per-concept">Questions Per Concept</Label>
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
                  <Label htmlFor="passing-score">Passing Score (%)</Label>
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
                  <Label htmlFor="max-attempts">Max Attempts</Label>
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
                <Label>Question Models</Label>
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
                  <p className="text-label-xs text-error">Select at least one question model</p>
                )}
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleCreate}
                disabled={!canCreate()}
                loading={createMutation.isPending}
              >
                <Icon name="add" size={18} />
                Create Exam
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {selectedClassId && (
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-title-sm flex items-center gap-2">
                  <Icon name="fact_check" size={18} className="text-primary" />
                  Existing Exams
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <DataFetchWrapper
                  data={examsList}
                  isLoading={examsLoading}
                  error={examsError ? (examsErrorObj as Error) ?? new Error('Failed to load exams') : null}
                  onRetry={() => refetchExams()}
                  loadingType="list"
                  emptyMessage="No exams created for this class yet"
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
